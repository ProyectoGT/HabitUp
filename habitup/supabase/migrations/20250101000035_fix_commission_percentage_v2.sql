-- =====================================================
-- MIGRATION 035: Rellenar commissions.percentage (version robusta)
--
-- La 033 referenciaba NEW.platform_commission_pct, columna que NO existe en
-- `commissions`, asi que el trigger petaba con 42703.
--
-- Aqui se leen los campos a traves de to_jsonb(NEW): si un campo no existe,
-- devuelve NULL en vez de reventar. Asi el trigger funciona sea cual sea la
-- forma exacta de la tabla.
-- =====================================================

CREATE OR REPLACE FUNCTION public.fill_commission_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row        JSONB;
  v_pct        NUMERIC;
  v_payment_id UUID;
  v_project_id UUID;
  v_amount     NUMERIC;
BEGIN
  IF NEW.percentage IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Lectura tolerante: los campos que no existan salen NULL, no dan error.
  v_row        := to_jsonb(NEW);
  v_pct        := NULLIF(v_row->>'platform_commission_pct', '')::NUMERIC;
  v_payment_id := NULLIF(v_row->>'payment_id', '')::UUID;
  v_project_id := NULLIF(v_row->>'project_id', '')::UUID;
  v_amount     := NULLIF(v_row->>'amount', '')::NUMERIC;

  -- 1) Del pago que origina la comision.
  IF v_pct IS NULL AND v_payment_id IS NOT NULL THEN
    SELECT p.platform_commission_pct INTO v_pct
    FROM payments p WHERE p.id = v_payment_id;
  END IF;

  -- 2) Del proyecto.
  IF v_pct IS NULL AND v_project_id IS NOT NULL THEN
    SELECT pr.platform_commission_pct INTO v_pct
    FROM projects pr WHERE pr.id = v_project_id;
  END IF;

  -- 3) Derivado del importe frente al precio acordado.
  IF v_pct IS NULL AND v_project_id IS NOT NULL AND COALESCE(v_amount, 0) > 0 THEN
    SELECT ROUND(v_amount * 100 / NULLIF(pr.agreed_price, 0), 2) INTO v_pct
    FROM projects pr WHERE pr.id = v_project_id;
  END IF;

  NEW.percentage := COALESCE(v_pct, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_commission_percentage ON commissions;
CREATE TRIGGER trg_fill_commission_percentage
  BEFORE INSERT ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_commission_percentage();
