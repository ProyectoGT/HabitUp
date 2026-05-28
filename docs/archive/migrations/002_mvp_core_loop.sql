-- =====================================================
-- MIGRACION 002: Core loop MVP HabitUp
-- Cliente crea lead -> profesional envia quote -> cliente acepta
-- -> proyecto -> chat -> finalizacion confirmada -> review verificada.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Categorias iniciales del MVP.
INSERT INTO categories (name, slug, description, icon_url, is_active) VALUES
  ('Reformas integrales', 'reformas-integrales', 'Reformas completas de vivienda o local', 'home', TRUE),
  ('Banos', 'banos', 'Reformas y reparaciones de banos', 'bath', TRUE),
  ('Cocinas', 'cocinas', 'Reformas de cocina, encimeras y mobiliario', 'chef-hat', TRUE),
  ('Pintura', 'pintura', 'Pintura interior, exterior y alisado', 'paintbrush', TRUE),
  ('Fontaneria', 'fontaneria', 'Tuberias, grifos, fugas y sanitarios', 'droplets', TRUE),
  ('Electricidad', 'electricidad', 'Instalaciones, averias y boletines', 'zap', TRUE),
  ('Carpinteria', 'carpinteria', 'Puertas, muebles, tarimas y madera', 'hammer', TRUE),
  ('Climatizacion', 'climatizacion', 'Aire acondicionado, calefaccion y ventilacion', 'snowflake', TRUE),
  ('Albanileria', 'albanileria', 'Muros, tabiques, suelos y trabajos de obra', 'brick-wall', TRUE),
  ('Suelos', 'suelos', 'Tarima, parquet, porcelanico y microcemento', 'layers', TRUE),
  ('Jardineria', 'jardineria', 'Jardines, terrazas y mantenimiento exterior', 'leaf', TRUE),
  ('Limpieza', 'limpieza', 'Limpieza puntual, fin de obra y mantenimiento', 'sparkles', TRUE),
  ('Mudanzas', 'mudanzas', 'Mudanzas, portes y montaje', 'truck', TRUE),
  ('Persianas y ventanas', 'persianas-ventanas', 'Persianas, ventanas, cristales y cerramientos', 'blinds', TRUE),
  ('Manitas', 'manitas', 'Pequenas reparaciones e instalaciones del hogar', 'wrench', TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  is_active = TRUE;

-- Permitir el estado intermedio que exige el producto:
-- el profesional marca trabajo finalizado y el cliente confirma completado.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
CHECK (status IN ('pendiente', 'en_curso', 'pendiente_finalizacion', 'pausado', 'completado', 'cancelado'));

-- Permitir retirada futura de presupuestos sin rehacer schema.
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado', 'retirado'));

-- Aceptacion transaccional de presupuesto. Evita que el cliente tenga que
-- hacer varias escrituras sensibles desde la app.
CREATE OR REPLACE FUNCTION accept_quote(p_quote_id UUID)
RETURNS TABLE(project_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_lead leads%ROWTYPE;
  v_project_id UUID;
BEGIN
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Presupuesto no encontrado';
  END IF;

  SELECT * INTO v_lead
  FROM leads
  WHERE id = v_quote.lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  IF v_lead.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'No puedes aceptar presupuestos de otra solicitud';
  END IF;

  IF v_lead.status NOT IN ('activo', 'en_negociacion') THEN
    RAISE EXCEPTION 'La solicitud ya no admite presupuestos';
  END IF;

  IF v_quote.status NOT IN ('enviado', 'visto') THEN
    RAISE EXCEPTION 'Este presupuesto no se puede aceptar';
  END IF;

  SELECT id INTO v_project_id
  FROM projects
  WHERE quote_id = p_quote_id
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    RETURN QUERY SELECT v_project_id;
    RETURN;
  END IF;

  UPDATE quotes
  SET status = 'aceptado',
      accepted_at = NOW(),
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = p_quote_id;

  UPDATE quotes
  SET status = 'rechazado',
      rejected_at = NOW(),
      rejection_reason = COALESCE(rejection_reason, 'No seleccionado')
  WHERE lead_id = v_quote.lead_id
    AND id <> p_quote_id
    AND status IN ('enviado', 'visto');

  UPDATE leads
  SET status = 'asignado',
      assigned_professional_id = v_quote.professional_id,
      closed_at = NOW()
  WHERE id = v_quote.lead_id;

  INSERT INTO projects (
    lead_id,
    quote_id,
    client_id,
    professional_id,
    category_id,
    title,
    description,
    agreed_price,
    currency,
    status,
    start_date,
    expected_end_date
  )
  VALUES (
    v_lead.id,
    v_quote.id,
    v_lead.client_id,
    v_quote.professional_id,
    v_lead.category_id,
    v_lead.title,
    v_lead.description,
    v_quote.amount,
    v_quote.currency,
    'pendiente',
    CURRENT_DATE,
    CASE
      WHEN v_quote.delivery_days IS NULL THEN NULL
      ELSE CURRENT_DATE + v_quote.delivery_days
    END
  )
  RETURNING id INTO v_project_id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT
    pp.user_id,
    'quote_accepted',
    'Presupuesto aceptado',
    'Tu presupuesto ha sido aceptado. Ya puedes acceder al proyecto.',
    v_project_id
  FROM professional_profiles pp
  WHERE pp.id = v_quote.professional_id;

  RETURN QUERY SELECT v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_quote(UUID) TO authenticated;

-- Endurecer chat: solo participantes reales del proyecto pueden leer/enviar.
DROP POLICY IF EXISTS "messages: participantes del proyecto" ON messages;
DROP POLICY IF EXISTS "messages: enviar como uno mismo" ON messages;

CREATE POLICY "messages: participantes leen mensajes del proyecto"
ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM projects p
    LEFT JOIN professional_profiles pp ON pp.id = p.professional_id
    WHERE p.id = messages.project_id
      AND (p.client_id = auth.uid() OR pp.user_id = auth.uid())
      AND messages.deleted_at IS NULL
  )
);

CREATE POLICY "messages: participantes envian mensajes"
ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM projects p
    LEFT JOIN professional_profiles pp ON pp.id = p.professional_id
    WHERE p.id = messages.project_id
      AND (
        (p.client_id = auth.uid() AND recipient_id = pp.user_id)
        OR (pp.user_id = auth.uid() AND recipient_id = p.client_id)
      )
  )
);

-- Politica de insercion de proyecto para fallback local. La ruta recomendada
-- es accept_quote(), pero esta regla mantiene demos antiguas funcionales.
DROP POLICY IF EXISTS "projects: cliente crea al aceptar quote" ON projects;
CREATE POLICY "projects: cliente crea al aceptar quote"
ON projects FOR INSERT WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM quotes q
    JOIN leads l ON l.id = q.lead_id
    WHERE q.id = quote_id
      AND l.id = lead_id
      AND l.client_id = auth.uid()
      AND q.professional_id = professional_id
      AND q.status = 'aceptado'
  )
);

-- Validar transiciones de proyecto.
CREATE OR REPLACE FUNCTION enforce_project_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professional_user_id UUID;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_professional_user_id
  FROM professional_profiles
  WHERE id = OLD.professional_id;

  IF NEW.status = 'pendiente_finalizacion' AND auth.uid() <> v_professional_user_id THEN
    RAISE EXCEPTION 'Solo el profesional puede marcar trabajo finalizado';
  END IF;

  IF NEW.status = 'completado' THEN
    IF OLD.status <> 'pendiente_finalizacion' THEN
      RAISE EXCEPTION 'El proyecto debe estar pendiente de confirmacion antes de completarse';
    END IF;

    IF auth.uid() <> OLD.client_id THEN
      RAISE EXCEPTION 'Solo el cliente puede confirmar la finalizacion';
    END IF;

    NEW.actual_end_date = COALESCE(NEW.actual_end_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_status_transition ON projects;
CREATE TRIGGER trg_enforce_project_status_transition
BEFORE UPDATE OF status ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_status_transition();

-- Notificacion in-app al cliente cuando el profesional marca finalizado.
CREATE OR REPLACE FUNCTION notify_client_project_pending_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pendiente_finalizacion' AND OLD.status <> 'pendiente_finalizacion' THEN
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.client_id,
      'project_pending_completion',
      'Trabajo finalizado',
      'El profesional ha marcado el trabajo como finalizado. Revisa el proyecto y confirma si todo esta correcto.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_project_pending_completion ON projects;
CREATE TRIGGER trg_notify_client_project_pending_completion
AFTER UPDATE OF status ON projects
FOR EACH ROW EXECUTE FUNCTION notify_client_project_pending_completion();
