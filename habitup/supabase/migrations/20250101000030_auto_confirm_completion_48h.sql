-- =====================================================
-- MIGRATION 030: Autoconfirmación de entrega a las 48 h
--
-- REGLA DE NEGOCIO
--   El profesional propone la finalización (en_curso → pendiente_finalizacion).
--   El cliente confirma. Si no responde en 48 h, se autoconfirma.
--
-- POR QUÉ
--   Sin esto, un cliente que simplemente desaparece deja al profesional sin
--   cobrar de forma indefinida. Es una de las razones típicas por las que los
--   profesionales abandonan un marketplace.
--
-- SALVAGUARDAS
--   · Aviso al cliente a las 24 h. No se autoconfirma nada sin haber avisado.
--   · Si el cliente abre una disputa, el reloj se CONGELA. La autoconfirmación
--     nunca puede pasar por encima de una reclamación abierta.
--   · Si el cliente pide cambios (pendiente_finalizacion → en_curso), el reloj
--     se reinicia desde cero en la siguiente propuesta.
-- =====================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completion_requested_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_reminded_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_confirmed            BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN projects.auto_confirmed IS
  'TRUE si la entrega se dio por buena por silencio del cliente, no por confirmacion explicita. Relevante en disputas posteriores.';

CREATE INDEX IF NOT EXISTS projects_pendiente_finalizacion_idx
  ON projects(completion_requested_at)
  WHERE status = 'pendiente_finalizacion';

-- Plazo configurable sin tocar código.
INSERT INTO ranking_settings (key, value, description) VALUES
  ('autoconfirm_hours', 48, 'Horas antes de dar la entrega por confirmada si el cliente no responde.'),
  ('autoconfirm_remind_hours', 24, 'Horas antes de enviar el aviso previo al cliente.')
ON CONFLICT (key) DO NOTHING;

-- ---------- Sellar la marca de tiempo al proponer finalización ----------
CREATE OR REPLACE FUNCTION public.stamp_completion_request()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pendiente_finalizacion' AND OLD.status <> 'pendiente_finalizacion' THEN
    NEW.completion_requested_at := NOW();
    NEW.completion_reminded_at  := NULL;   -- reloj a cero en cada propuesta
  END IF;

  -- El cliente pidio cambios: se anula la cuenta atras.
  IF OLD.status = 'pendiente_finalizacion' AND NEW.status = 'en_curso' THEN
    NEW.completion_requested_at := NULL;
    NEW.completion_reminded_at  := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_completion_request ON projects;
CREATE TRIGGER trg_stamp_completion_request
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.stamp_completion_request();

-- ---------- Permitir la transicion al proceso automatico ----------
-- Identica a la migracion 009, con UNA diferencia: el bloque
-- pendiente_finalizacion → completado acepta tambien al proceso del sistema,
-- identificado por un GUC de sesion que solo puede fijar auto_confirm_completions().
CREATE OR REPLACE FUNCTION public.enforce_project_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professional_user_id UUID;
  v_is_system BOOLEAN := COALESCE(current_setting('habitup.system_action', TRUE), '') = 'autoconfirm';
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_professional_user_id
  FROM professional_profiles
  WHERE id = OLD.professional_id;

  IF OLD.status = 'pendiente' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede iniciar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pendiente' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'en_curso' AND NEW.status = 'pendiente_finalizacion' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede marcar trabajo finalizado'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'en_curso' AND NEW.status = 'pausado' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede pausar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'en_curso' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pausado' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> v_professional_user_id THEN
      RAISE EXCEPTION 'Solo el profesional puede reanudar el proyecto'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pausado' AND NEW.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  -- pendiente_finalizacion → completado: el cliente, o el proceso automatico.
  IF OLD.status = 'pendiente_finalizacion' AND NEW.status = 'completado' THEN
    IF NOT v_is_system AND auth.uid() <> OLD.client_id THEN
      RAISE EXCEPTION 'Solo el cliente puede confirmar la finalizacion'
        USING HINT = 'forbidden_transition';
    END IF;
    NEW.actual_end_date = COALESCE(NEW.actual_end_date, CURRENT_DATE);
    RETURN NEW;
  END IF;

  IF OLD.status = 'pendiente_finalizacion' AND NEW.status = 'en_curso' THEN
    IF auth.uid() <> OLD.client_id THEN
      RAISE EXCEPTION 'Solo el cliente puede solicitar cambios'
        USING HINT = 'forbidden_transition';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transicion de estado de proyecto no valida: % -> %', OLD.status, NEW.status
    USING HINT = 'invalid_project_transition';
END;
$$;

-- ---------- Aviso previo a las 24 h ----------
CREATE OR REPLACE FUNCTION public.remind_pending_completions()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_horas NUMERIC := COALESCE(public.ranking_setting('autoconfirm_remind_hours'), 24);
  v_plazo NUMERIC := COALESCE(public.ranking_setting('autoconfirm_hours'), 48);
  v_count INT := 0;
  p RECORD;
BEGIN
  FOR p IN
    SELECT id, client_id, title, completion_requested_at
    FROM projects
    WHERE status = 'pendiente_finalizacion'
      AND disputed_at IS NULL
      AND completion_reminded_at IS NULL
      AND completion_requested_at IS NOT NULL
      AND completion_requested_at <= NOW() - (v_horas || ' hours')::INTERVAL
  LOOP
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      p.client_id,
      'completion_reminder',
      'Confirma que el trabajo esta terminado',
      FORMAT('Te quedan %s h para revisar "%s". Si no respondes, se dara por entregado automaticamente.',
             ROUND(v_plazo - v_horas), p.title),
      p.id
    );

    UPDATE projects SET completion_reminded_at = NOW() WHERE id = p.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------- Autoconfirmación a las 48 h ----------
CREATE OR REPLACE FUNCTION public.auto_confirm_completions()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plazo NUMERIC := COALESCE(public.ranking_setting('autoconfirm_hours'), 48);
  v_count INT := 0;
  p RECORD;
BEGIN
  -- Habilita la excepcion en el trigger SOLO durante esta transaccion.
  PERFORM set_config('habitup.system_action', 'autoconfirm', TRUE);

  FOR p IN
    SELECT pr.id, pr.client_id, pr.title, pp.user_id AS professional_user_id
    FROM projects pr
    JOIN professional_profiles pp ON pp.id = pr.professional_id
    WHERE pr.status = 'pendiente_finalizacion'
      AND pr.disputed_at IS NULL                     -- una disputa congela el reloj
      AND pr.completion_reminded_at IS NOT NULL      -- nunca sin haber avisado
      AND pr.completion_requested_at IS NOT NULL
      AND pr.completion_requested_at <= NOW() - (v_plazo || ' hours')::INTERVAL
  LOOP
    UPDATE projects
       SET status = 'completado',
           auto_confirmed = TRUE,
           actual_end_date = COALESCE(actual_end_date, CURRENT_DATE)
     WHERE id = p.id;

    -- Reflejar la fase en la conversacion, si existe.
    UPDATE conversations
       SET status = 'entregada'
     WHERE project_id = p.id
       AND status = 'en_obra';

    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES
      (p.client_id, 'project_auto_completed',
       'Trabajo dado por entregado',
       FORMAT('"%s" se ha dado por entregado al no recibir respuesta en %s h.', p.title, ROUND(v_plazo)),
       p.id),
      (p.professional_user_id, 'project_auto_completed',
       'Trabajo confirmado automaticamente',
       FORMAT('"%s" se ha confirmado automaticamente. Ya puedes cobrar.', p.title),
       p.id);

    v_count := v_count + 1;
  END LOOP;

  PERFORM set_config('habitup.system_action', '', TRUE);
  RETURN v_count;
END;
$$;

-- Solo el sistema. Nadie desde la app puede invocarlas.
REVOKE ALL ON FUNCTION public.auto_confirm_completions()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remind_pending_completions() FROM PUBLIC, anon, authenticated;

-- ---------- Programación horaria ----------
-- pg_cron puede no estar habilitado; en ese caso hay que activarlo en el panel
-- de Supabase (Database → Extensions → pg_cron) y volver a lanzar este bloque.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('habitup_remind_completions')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'habitup_remind_completions');
    PERFORM cron.unschedule('habitup_auto_confirm')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'habitup_auto_confirm');

    PERFORM cron.schedule('habitup_remind_completions', '0 * * * *',
      'SELECT public.remind_pending_completions()');
    PERFORM cron.schedule('habitup_auto_confirm', '15 * * * *',
      'SELECT public.auto_confirm_completions()');

    RAISE NOTICE 'Tareas programadas cada hora.';
  ELSE
    RAISE WARNING 'pg_cron no esta habilitado: la autoconfirmacion NO se ejecutara sola. Activalo en Database -> Extensions y relanza este bloque.';
  END IF;
END $$;
