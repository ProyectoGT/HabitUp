-- =====================================================
-- MIGRATION 004: Row-Level Security policies
--
-- ⚠️  CONOCIDO: `professional_profiles` expone `stripe_account_id`
--     y `nif_cif` a cualquier usuario autenticado via SELECT.
--     La vista pública `professionals_with_categories` (migración 006)
--     solo expone columnas seguras — la app debe consultar la vista,
--     no la tabla directamente. RLS no permite ocultar columnas;
--     para eso está la vista.
-- ⚠️  CONOCIDO: `messages` no tiene `updated_at`, lo que puede ser
--     inconsistente con los modelos TypeScript. Pendiente de decidir.
-- =====================================================

-- Habilitar RLS en todas las tablas (idempotente)
ALTER TABLE IF EXISTS users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS professional_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolio_items         ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════
-- 1. users
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "users: lectura propia" ON users;
CREATE POLICY "users: lectura propia" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users: actualizacion propia" ON users;
CREATE POLICY "users: actualizacion propia" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════
-- 2. professional_profiles
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "professional_profiles: lectura publica" ON professional_profiles;
CREATE POLICY "professional_profiles: lectura publica" ON professional_profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "professional_profiles: insercion propia" ON professional_profiles;
CREATE POLICY "professional_profiles: insercion propia" ON professional_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "professional_profiles: actualizacion propia" ON professional_profiles;
CREATE POLICY "professional_profiles: actualizacion propia" ON professional_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- 3. professional_categories
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "professional_categories: lectura publica" ON professional_categories;
CREATE POLICY "professional_categories: lectura publica" ON professional_categories
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "professional_categories: gestion propio" ON professional_categories;
CREATE POLICY "professional_categories: gestion propio" ON professional_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE id = professional_categories.professional_id
        AND user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- 4. categories (reference data — public read)
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "categories: lectura publica" ON categories;
CREATE POLICY "categories: lectura publica" ON categories
  FOR SELECT USING (TRUE);

-- ═══════════════════════════════════════════════════
-- 5. leads
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "leads: clientes ven propios" ON leads;
CREATE POLICY "leads: clientes ven propios" ON leads
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "leads: profesionales ven activos" ON leads;
CREATE POLICY "leads: profesionales ven activos" ON leads
  FOR SELECT USING (
    status = 'activo'
    AND EXISTS (
      SELECT 1 FROM professional_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leads: clientes crean" ON leads;
CREATE POLICY "leads: clientes crean" ON leads
  FOR INSERT WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "leads: clientes actualizan propios" ON leads;
CREATE POLICY "leads: clientes actualizan propios" ON leads
  FOR UPDATE USING (client_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- 6. quotes
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "quotes: clientes ven de sus leads" ON quotes;
CREATE POLICY "quotes: clientes ven de sus leads" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads WHERE id = quotes.lead_id AND client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quotes: profesionales ven propios" ON quotes;
CREATE POLICY "quotes: profesionales ven propios" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professional_profiles WHERE id = quotes.professional_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quotes: profesionales envian" ON quotes;
CREATE POLICY "quotes: profesionales envian" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professional_profiles WHERE id = quotes.professional_id AND user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- 7. projects
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "projects: participantes ven" ON projects;
CREATE POLICY "projects: participantes ven" ON projects
  FOR SELECT USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM professional_profiles WHERE id = projects.professional_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects: participantes actualizan" ON projects;
CREATE POLICY "projects: participantes actualizan" ON projects
  FOR UPDATE USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM professional_profiles WHERE id = projects.professional_id AND user_id = auth.uid()
    )
  );

-- Fallback insert policy. Ruta recomendada: accept_quote() RPC.
DROP POLICY IF EXISTS "projects: cliente crea al aceptar quote" ON projects;
CREATE POLICY "projects: cliente crea al aceptar quote"
ON projects FOR INSERT WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM quotes q
    JOIN leads l ON l.id = q.lead_id
    WHERE q.id = quote_id
      AND l.id = lead_id
      AND l.client_id = auth.uid()
      AND q.professional_id = professional_id
      AND q.status = 'aceptado'
  )
);

-- ═══════════════════════════════════════════════════
-- 8. messages
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "messages: participantes del proyecto" ON messages;
DROP POLICY IF EXISTS "messages: enviar como uno mismo" ON messages;
DROP POLICY IF EXISTS "messages: participantes leen mensajes del proyecto" ON messages;
DROP POLICY IF EXISTS "messages: participantes envian mensajes" ON messages;

CREATE POLICY "messages: participantes leen mensajes del proyecto"
ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM projects p
    LEFT JOIN professional_profiles pp ON pp.id = p.professional_id
    WHERE p.id = messages.project_id
      AND (p.client_id = auth.uid() OR pp.user_id = auth.uid())
      AND messages.deleted_at IS NULL
  )
);

CREATE POLICY "messages: participantes envian mensajes"
ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM projects p
    LEFT JOIN professional_profiles pp ON pp.id = p.professional_id
    WHERE p.id = messages.project_id
      AND (
        (p.client_id = auth.uid() AND recipient_id = pp.user_id)
        OR (pp.user_id = auth.uid() AND recipient_id = p.client_id)
      )
  )
);

-- ═══════════════════════════════════════════════════
-- 9. reviews
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "reviews: lectura publica" ON reviews;
CREATE POLICY "reviews: lectura publica" ON reviews
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "reviews: cliente del proyecto crea" ON reviews;
CREATE POLICY "reviews: cliente del proyecto crea" ON reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE id = reviews.project_id AND client_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- 10. notifications
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "notifications: propias" ON notifications;
CREATE POLICY "notifications: propias" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════
-- 11. portfolio_items
-- ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS "portfolio_items: lectura publica" ON portfolio_items;
CREATE POLICY "portfolio_items: lectura publica" ON portfolio_items
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "portfolio_items: gestion propio" ON portfolio_items;
CREATE POLICY "portfolio_items: gestion propio" ON portfolio_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM professional_profiles WHERE id = portfolio_items.professional_id AND user_id = auth.uid()
    )
  );
