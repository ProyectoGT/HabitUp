-- =====================================================
-- MIGRATION 012: Push notification hardening
-- =====================================================
--
-- Changes:
--   1. Add push_error tracking columns to users.
--   2. Replace public anon-key auth with a shared-secret
--      between the DB trigger and the Edge Function.
--   3. Trigger to clear invalid tokens upon fatal errors.
--
-- Deployment:
--   After applying, set these database-level settings:
--     ALTER DATABASE postgres SET app.settings.push_secret_key
--       TO '<generated-secret>';
--   And add the same secret to the Edge Function:
--     supabase secrets set PUSH_SECRET_KEY=<generated-secret>
--   Then reload config or run:  select set_config(...)
-- =====================================================

-- ═════════════════════════════════════════════════════════
-- 1. Push-error columns on users
-- ═════════════════════════════════════════════════════════
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_push_error TEXT,
  ADD COLUMN IF NOT EXISTS last_push_error_at TIMESTAMPTZ;

-- ═════════════════════════════════════════════════════════
-- 2. Replace call_send_push — uses shared secret, not anon key
-- ═════════════════════════════════════════════════════════
-- The old version sent the public anon key as Authorization,
-- which provided zero real auth since the anon key is public.
-- The new version uses a secret key stored in both:
--   app.settings.push_secret_key  (DB side)
--   PUSH_SECRET_KEY               (Edge Function secret)
-- =====================================================

CREATE OR REPLACE FUNCTION public.call_send_push(
  p_user_id  UUID,
  p_type     TEXT,
  p_title    TEXT,
  p_body     TEXT,
  p_data     JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_push_secret TEXT := current_setting('app.settings.push_secret_key', true);
  v_edge_url TEXT := current_setting('app.settings.edge_push_url', true);
BEGIN
  SELECT expo_push_token INTO v_token FROM users WHERE id = p_user_id;

  -- Silently skip if there is no token, no secret configured,
  -- or the URL is missing (expected during local dev).
  IF v_token IS NULL OR v_push_secret IS NULL OR v_edge_url IS NULL THEN
    RETURN;
  END IF;

  -- Track previous errors — if the last push failed fatally,
  -- skip retrying until the app re-registers a fresh token.
  -- (The app clears last_push_error upon successful registration.)
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND last_push_error = 'ExpoInvalidToken'
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     => v_edge_url,
    headers => jsonb_build_object(
      'Content-Type',   'application/json',
      'X-Push-Secret',  v_push_secret
    ),
    body    => jsonb_build_object(
      'token',        v_token,
      'title',        p_title,
      'body',         p_body,
      'data',         p_data || jsonb_build_object('type', p_type, 'userId', p_user_id)
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ═════════════════════════════════════════════════════════
-- 3. Update existing push triggers to use the new function
--    (the function name is the same, so CREATE OR REPLACE
--     above already updates all callers automatically)
-- ═════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════
-- 4. Function invoked by the Edge Function to mark a
--    token as invalid (bypasses RLS via SECURITY DEFINER).
-- ═════════════════════════════════════════════════════════
-- The Edge Function calls this after Expo reports an
-- invalid token, so future triggers skip it.
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_push_error(
  p_user_id  UUID,
  p_error    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET last_push_error    = p_error,
      last_push_error_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- ═════════════════════════════════════════════════════════
-- 5. Function called by the app upon successful token
--    registration to clear any prior error flag.
-- ═════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.clear_push_error()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET last_push_error    = NULL,
      last_push_error_at = NULL
  WHERE id = auth.uid();
END;
$$;
