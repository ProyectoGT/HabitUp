-- =====================================================
-- MIGRATION 014: Payments table + state separation
--
-- Separa el estado financiero del estado operativo del
-- proyecto. Un payment completado NO completa el proyecto;
-- la obra termina solo cuando el cliente confirma vía RPC.
--
-- Cambios:
--   1. Crea tabla payments (referenciada por EFs pero sin DDL)
--   2. Crea tabla commissions
--   3. Añade disputa, reembolsado, pendiente_pago a payment_status
--   4. Trigger: create_commission_on_payment (NO toca projects.status)
--   5. Trigger: impide reseñas en proyectos no completados
--   6. RPC: complete_project (cliente confirma finalización)
--   7. RPC: request_project_completion (profesional solicita)
--   8. RLS policies para payments y commissions
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. PAYMENTS TABLE
--    DDL faltante — la Edge Function ya hace
--    upsert aquí desde create-payment-intent.
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id                UUID NOT NULL REFERENCES users(id),
  professional_id          UUID NOT NULL REFERENCES professional_profiles(id),
  amount                   NUMERIC(10,2) NOT NULL,
  gross_amount             NUMERIC(10,2) NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'eur',
  platform_commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,
  commission_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  professional_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id       TEXT,
  status                   TEXT NOT NULL DEFAULT 'procesando'
                             CHECK (status IN ('procesando', 'completado', 'fallido', 'reembolsado', 'disputa')),
  paid_at                  TIMESTAMPTZ,
  error_message            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payments IS 'Pagos de proyectos — creado por create-payment-intent EF';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'ID del PaymentIntent en Stripe (único)';
COMMENT ON COLUMN payments.stripe_transfer_id IS 'ID de la transferencia Stripe Connect al profesional';

-- ═══════════════════════════════════════════════════
-- 2. COMMISSIONS TABLE
--    Registro de la comisión de la plataforma.
--    Se inserta automáticamente vía trigger cuando
--    payments.status → completado.
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES payments(id),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id),
  amount          NUMERIC(10,2) NOT NULL,
  pct             NUMERIC(5,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente', 'pagado', 'reembolsado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_project_id ON commissions(project_id);
CREATE INDEX IF NOT EXISTS idx_commissions_payment_id ON commissions(payment_id);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commissions IS 'Comisiones de HabitUp por proyecto';

-- ═══════════════════════════════════════════════════
-- 3. UPDATE payment_status CHECK
--    Añade pendiente_pago, disputa, reembolsado
--    Elimina en_proceso (renombrado a pendiente_pago)
-- ═══════════════════════════════════════════════════

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_payment_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_payment_status_check
  CHECK (payment_status IN ('pendiente', 'pendiente_pago', 'completado', 'fallido', 'reembolsado', 'disputa'));

-- Migrar registros existentes de 'en_proceso' a 'pendiente_pago'
UPDATE projects SET payment_status = 'pendiente_pago' WHERE payment_status = 'en_proceso';

-- ═══════════════════════════════════════════════════
-- 4. TRIGGER: create commission when payment completes
--    SOLO toca commissions — NO toca projects.status
--    (pago completado ≠ obra terminada)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_commission_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM commissions WHERE payment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO commissions (project_id, payment_id, professional_id, amount, pct)
  VALUES (
    NEW.project_id,
    NEW.id,
    NEW.professional_id,
    NEW.commission_amount,
    NEW.platform_commission_pct
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_commission_on_payment ON payments;
CREATE TRIGGER trg_create_commission_on_payment
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completado')
  EXECUTE FUNCTION public.create_commission_on_payment();

-- ═══════════════════════════════════════════════════
-- 5. TRIGGER: prevent reviews on non-completed projects
--    La reseña solo se permite si projects.status = 'completado'
--    (estado operativo, no financiero)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_project_completed_for_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM projects WHERE id = NEW.project_id;

  IF v_status <> 'completado' THEN
    RAISE EXCEPTION 'Solo se pueden dejar reseñas en proyectos completados'
      USING HINT = 'project_not_completed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_project_completed_for_review ON reviews;
CREATE TRIGGER trg_check_project_completed_for_review
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_project_completed_for_review();

-- ═══════════════════════════════════════════════════
-- 6. RPC: complete_project
--    Cliente confirma que la obra está terminada.
--    Valida: proyecto existe, cliente es dueño,
--    proyecto está en pendiente_finalizacion.
--    Actualiza status + actual_end_date.
--    INYECCIÓN DE NOTIFICACIÓN: al profesional.
--    NO revisa payment_status (el pago puede ir aparte).
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.complete_project(p_project_id UUID)
RETURNS SETOF projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_professional_user_id UUID;
BEGIN
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado'
      USING HINT = 'project_not_found';
  END IF;

  IF v_project.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Solo el cliente puede confirmar la finalización'
      USING HINT = 'not_client';
  END IF;

  IF v_project.status <> 'pendiente_finalizacion' THEN
    RAISE EXCEPTION 'El proyecto debe estar pendiente de confirmación (actual: %)', v_project.status
      USING HINT = 'wrong_status';
  END IF;

  UPDATE projects
  SET status = 'completado',
      actual_end_date = COALESCE(actual_end_date, CURRENT_DATE)
  WHERE id = p_project_id
  RETURNING * INTO v_project;

  -- Notificar al profesional
  SELECT user_id INTO v_professional_user_id
  FROM professional_profiles
  WHERE id = v_project.professional_id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_professional_user_id,
    'project_completed',
    'Proyecto completado',
    'El cliente ha confirmado la finalización del proyecto.',
    p_project_id::TEXT
  );

  RETURN NEXT v_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_project(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════
-- 7. RPC: request_project_completion
--    Profesional solicita que el cliente confirme la
--    finalización. Equivale a marcar pendiente_finalizacion
--    pero con validación y notificación atómica.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.request_project_completion(p_project_id UUID)
RETURNS SETOF projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado'
      USING HINT = 'project_not_found';
  END IF;

  SELECT user_id INTO v_user_id
  FROM professional_profiles
  WHERE id = v_project.professional_id;

  IF auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Solo el profesional asignado puede solicitar finalización'
      USING HINT = 'not_professional';
  END IF;

  IF v_project.status <> 'en_curso' THEN
    RAISE EXCEPTION 'El proyecto debe estar en curso (actual: %)', v_project.status
      USING HINT = 'wrong_status';
  END IF;

  UPDATE projects
  SET status = 'pendiente_finalizacion'
  WHERE id = p_project_id
  RETURNING * INTO v_project;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_project.client_id,
    'project_pending_completion',
    'Trabajo finalizado',
    'El profesional ha marcado el trabajo como finalizado. Revisa el proyecto y confirma si todo está correcto.',
    p_project_id::TEXT
  );

  RETURN NEXT v_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_project_completion(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════
-- 8. RLS POLICIES
--    payments: client/profesional leen, solo EF escribe
--    commissions: client/profesional leen, solo trigger escribe
-- ═══════════════════════════════════════════════════

-- Payments
DROP POLICY IF EXISTS "payments: lectura participantes" ON payments;
CREATE POLICY "payments: lectura participantes" ON payments
  FOR SELECT USING (
    client_id = auth.uid()
    OR professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- El INSERT viene de la Edge Function (service_role), no del cliente
DROP POLICY IF EXISTS "payments: escritura service_role" ON payments;
CREATE POLICY "payments: escritura service_role" ON payments
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "payments: actualizacion service_role" ON payments;
CREATE POLICY "payments: actualizacion service_role" ON payments
  FOR UPDATE USING (false) WITH CHECK (false);

-- Commissions
DROP POLICY IF EXISTS "commissions: lectura participantes" ON commissions;
CREATE POLICY "commissions: lectura participantes" ON commissions
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

DROP POLICY IF EXISTS "commissions: escritura service_role" ON commissions;
CREATE POLICY "commissions: escritura service_role" ON commissions
  FOR ALL USING (false) WITH CHECK (false);
