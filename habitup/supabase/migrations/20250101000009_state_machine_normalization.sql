-- =====================================================
-- MIGRATION 009: State machine normalization
--
-- Normaliza y refuerza las transiciones de estado en
-- leads, quotes y projects.
--
-- Include:
--   - enforce_lead_status_transition()
--   - enforce_project_status_transition() — version completa
--
-- Diagrama de estados (ver README.md para version ASCII):
--
-- Lead:
--   activo → en_negociacion → asignado → cerrado
--   activo, en_negociacion, asignado → cancelado
--
-- Quote:
--   enviado → visto → aceptado (vía RPC)
--   enviado, visto → rechazado, expirado
--   enviado → retirado
--
-- Project:
--   pendiente → en_curso → pendiente_finalizacion → completado
--   pendiente, en_curso, pausado → cancelado
--   en_curso → pausado → en_curso
--   pendiente_finalizacion → en_curso (cliente solicita cambios)
--
-- Payment (independiente del status del proyecto):
--   pendiente → en_proceso → completado
--   en_proceso → fallido → pendiente
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. Lead status transition enforcement
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_lead_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'activo' AND NEW.status IN ('en_negociacion', 'cancelado', 'asignado'))
    OR (OLD.status = 'en_negociacion' AND NEW.status IN ('asignado', 'cancelado'))
    OR (OLD.status = 'asignado' AND NEW.status IN ('cerrado', 'cancelado'))
  ) THEN
    RAISE EXCEPTION 'Transicion de estado de lead no valida: % → %', OLD.status, NEW.status
      USING HINT = 'invalid_lead_transition';
  END IF;

  -- Auto-set closed_at al alcanzar estado terminal
  IF NEW.status IN ('cerrado', 'cancelado') AND OLD.closed_at IS NULL THEN
    NEW.closed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lead_status_transition ON leads;
CREATE TRIGGER trg_enforce_lead_status_transition
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lead_status_transition();

-- ═══════════════════════════════════════════════════
-- 2. Project status transition enforcement (full)
--
-- Reemplaza la funcion creada en 0005 con la version
-- completa que valida todas las transiciones.
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

  -- ── Transiciones permitidas ──

  -- pendiente → en_curso (solo profesional)
  IF OLD.status = 'pendiente' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede iniciar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  -- pendiente → cancelado
  IF OLD.status = 'pendiente' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  -- en_curso → pendiente_finalizacion (solo profesional)
  IF OLD.status = 'en_curso' AND NEW.status = 'pendiente_finalizacion' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede marcar trabajo finalizado'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  -- en_curso → pausado (solo profesional)
  IF OLD.status = 'en_curso' AND NEW.status = 'pausado' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede pausar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  -- en_curso → cancelado
  IF OLD.status = 'en_curso' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  -- pausado → en_curso (solo profesional)
  IF OLD.status = 'pausado' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede reanudar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  -- pausado → cancelado
  IF OLD.status = 'pausado' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  -- pendiente_finalizacion → completado (solo cliente)
  IF OLD.status = 'pendiente_finalizacion' AND NEW.status = 'completado' THEN
    IF auth.uid() <> OLD.client_id THEN
      RAISE EXCEPTION 'Solo el cliente puede confirmar la finalizacion'
        USING HINT = 'forbidden_transition';
    END IF;
    NEW.actual_end_date = COALESCE(NEW.actual_end_date, CURRENT_DATE);
    RETURN NEW;
  END IF;

  -- pendiente_finalizacion → en_curso (solo cliente — solicita cambios)
  IF OLD.status = 'pendiente_finalizacion' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> OLD.client_id THEN
      RAISE EXCEPTION 'Solo el cliente puede solicitar cambios'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transicion de estado de proyecto no valida: % → %', OLD.status, NEW.status
    USING HINT = 'invalid_project_transition';
END;
$$;

-- El trigger trg_enforce_project_status_transition creado en 0005
-- sigue apuntando a esta funcion; no hace falta recrearlo.

-- ═══════════════════════════════════════════════════
-- 3. Quote: add retirado to CHECK constraint
--
-- NOTA: 'retirado' ya existe en el CHECK original de 0002.
-- Solo se anade documentacion aqui — no requiere ALTER.
-- La constante TS si faltaba (se corrige en este commit).
-- ═══════════════════════════════════════════════════

-- El CHECK constraint actual en quotes es:
--   CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado', 'retirado'))
-- 'retirado' ya esta incluido. No se requiere cambio en SQL.
