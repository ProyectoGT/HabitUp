-- =====================================================
-- MIGRATION 032: Corregir accept_quote (columnas GENERATED)
--
-- La migracion 027 dejo accept_quote escribiendo en
-- platform_commission_amount y professional_receives. En esta base ambas son
-- columnas GENERATED, calculadas por Postgres a partir de agreed_price y
-- platform_commission_pct, asi que cualquier intento de escribirlas falla con
-- SQLSTATE 428C9 y el cliente no puede aceptar presupuestos.
--
-- Nota: la 027 ya estaba aplicada cuando se detecto, por eso hace falta esta
-- migracion aparte en vez de corregir aquella.
-- =====================================================

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
