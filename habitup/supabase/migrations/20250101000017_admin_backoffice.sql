-- =====================================================
-- MIGRATION 017: Admin backoffice infrastructure
--
-- 1. admin_audit_log table
-- 2. is_hidden column on reviews (moderation)
-- 3. Admin RLS policies for all tables
-- 4. log_admin_action() function for audit trail
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. ADMIN AUDIT LOG
--    Trazabilidad de todas las acciones de admin
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  details         JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

COMMENT ON TABLE admin_audit_log IS 'Auditoría de todas las acciones realizadas por administradores';

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log: lectura admin" ON admin_audit_log;
CREATE POLICY "admin_audit_log: lectura admin" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

DROP POLICY IF EXISTS "admin_audit_log: escritura service_role" ON admin_audit_log;
CREATE POLICY "admin_audit_log: escritura service_role" ON admin_audit_log
  FOR INSERT WITH CHECK (false);

-- ═══════════════════════════════════════════════════
-- 2. FUNCTION: log_admin_action
--    Se llama desde el backoffice para registrar
--    cada acción con contexto
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_ip TEXT;
BEGIN
  v_ip := NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', '');

  INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details, ip_address)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details, v_ip)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════
-- 3. REVIEWS: add is_hidden for moderation
-- ═══════════════════════════════════════════════════

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN reviews.is_hidden IS 'Oculta la reseña del público (moderación de admin)';

-- ═══════════════════════════════════════════════════
-- 4. ADMIN RLS POLICIES
-- ═══════════════════════════════════════════════════

-- ── 4a. users ──────────────────────────────────────
-- Admin puede leer todos los usuarios (cada uno ya se lee a sí mismo)
DROP POLICY IF EXISTS "users: lectura admin" ON users;
CREATE POLICY "users: lectura admin" ON users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4b. leads ──────────────────────────────────────
DROP POLICY IF EXISTS "leads: lectura admin" ON leads;
CREATE POLICY "leads: lectura admin" ON leads
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

DROP POLICY IF EXISTS "leads: actualizacion admin" ON leads;
CREATE POLICY "leads: actualizacion admin" ON leads
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4c. quotes ─────────────────────────────────────
DROP POLICY IF EXISTS "quotes: lectura admin" ON quotes;
CREATE POLICY "quotes: lectura admin" ON quotes
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4d. projects ───────────────────────────────────
DROP POLICY IF EXISTS "projects: lectura admin" ON projects;
CREATE POLICY "projects: lectura admin" ON projects
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

DROP POLICY IF EXISTS "projects: actualizacion admin" ON projects;
CREATE POLICY "projects: actualizacion admin" ON projects
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4e. reviews ────────────────────────────────────
-- Reemplaza la policy pública: oculta las reseñas marcadas como is_hidden
DROP POLICY IF EXISTS "reviews: lectura publica" ON reviews;
CREATE POLICY "reviews: lectura publica" ON reviews
  FOR SELECT USING (
    is_hidden = FALSE
    OR auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

DROP POLICY IF EXISTS "reviews: administracion admin" ON reviews;
CREATE POLICY "reviews: administracion admin" ON reviews
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4f. categories ─────────────────────────────────
-- Admin puede gestionar categorías (insert, update, delete)
DROP POLICY IF EXISTS "categories: administracion admin" ON categories;
CREATE POLICY "categories: administracion admin" ON categories
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4g. notifications ──────────────────────────────
-- Admin puede ver todas las notificaciones del sistema
DROP POLICY IF EXISTS "notifications: propias" ON notifications;
CREATE POLICY "notifications: propias" ON notifications
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- ── 4h. admin_audit_log ────────────────────────────
-- (ya creada arriba)

-- ═══════════════════════════════════════════════════
-- 5. GRANTS
-- ═══════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════
-- 6. NOTA: triggers existentes que ya soportan admin
--    - verification_documents: admin lectura + update status
--    - payments: admin lectura
--    - commissions: admin lectura
--    - storage.verification-documents: admin lectura + delete
--    Estos ya fueron implementados en migraciones 014, 016 y 011
-- ═══════════════════════════════════════════════════

