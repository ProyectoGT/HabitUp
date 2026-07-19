-- =====================================================
-- MIGRATION 027: Comisión por tramos + suscripciones de profesional
--
-- CAMBIO DE MODELO DE NEGOCIO
--   Antes: 10% plano, hardcodeado en accept_quote().
--   Ahora: tramos decrecientes. En reformas el ticket va de 200 € a 20.000 €;
--          un porcentaje plano ahoga la reforma grande o no cubre costes en
--          la pequeña.
--
-- REGLA FISCAL IMPORTANTE
--   El porcentaje aplicado se CONGELA en projects.platform_commission_pct en
--   el momento de aceptar el presupuesto. Cambiar las tarifas nunca puede
--   recalcular comisiones de proyectos pasados.
-- =====================================================

-- ---------- Tramos de comisión ----------
CREATE TABLE IF NOT EXISTS commission_tiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount  NUMERIC(10,2) NOT NULL,
  max_amount  NUMERIC(10,2),            -- NULL = sin límite superior
  percentage  NUMERIC(5,2)  NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  max_fee     NUMERIC(10,2),            -- tope absoluto por proyecto, opcional
  valid_from  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,              -- NULL = vigente
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (max_amount IS NULL OR max_amount > min_amount)
);

CREATE INDEX IF NOT EXISTS commission_tiers_vigencia_idx
  ON commission_tiers(valid_from, valid_until);

ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;

-- Los tramos son información pública: el profesional tiene derecho a saber
-- cuánto se le va a cobrar antes de presupuestar.
DROP POLICY IF EXISTS "commission_tiers: lectura publica" ON commission_tiers;
CREATE POLICY "commission_tiers: lectura publica"
ON commission_tiers FOR SELECT USING (TRUE);

GRANT SELECT ON commission_tiers TO anon, authenticated;

-- Tramos iniciales (a validar con el negocio antes de producción).
INSERT INTO commission_tiers (min_amount, max_amount, percentage, max_fee)
SELECT * FROM (VALUES
  (0::NUMERIC,     500::NUMERIC,   10.00::NUMERIC, NULL::NUMERIC),
  (500::NUMERIC,   2000::NUMERIC,   7.00::NUMERIC, NULL::NUMERIC),
  (2000::NUMERIC,  8000::NUMERIC,   4.50::NUMERIC, NULL::NUMERIC),
  (8000::NUMERIC,  NULL::NUMERIC,   3.00::NUMERIC, 900::NUMERIC)
) AS t
WHERE NOT EXISTS (SELECT 1 FROM commission_tiers);

-- ---------- Resolución del tramo aplicable ----------
CREATE OR REPLACE FUNCTION public.resolve_commission(p_amount NUMERIC)
RETURNS TABLE (pct NUMERIC, fee NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier commission_tiers%ROWTYPE;
  v_fee  NUMERIC(10,2);
BEGIN
  SELECT * INTO v_tier
  FROM commission_tiers
  WHERE p_amount >= min_amount
    AND (max_amount IS NULL OR p_amount < max_amount)
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until > NOW())
  ORDER BY valid_from DESC
  LIMIT 1;

  -- Sin tramo configurado, caemos al 10% histórico en vez de cobrar 0.
  IF NOT FOUND THEN
    pct := 10.00;
    fee := ROUND(p_amount * 10.00 / 100, 2);
    RETURN NEXT;
    RETURN;
  END IF;

  v_fee := ROUND(p_amount * v_tier.percentage / 100, 2);

  IF v_tier.max_fee IS NOT NULL AND v_fee > v_tier.max_fee THEN
    v_fee := v_tier.max_fee;
  END IF;

  pct := v_tier.percentage;
  fee := v_fee;
  RETURN NEXT;
END;
$$;

-- ---------- Planes de suscripción ----------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly    NUMERIC(10,2),
  -- Descuento en PUNTOS sobre el tramo que toque. Es el motivo por el que el
  -- profesional paga la cuota: le sale a cuenta, no se le obliga.
  commission_discount_points NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Derecho a aparecer en el bloque "Promocionado". NUNCA reordena el
  -- listado orgánico por mérito.
  promoted_slots  INT NOT NULL DEFAULT 0,
  max_active_conversations INT,          -- NULL = ilimitado
  features        JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans: lectura publica" ON subscription_plans;
CREATE POLICY "subscription_plans: lectura publica"
ON subscription_plans FOR SELECT USING (is_active);

GRANT SELECT ON subscription_plans TO anon, authenticated;

INSERT INTO subscription_plans
  (slug, name, price_monthly, price_yearly, commission_discount_points, promoted_slots, max_active_conversations, features)
SELECT * FROM (VALUES
  ('free', 'Gratuito',  0::NUMERIC,   0::NUMERIC,   0::NUMERIC, 0, 5,
   '{"portfolio_items": 6, "stats": false}'::JSONB),
  ('pro',  'Pro',      29::NUMERIC, 290::NUMERIC,   2::NUMERIC, 1, NULL,
   '{"portfolio_items": 30, "stats": true, "badge": true}'::JSONB)
) AS t
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans);

-- ---------- Suscripciones activas ----------
CREATE TABLE IF NOT EXISTS professional_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id        UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  plan_id                UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status                 VARCHAR(30) NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','past_due','canceled','trialing')),
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una suscripción activa por profesional.
CREATE UNIQUE INDEX IF NOT EXISTS prof_subs_una_activa
  ON professional_subscriptions(professional_id)
  WHERE status IN ('active','trialing');

CREATE INDEX IF NOT EXISTS prof_subs_professional_idx
  ON professional_subscriptions(professional_id);

DROP TRIGGER IF EXISTS trg_prof_subs_updated_at ON professional_subscriptions;
CREATE TRIGGER trg_prof_subs_updated_at
  BEFORE UPDATE ON professional_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE professional_subscriptions ENABLE ROW LEVEL SECURITY;

-- El profesional solo ve su propia suscripción. Lo que otros ven es el
-- efecto (aparecer promocionado), no el dato de facturación.
DROP POLICY IF EXISTS "prof_subs: propietario lee" ON professional_subscriptions;
CREATE POLICY "prof_subs: propietario lee"
ON professional_subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM professional_profiles pp
    WHERE pp.id = professional_subscriptions.professional_id
      AND pp.user_id = auth.uid()
  )
);

GRANT SELECT ON professional_subscriptions TO authenticated;

-- ---------- accept_quote: usar tramos en vez del 10% fijo ----------
-- Reemplazamos SOLO el bloque de cálculo. El resto de la función se mantiene
-- tal cual estaba en la migración 005.
CREATE OR REPLACE FUNCTION public.commission_for_professional(
  p_amount          NUMERIC,
  p_professional_id UUID
)
RETURNS TABLE (pct NUMERIC, fee NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_pct  NUMERIC;
  v_discount  NUMERIC := 0;
  v_final_pct NUMERIC;
BEGIN
  SELECT r.pct INTO v_base_pct FROM public.resolve_commission(p_amount) r;

  SELECT COALESCE(sp.commission_discount_points, 0) INTO v_discount
  FROM professional_subscriptions ps
  JOIN subscription_plans sp ON sp.id = ps.plan_id
  WHERE ps.professional_id = p_professional_id
    AND ps.status IN ('active','trialing')
  LIMIT 1;

  v_final_pct := GREATEST(v_base_pct - COALESCE(v_discount, 0), 0);

  pct := v_final_pct;
  fee := ROUND(p_amount * v_final_pct / 100, 2);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.commission_for_professional IS
  'Comisión final: tramo por importe menos el descuento del plan del profesional. El resultado se congela en projects.platform_commission_pct.';

-- Redefinición completa de accept_quote(). Idéntica a la migración 005 salvo
-- el paso 7, que ahora resuelve la comisión por tramos en lugar del 10% fijo.
CREATE OR REPLACE FUNCTION public.accept_quote(p_quote_id UUID)
RETURNS SETOF projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_lead leads%ROWTYPE;
  v_project projects%ROWTYPE;
  v_commission_pct NUMERIC(5,2);
  v_commission_amount NUMERIC(10,2);
  v_professional_receives NUMERIC(10,2);
BEGIN
  -- 1. Lock and validate quote
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Presupuesto no encontrado' USING HINT = 'quote_not_found';
  END IF;

  -- 2. Lock and validate lead
  SELECT * INTO v_lead FROM leads WHERE id = v_quote.lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada' USING HINT = 'lead_not_found';
  END IF;

  -- 3. Validate client owns the lead
  IF v_lead.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'No puedes aceptar presupuestos de otra solicitud'
      USING HINT = 'not_lead_owner';
  END IF;

  -- 4. Validate lead state
  IF v_lead.status NOT IN ('activo', 'en_negociacion') THEN
    RAISE EXCEPTION 'La solicitud ya no admite presupuestos'
      USING HINT = 'lead_not_available';
  END IF;

  -- 5. Validate quote state
  IF v_quote.status NOT IN ('enviado', 'visto') THEN
    RAISE EXCEPTION 'Este presupuesto no se puede aceptar'
      USING HINT = 'quote_not_acceptable';
  END IF;

  -- 6. Idempotency
  SELECT * INTO v_project FROM projects WHERE quote_id = p_quote_id;
  IF FOUND THEN
    RETURN NEXT v_project;
    RETURN;
  END IF;

  -- 7. Comisión por tramos, con descuento del plan del profesional.
  --    El pct resultante se congela en el proyecto: cambiar las tarifas más
  --    adelante NO puede alterar este proyecto.
  SELECT c.pct, c.fee
    INTO v_commission_pct, v_commission_amount
  FROM public.commission_for_professional(v_quote.amount, v_quote.professional_id) c;

  v_professional_receives := v_quote.amount - v_commission_amount;

  -- 8. Accept the chosen quote
  UPDATE quotes
  SET status = 'aceptado',
      accepted_at = NOW(),
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = p_quote_id;

  -- 9. Reject other pending quotes for the same lead
  UPDATE quotes
  SET status = 'rechazado',
      rejected_at = NOW(),
      rejection_reason = COALESCE(rejection_reason, 'No seleccionado')
  WHERE lead_id = v_quote.lead_id
    AND id <> p_quote_id
    AND status IN ('enviado', 'visto');

  -- 10. Update lead
  UPDATE leads
  SET status = 'asignado',
      assigned_professional_id = v_quote.professional_id,
      closed_at = NOW()
  WHERE id = v_quote.lead_id;

  -- 11. Create project
  -- platform_commission_amount y professional_receives son GENERATED:
  -- las calcula Postgres, no se pueden escribir.
  INSERT INTO projects (
    lead_id, quote_id, client_id, professional_id, category_id,
    title, description, agreed_price, currency,
    platform_commission_pct,
    status, start_date, expected_end_date
  )
  VALUES (
    v_lead.id, v_quote.id, v_lead.client_id, v_quote.professional_id, v_lead.category_id,
    v_lead.title, v_lead.description, v_quote.amount, v_quote.currency,
    v_commission_pct,
    'pendiente', CURRENT_DATE,
    CASE WHEN v_quote.delivery_days IS NULL THEN NULL
         ELSE CURRENT_DATE + v_quote.delivery_days
    END
  )
  RETURNING * INTO v_project;

  -- 12. Notify professional
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT
    pp.user_id,
    'quote_accepted',
    'Presupuesto aceptado',
    'Tu presupuesto ha sido aceptado. Ya puedes acceder al proyecto.',
    v_project.id
  FROM professional_profiles pp
  WHERE pp.id = v_quote.professional_id;

  -- 13. Return full project row
  RETURN NEXT v_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_quote(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_commission(NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_for_professional(NUMERIC, UUID) TO authenticated;
