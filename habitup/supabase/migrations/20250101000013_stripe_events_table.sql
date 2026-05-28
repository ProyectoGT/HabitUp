-- =====================================================
-- MIGRATION 013: Stripe webhook idempotency
--
-- Crea la tabla stripe_events para tracking deduplicado
-- de eventos webhook de Stripe. Cada evento tiene un
-- stripe_event_id único que previene procesamiento doble
-- cuando Stripe reintenta entregas fallidas.
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'processed', 'failed', 'skipped')),
  processed_at    TIMESTAMPTZ,
  payload         JSONB,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON stripe_events(status);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Sin políticas RLS: solo service_role (usada por la Edge Function)
-- y el dueño de la tabla deben acceder. service_role bypass RLS.

COMMENT ON TABLE stripe_events IS 'Registro de eventos webhook de Stripe para idempotencia';
COMMENT ON COLUMN stripe_events.stripe_event_id IS 'ID único del evento en Stripe (evt_xxx)';
COMMENT ON COLUMN stripe_events.status IS 'Estado interno: processing, processed, failed, skipped';
COMMENT ON COLUMN stripe_events.payload IS 'Payload JSON completo enviado por Stripe (debugging)';
COMMENT ON COLUMN stripe_events.error IS 'Mensaje de error si el procesamiento falló';
