-- =====================================================
-- MIGRATION 020: Conversations, public profile privacy, app-safe RPCs
-- =====================================================

-- Conversations support chat before and after a project exists.
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS conversations_project_unique
  ON conversations(project_id)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_lead_context_unique
  ON conversations(client_id, professional_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_client_idx ON conversations(client_id);
CREATE INDEX IF NOT EXISTS conversations_professional_idx ON conversations(professional_id);
CREATE INDEX IF NOT EXISTS conversations_lead_idx ON conversations(lead_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations: participantes leen" ON conversations;
CREATE POLICY "conversations: participantes leen"
ON conversations FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM professional_profiles pp
    WHERE pp.id = conversations.professional_id
      AND pp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "conversations: participantes crean" ON conversations;
CREATE POLICY "conversations: participantes crean"
ON conversations FOR INSERT WITH CHECK (
  (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM professional_profiles pp
      WHERE pp.id = professional_id
        AND pp.user_id = auth.uid()
    )
  )
  AND (
    project_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = project_id
        AND p.client_id = client_id
        AND p.professional_id = professional_id
    )
  )
  AND (
    lead_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM leads l
      WHERE l.id = lead_id
        AND l.client_id = client_id
    )
  )
);

DROP POLICY IF EXISTS "conversations: participantes actualizan contexto" ON conversations;
CREATE POLICY "conversations: participantes actualizan contexto"
ON conversations FOR UPDATE USING (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM professional_profiles pp
    WHERE pp.id = conversations.professional_id
      AND pp.user_id = auth.uid()
  )
)
WITH CHECK (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM professional_profiles pp
    WHERE pp.id = professional_id
      AND pp.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;

-- Backfill one conversation for every existing project.
INSERT INTO conversations (client_id, professional_id, lead_id, project_id)
SELECT p.client_id, p.professional_id, p.lead_id, p.id
FROM projects p
ON CONFLICT DO NOTHING;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
  AND m.project_id = c.project_id;

ALTER TABLE messages
  ALTER COLUMN conversation_id SET NOT NULL,
  ALTER COLUMN project_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages(conversation_id, created_at);

-- Replace project-based message policies with conversation-based ones.
DROP POLICY IF EXISTS "messages: participantes leen mensajes del proyecto" ON messages;
DROP POLICY IF EXISTS "messages: participantes envian mensajes" ON messages;
DROP POLICY IF EXISTS "messages: destinatario marca como leido" ON messages;

CREATE POLICY "messages: participantes leen mensajes de conversacion"
ON messages FOR SELECT USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM conversations c
    LEFT JOIN professional_profiles pp ON pp.id = c.professional_id
    WHERE c.id = messages.conversation_id
      AND (c.client_id = auth.uid() OR pp.user_id = auth.uid())
  )
);

CREATE POLICY "messages: participantes envian mensajes en conversacion"
ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversations c
    LEFT JOIN professional_profiles pp ON pp.id = c.professional_id
    WHERE c.id = messages.conversation_id
      AND (messages.project_id IS NULL OR messages.project_id = c.project_id)
      AND (
        (c.client_id = auth.uid() AND recipient_id = pp.user_id)
        OR (pp.user_id = auth.uid() AND recipient_id = c.client_id)
      )
  )
);

CREATE POLICY "messages: destinatario marca como leido por conversacion"
ON messages FOR UPDATE USING (
  recipient_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversations c
    LEFT JOIN professional_profiles pp ON pp.id = c.professional_id
    WHERE c.id = messages.conversation_id
      AND (c.client_id = auth.uid() OR pp.user_id = auth.uid())
  )
)
WITH CHECK (
  recipient_id = auth.uid()
  AND is_read = TRUE
  AND read_at IS NOT NULL
);

CREATE OR REPLACE FUNCTION public.ensure_project_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO conversations (client_id, professional_id, lead_id, project_id)
  VALUES (NEW.client_id, NEW.professional_id, NEW.lead_id, NEW.id)
  ON CONFLICT DO NOTHING;

  UPDATE conversations
  SET project_id = NEW.id
  WHERE project_id IS NULL
    AND client_id = NEW.client_id
    AND professional_id = NEW.professional_id
    AND lead_id IS NOT DISTINCT FROM NEW.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_project_conversation ON projects;
CREATE TRIGGER trg_ensure_project_conversation
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION public.ensure_project_conversation();

CREATE OR REPLACE FUNCTION public.get_or_create_project_conversation(p_project_id UUID)
RETURNS SETOF conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_conversation conversations%ROWTYPE;
  v_professional_user_id UUID;
BEGIN
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado' USING HINT = 'project_not_found';
  END IF;

  SELECT user_id INTO v_professional_user_id
  FROM professional_profiles
  WHERE id = v_project.professional_id;

  IF v_project.client_id <> auth.uid()
     AND COALESCE(v_professional_user_id, '00000000-0000-0000-0000-000000000000'::UUID) <> auth.uid() THEN
    RAISE EXCEPTION 'No tienes acceso a esta conversacion' USING HINT = 'not_project_participant';
  END IF;

  INSERT INTO conversations (client_id, professional_id, lead_id, project_id)
  VALUES (v_project.client_id, v_project.professional_id, v_project.lead_id, v_project.id)
  ON CONFLICT DO NOTHING;

  UPDATE conversations
  SET project_id = v_project.id
  WHERE project_id IS NULL
    AND client_id = v_project.client_id
    AND professional_id = v_project.professional_id
    AND lead_id IS NOT DISTINCT FROM v_project.lead_id;

  SELECT * INTO v_conversation
  FROM conversations
  WHERE project_id = v_project.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo crear la conversacion' USING HINT = 'conversation_create_failed';
  END IF;

  RETURN NEXT v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_project_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_lead_conversation(
  p_lead_id UUID,
  p_professional_id UUID
)
RETURNS SETOF conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_professional_user_id UUID;
  v_conversation conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada' USING HINT = 'lead_not_found';
  END IF;

  SELECT user_id INTO v_professional_user_id
  FROM professional_profiles
  WHERE id = p_professional_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profesional no encontrado' USING HINT = 'professional_not_found';
  END IF;

  IF v_lead.client_id <> auth.uid() AND v_professional_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'No tienes acceso a esta conversacion' USING HINT = 'not_lead_participant';
  END IF;

  INSERT INTO conversations (client_id, professional_id, lead_id)
  VALUES (v_lead.client_id, p_professional_id, v_lead.id)
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_conversation
  FROM conversations
  WHERE client_id = v_lead.client_id
    AND professional_id = p_professional_id
    AND lead_id = v_lead.id
  LIMIT 1;

  RETURN NEXT v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_lead_conversation(UUID, UUID) TO authenticated;

-- Push payload now includes conversation context and keeps projectId for old clients.
CREATE OR REPLACE FUNCTION public.push_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_project_id UUID;
BEGIN
  SELECT full_name INTO v_sender_name FROM users WHERE id = NEW.sender_id;
  SELECT project_id INTO v_project_id FROM conversations WHERE id = NEW.conversation_id;

  PERFORM public.call_send_push(
    NEW.recipient_id,
    'new_message',
    v_sender_name,
    COALESCE(LEFT(NEW.content, 80), 'Nuevo mensaje'),
    jsonb_build_object(
      'conversationId', NEW.conversation_id,
      'projectId', COALESCE(NEW.project_id, v_project_id)
    )
  );
  RETURN NEW;
END;
$$;

-- Add typed notification relationship metadata.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_related_type_check'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_related_type_check
      CHECK (related_type IS NULL OR related_type IN ('quote', 'project', 'review', 'message', 'lead'));
  END IF;
END;
$$;

-- Public professional discovery view: no email, phone, NIF/CIF or Stripe fields.
DROP VIEW IF EXISTS professionals_with_categories;
CREATE VIEW professionals_with_categories AS
SELECT
  pp.id,
  pp.user_id,
  u.full_name,
  u.avatar_url,
  pp.company_name,
  pp.company_type,
  pp.description,
  pp.experience_years,
  pp.location_city,
  pp.location_region,
  pp.service_radius_km,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.response_time_hours,
  pp.accepts_new_leads,
  pp.is_active,
  pp.nif_cif_verified,
  pp.documents_verified,
  COALESCE(
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'icon', c.icon
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::JSONB
  ) AS categories
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
LEFT JOIN professional_categories pc ON pc.professional_id = pp.id
LEFT JOIN categories c ON c.id = pc.category_id
WHERE pp.is_active = TRUE
GROUP BY pp.id, u.full_name, u.avatar_url;

GRANT SELECT ON professionals_with_categories TO anon, authenticated;

-- Restrict the base profile table to owners/admins; public consumers must use the view above.
DROP POLICY IF EXISTS "professional_profiles: lectura publica" ON professional_profiles;
DROP POLICY IF EXISTS "professional_profiles: lectura propia o admin" ON professional_profiles;
CREATE POLICY "professional_profiles: lectura propia o admin"
ON professional_profiles FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND user_type = 'admin'
  )
);

-- App observability writes go through RPCs so end users still cannot write
-- directly to error_log/event_log.
CREATE OR REPLACE FUNCTION public.record_app_error(
  p_message TEXT,
  p_level TEXT DEFAULT 'ERROR',
  p_code TEXT DEFAULT NULL,
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING HINT = 'not_authenticated';
  END IF;

  INSERT INTO error_log (
    level, message, code, stack, context, correlation_id, source, user_id
  )
  VALUES (
    COALESCE(p_level, 'ERROR'),
    p_message,
    p_code,
    p_stack,
    p_context,
    p_correlation_id,
    'app',
    auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_app_event(
  p_event_name TEXT,
  p_properties JSONB DEFAULT '{}'::JSONB,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING HINT = 'not_authenticated';
  END IF;

  INSERT INTO event_log (
    event_name, properties, correlation_id, source, user_id
  )
  VALUES (
    p_event_name,
    COALESCE(p_properties, '{}'::JSONB),
    p_correlation_id,
    'app',
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_app_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_app_event(TEXT, JSONB, TEXT) TO authenticated;

-- Admin analytics must be read through checked RPCs, not direct schema reads.
REVOKE SELECT ON ALL TABLES IN SCHEMA analytics FROM authenticated;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_kpi_overview()
RETURNS SETOF analytics.kpi_overview
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo admins pueden leer analytics' USING HINT = 'admin_required';
  END IF;

  RETURN QUERY SELECT * FROM analytics.kpi_overview;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_conversion_funnel()
RETURNS SETOF analytics.conversion_funnel
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo admins pueden leer analytics' USING HINT = 'admin_required';
  END IF;

  RETURN QUERY SELECT * FROM analytics.conversion_funnel;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_daily_trend()
RETURNS SETOF analytics.daily_trend
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo admins pueden leer analytics' USING HINT = 'admin_required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics.daily_trend
  ORDER BY date DESC
  LIMIT 14;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kpi_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_conversion_funnel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_daily_trend() TO authenticated;
