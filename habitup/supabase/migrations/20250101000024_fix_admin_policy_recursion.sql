-- =====================================================
-- MIGRATION 024: Fix infinite recursion in admin RLS policies (42P17)
-- Las policies admin de 014/017 usaban
--   auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
-- Ese subquery sobre users dispara las policies de users, que a su vez
-- contienen la misma policy admin -> recursion infinita, y como el resto
-- de tablas tambien subconsultan users, TODA la API REST devolvia 500.
-- Se reescriben usando public.current_user_is_admin() (SECURITY DEFINER,
-- creada en 020), que lee users sin evaluar RLS y rompe el ciclo.
-- =====================================================

-- ── users ───────────────────────────────────────────
DROP POLICY IF EXISTS "users: lectura admin" ON users;
CREATE POLICY "users: lectura admin" ON users
  FOR SELECT USING (public.current_user_is_admin());

-- ── leads ───────────────────────────────────────────
DROP POLICY IF EXISTS "leads: lectura admin" ON leads;
CREATE POLICY "leads: lectura admin" ON leads
  FOR SELECT USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "leads: actualizacion admin" ON leads;
CREATE POLICY "leads: actualizacion admin" ON leads
  FOR UPDATE USING (public.current_user_is_admin());

-- ── quotes ──────────────────────────────────────────
DROP POLICY IF EXISTS "quotes: lectura admin" ON quotes;
CREATE POLICY "quotes: lectura admin" ON quotes
  FOR SELECT USING (public.current_user_is_admin());

-- ── projects ────────────────────────────────────────
DROP POLICY IF EXISTS "projects: lectura admin" ON projects;
CREATE POLICY "projects: lectura admin" ON projects
  FOR SELECT USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "projects: actualizacion admin" ON projects;
CREATE POLICY "projects: actualizacion admin" ON projects
  FOR UPDATE USING (public.current_user_is_admin());

-- ── reviews ─────────────────────────────────────────
DROP POLICY IF EXISTS "reviews: lectura publica" ON reviews;
CREATE POLICY "reviews: lectura publica" ON reviews
  FOR SELECT USING (
    is_hidden = FALSE
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "reviews: administracion admin" ON reviews;
CREATE POLICY "reviews: administracion admin" ON reviews
  FOR UPDATE USING (public.current_user_is_admin());

-- ── categories ──────────────────────────────────────
DROP POLICY IF EXISTS "categories: administracion admin" ON categories;
CREATE POLICY "categories: administracion admin" ON categories
  FOR ALL USING (public.current_user_is_admin());

-- ── notifications ───────────────────────────────────
DROP POLICY IF EXISTS "notifications: propias" ON notifications;
CREATE POLICY "notifications: propias" ON notifications
  FOR ALL USING (
    user_id = auth.uid()
    OR public.current_user_is_admin()
  );

-- ── payments ────────────────────────────────────────
DROP POLICY IF EXISTS "payments: lectura participantes" ON payments;
CREATE POLICY "payments: lectura participantes" ON payments
  FOR SELECT USING (
    client_id = auth.uid()
    OR professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );

-- ── commissions ─────────────────────────────────────
DROP POLICY IF EXISTS "commissions: lectura participantes" ON commissions;
CREATE POLICY "commissions: lectura participantes" ON commissions
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid()
    )
    OR public.current_user_is_admin()
  );
