-- =====================================================
-- MIGRATION 015: Stripe Connect account status
--
-- Añade columna stripe_account_status a
-- professional_profiles para tracking granular del
-- estado de onboarding y cuenta Stripe.
--
-- Valores:
--   not_created  → nunca inició onboarding
--   pending      → cuenta creada, onboarding incompleto
--   active       → cargos y pagos habilitados
--   restricted   → requisitos pendientes o pasados
--   disabled     --> cuenta deshabilitada permanentemente
-- =====================================================

ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT NOT NULL DEFAULT 'not_created'
  CHECK (stripe_account_status IN ('not_created', 'pending', 'active', 'restricted', 'disabled'));

COMMENT ON COLUMN professional_profiles.stripe_account_status
  IS 'Estado granular de la cuenta Stripe Connect: not_created, pending, active, restricted, disabled';

-- Sincronizar registros existentes con stripe_account_enabled
UPDATE professional_profiles
SET stripe_account_status = 'active'
WHERE stripe_account_id IS NOT NULL
  AND stripe_account_enabled = TRUE
  AND stripe_account_status = 'not_created';

UPDATE professional_profiles
SET stripe_account_status = 'pending'
WHERE stripe_account_id IS NOT NULL
  AND stripe_account_enabled = FALSE
  AND stripe_account_status = 'not_created';
