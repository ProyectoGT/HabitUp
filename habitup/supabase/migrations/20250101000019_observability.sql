-- =====================================================
-- MIGRATION 019: Observability — error_log & event_log
--
-- Proposito: Capturar errores y eventos de negocio
-- para depuracion y monitorizacion en beta cerrada.
--
-- Filosofia:
--   - error_log: errores no recuperables de la app
--     y Edge Functions (catch blocks, timeout, etc.)
--   - event_log: eventos de negocio importantes
--     (signup, lead_created, quote_sent, etc.)
--   - RLS: solo service_role y admins pueden leer/escribir.
--     Usuarios comunes no ven nada.
--   - Sin PII: no se almacenan tokens, passwords,
--     mensajes ni datos personales.
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. error_log
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'ERROR',
  message TEXT NOT NULL,
  code TEXT,
  stack TEXT,
  context JSONB,
  correlation_id TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.error_log IS
  'Non-recoverable errors from app and Edge Functions. No PII.';

CREATE INDEX IF NOT EXISTS idx_error_log_created_at
  ON public.error_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_log_level
  ON public.error_log(level);

CREATE INDEX IF NOT EXISTS idx_error_log_source
  ON public.error_log(source);

CREATE INDEX IF NOT EXISTS idx_error_log_user_id
  ON public.error_log(user_id);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- Default-deny: only service_role (bypasses RLS) can access.
-- Authenticated/anonymous users see and write nothing.
DROP POLICY IF EXISTS "error_log_admin_access" ON public.error_log;
CREATE POLICY "error_log_admin_access"
  ON public.error_log
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (SELECT user_type FROM public.users WHERE id = auth.uid()) = 'admin'
  );

COMMENT ON POLICY "error_log_admin_access" ON public.error_log IS
  'Only service_role and admin users can read error_log. No INSERT/UPDATE/DELETE for end users.';

-- ═══════════════════════════════════════════════════
-- 2. event_log
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB,
  correlation_id TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.event_log IS
  'Business events for observability (signup, lead_created, etc.). No PII.';

CREATE INDEX IF NOT EXISTS idx_event_log_created_at
  ON public.event_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_log_event_name
  ON public.event_log(event_name);

CREATE INDEX IF NOT EXISTS idx_event_log_user_id
  ON public.event_log(user_id);

CREATE INDEX IF NOT EXISTS idx_event_log_correlation_id
  ON public.event_log(correlation_id);

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_log_admin_access" ON public.event_log;
CREATE POLICY "event_log_admin_access"
  ON public.event_log
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (SELECT user_type FROM public.users WHERE id = auth.uid()) = 'admin'
  );

COMMENT ON POLICY "event_log_admin_access" ON public.event_log IS
  'Only service_role and admin users can read event_log. No INSERT/UPDATE/DELETE for end users.';
