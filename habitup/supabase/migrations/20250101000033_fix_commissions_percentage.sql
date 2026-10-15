-- =====================================================
-- MIGRATION 033: Rellenar commissions.percentage
--
-- BUG REAL, NO SOLO DEL SEED
--   El trigger que crea la comision al completarse un pago no rellena
--   `commissions.percentage`, que es NOT NULL. Resultado: SQLSTATE 23502 y
--   el pago se cae. Con datos reales pasaria exactamente igual.
--
--   `percentage` es una columna heredada del esquema antiguo; el dato vive
--   ahora en `platform_commission_pct`. En vez de reescribir el trigger
--   original (que no controlamos del todo), rellenamos el hueco justo antes
--   de insertar.
--
-- Es defensivo: si algun dia el trigger original empieza a rellenar
-- `percentage`, este no lo pisa (solo actua cuando viene NULL).
-- =====================================================

CREATE OR REPLACE FUNCTION public.fill_commission_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct NUMERIC;
BEGIN
  IF NEW.percentage IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) El propio registro puede traerlo ya.
  v_pct := NEW.platform_commission_pct;

  -- 2) Si no, se toma del pago que origina la comision.
  IF v_pct IS NULL AND NEW.payment_id IS NOT NULL THEN
    SELECT p.platform_commission_pct INTO v_pct
    FROM payments p WHERE p.id = NEW.payment_id;
  END IF;

  -- 3) Y si tampoco, del proyecto.
  IF v_pct IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT pr.platform_commission_pct INTO v_pct
    FROM projects pr WHERE pr.id = NEW.project_id;
  END IF;

  -- 4) Ultimo recurso: derivarlo del importe, o 10% historico.
  IF v_pct IS NULL AND NEW.amount IS NOT NULL AND NEW.amount > 0 THEN
    SELECT ROUND(NEW.amount * 100 / NULLIF(pr.agreed_price, 0), 2) INTO v_pct
    FROM projects pr WHERE pr.id = NEW.project_id;
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

COMMENT ON FUNCTION public.fill_commission_percentage IS
  'Rellena commissions.percentage (NOT NULL, columna heredada) que el trigger de creacion de comisiones deja vacia. Sin esto, completar un pago falla con 23502.';
