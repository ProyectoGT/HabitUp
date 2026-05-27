-- =====================================================
-- MIGRATION 005: Business triggers and functions
--
-- Incluye:
--   - accept_quote() RPC       → flujo transaccional lead→proyecto
--   - enforce_project_status   → valida transiciones de estado
--   - notify_client_pending    → notificacion in-app al marcar finalizado
--   - mark_quote_viewed        → timestamps automáticos en quotes
--   - notify_client_new_quote  → notificacion in-app al recibir quote
--   - notify_pro_quote_accepted → notificacion in-app al aceptar quote
--   - update_professional_rating → recalcula avg_rating al insertar review
--
-- ⚠️  CONOCIDO: `update_professional_rating()` se añade aquí pero no
--     existía en las migraciones canónicas (000-002). Estaba solo en
--     el schema alternativo `habitup_schema.sql`. Sin este trigger,
--     avg_rating y total_reviews nunca se actualizan al crear reseñas.
--     Se incorpora como fix necesario.
-- =====================================================

-- ═══════════════════════════════════════════════════
-- Mark quote as viewed on status change
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mark_quote_viewed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('visto', 'aceptado', 'rechazado') AND OLD.viewed_at IS NULL THEN
    NEW.viewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_quote_viewed ON quotes;
CREATE TRIGGER trg_mark_quote_viewed
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.mark_quote_viewed();

-- ═══════════════════════════════════════════════════
-- Notify client when a professional sends a quote
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_client_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT
    l.client_id,
    'new_quote',
    'Nuevo presupuesto recibido',
    (SELECT full_name FROM users WHERE id = pp.user_id) || ' ha enviado un presupuesto para tu solicitud',
    NEW.id
  FROM leads l
  JOIN professional_profiles pp ON pp.id = NEW.professional_id
  WHERE l.id = NEW.lead_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_new_quote ON quotes;
CREATE TRIGGER trg_notify_client_new_quote
  AFTER INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_new_quote();

-- ═══════════════════════════════════════════════════
-- Notify professional when their quote is accepted
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_professional_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aceptado' AND OLD.status <> 'aceptado' THEN
    INSERT INTO notifications (user_id, type, title, message, related_id)
    SELECT
      pp.user_id,
      'quote_accepted',
      'Presupuesto aceptado',
      'Tu presupuesto ha sido aceptado. Ya puedes acceder al proyecto.',
      NEW.id
    FROM professional_profiles pp
    WHERE pp.id = NEW.professional_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_professional_quote_accepted ON quotes;
CREATE TRIGGER trg_notify_professional_quote_accepted
  AFTER UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_professional_quote_accepted();

-- ═══════════════════════════════════════════════════
-- Accept quote RPC (transactional lead→project creation)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id UUID)
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

GRANT EXECUTE ON FUNCTION public.accept_quote(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════
-- Enforce valid project status transitions
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_project_status_transition()
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
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_status_transition();

-- ═══════════════════════════════════════════════════
-- Notify client when professional marks project as pending completion
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_client_project_pending_completion()
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
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_project_pending_completion();

-- ═══════════════════════════════════════════════════
-- Recalculate professional rating when a review is added/removed
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE professional_profiles
  SET
    avg_rating   = COALESCE(
                    (SELECT AVG(rating)::NUMERIC(3,2)
                     FROM reviews
                     WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id)),
                    0),
    total_reviews = (SELECT COUNT(*)
                     FROM reviews
                     WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id))
  WHERE id = COALESCE(NEW.professional_id, OLD.professional_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_professional_rating ON reviews;
CREATE TRIGGER trg_update_professional_rating
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_professional_rating();
