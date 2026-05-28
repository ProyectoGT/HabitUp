-- =====================================================
-- MIGRATION 008: Quote accept guarantees
--
-- Anade garantias a nivel DB para el flujo accept_quote:
--   1. UNIQUE index on projects(quote_id) — evita que un
--      mismo quote genere multiples projects por error
--      (el RPC accept_quote ya es idempotente; esto es
--      un safety net a nivel DB).
-- =====================================================

-- ═══════════════════════════════════════════════════
-- Unique index on projects.quote_id
--
-- Permite NULLs (no todos los projects vienen de un
-- quote) pero asegura que cualquier quote_id no nulo
-- sea unico.
-- ═══════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_quote_id
  ON projects(quote_id)
  WHERE quote_id IS NOT NULL;
