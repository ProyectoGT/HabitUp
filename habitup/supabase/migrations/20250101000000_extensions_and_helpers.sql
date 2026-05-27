-- =====================================================
-- MIGRATION 000: Extensions & helper functions
-- Idempotent: uses IF NOT EXISTS / CREATE OR REPLACE.
-- =====================================================

-- Extensions required by the schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════
-- Helper: auto-update updated_at
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
