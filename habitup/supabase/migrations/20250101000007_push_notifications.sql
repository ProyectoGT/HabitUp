-- =====================================================
-- MIGRATION 007: Push notifications
--
-- Dependencias:
--   - pg_net extension
--   - users.expo_push_token (creado en migración 001)
--   - Edge Function `send-push-notification` desplegada
--
-- ⚠️  app.settings.edge_push_url y app.settings.supabase_anon_key
--     deben configurarse manualmente en la base de datos:
--       ALTER DATABASE postgres SET app.settings.edge_push_url
--         TO 'https://<project>.functions.supabase.co/send-push-notification';
--       ALTER DATABASE postgres SET app.settings.supabase_anon_key
--         TO 'your-anon-key';
--     (requiere reload/supabase db reset para aplicar)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ═══════════════════════════════════════════════════
-- Helper function: send push via Edge Function
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.call_send_push(
  p_user_id  UUID,
  p_type     TEXT,
  p_title    TEXT,
  p_body     TEXT,
  p_data     JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_edge_url TEXT := current_setting('app.settings.edge_push_url', true);
  v_anon_key TEXT := current_setting('app.settings.supabase_anon_key', true);
BEGIN
  SELECT expo_push_token INTO v_token FROM users WHERE id = p_user_id;
  IF v_token IS NULL OR v_edge_url IS NULL OR v_anon_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     => v_edge_url,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    => jsonb_build_object(
      'token', v_token,
      'title', p_title,
      'body',  p_body,
      'data',  p_data || jsonb_build_object('type', p_type, 'userId', p_user_id)
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ═══════════════════════════════════════════════════
-- Push: new quote sent to client
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.push_on_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_client_id UUID; v_pro_name TEXT;
BEGIN
  SELECT l.client_id, u.full_name
    INTO v_client_id, v_pro_name
  FROM leads l
  JOIN professional_profiles pp ON pp.id = NEW.professional_id
  JOIN users u ON u.id = pp.user_id
  WHERE l.id = NEW.lead_id;

  PERFORM public.call_send_push(
    v_client_id,
    'new_quote',
    'Nuevo presupuesto',
    v_pro_name || ' ha enviado un presupuesto para tu solicitud',
    jsonb_build_object('leadId', NEW.lead_id, 'quoteId', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_new_quote ON quotes;
CREATE TRIGGER trg_push_new_quote
  AFTER INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.push_on_new_quote();

-- ═══════════════════════════════════════════════════
-- Push: quote accepted by client (to professional)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.push_on_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_pro_user_id UUID; v_client_name TEXT;
BEGIN
  IF NEW.status = 'aceptado' AND OLD.status <> 'aceptado' THEN
    SELECT pp.user_id, u.full_name
      INTO v_pro_user_id, v_client_name
    FROM professional_profiles pp
    JOIN leads l ON l.id = NEW.lead_id
    JOIN users u ON u.id = l.client_id
    WHERE pp.id = NEW.professional_id;

    PERFORM public.call_send_push(
      v_pro_user_id,
      'quote_accepted',
      'Presupuesto aceptado',
      v_client_name || ' ha aceptado tu presupuesto. Enhorabuena!',
      jsonb_build_object('quoteId', NEW.id, 'leadId', NEW.lead_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_quote_accepted ON quotes;
CREATE TRIGGER trg_push_quote_accepted
  AFTER UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.push_on_quote_accepted();

-- ═══════════════════════════════════════════════════
-- Push: new chat message
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.push_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_sender_name TEXT;
BEGIN
  SELECT full_name INTO v_sender_name FROM users WHERE id = NEW.sender_id;

  PERFORM public.call_send_push(
    NEW.recipient_id,
    'new_message',
    v_sender_name,
    COALESCE(LEFT(NEW.content, 80), 'Nuevo mensaje'),
    jsonb_build_object('projectId', NEW.project_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_new_message ON messages;
CREATE TRIGGER trg_push_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.message_type = 'text')
  EXECUTE FUNCTION public.push_on_new_message();

-- ═══════════════════════════════════════════════════
-- Push: project marked as completed (to client)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.push_on_project_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status <> 'completado' THEN
    PERFORM public.call_send_push(
      NEW.client_id,
      'project_completed',
      'Proyecto completado',
      'Tu proyecto ha sido marcado como completado. Deja tu resena!',
      jsonb_build_object('projectId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_project_completed ON projects;
CREATE TRIGGER trg_push_project_completed
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.push_on_project_completed();
