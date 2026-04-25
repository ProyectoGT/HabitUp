-- =====================================================
-- HABITUP — Esquema PostgreSQL para Supabase
-- Marketplace de Profesionales de Reformas
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- HELPER: updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. USUARIOS
-- Espejo de auth.users con datos de perfil.
-- Se crea automáticamente via trigger al registrarse.
-- =====================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  user_type   TEXT NOT NULL CHECK (user_type IN ('cliente', 'professional', 'admin')),
  bio         TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_user_type  ON users(user_type);
CREATE INDEX idx_users_is_verified ON users(is_verified);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: crear fila en users cuando alguien se registra en auth.users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- =====================================================
-- 2. PERFILES DE PROFESIONALES (1:1 con users)
-- =====================================================

CREATE TABLE professional_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name            TEXT,
  company_type            TEXT CHECK (company_type IN ('autonomo', 'empresa')),
  nif_cif                 TEXT UNIQUE,
  nif_cif_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  nif_cif_verified_at     TIMESTAMPTZ,
  description             TEXT,
  experience_years        INT,
  avg_rating              NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (avg_rating BETWEEN 0 AND 5),
  total_reviews           INT NOT NULL DEFAULT 0,
  total_projects_completed INT NOT NULL DEFAULT 0,
  response_time_hours     INT,

  -- Localización (PostGIS geography point)
  location_city           TEXT,
  location_region         TEXT,
  location_country        TEXT NOT NULL DEFAULT 'España',
  location                GEOGRAPHY(Point, 4326),
  service_radius_km       INT NOT NULL DEFAULT 50,

  -- Verificación
  documents_verified      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Stripe Connect
  stripe_account_id       TEXT UNIQUE,
  stripe_account_enabled  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Redes sociales
  website_url             TEXT,
  instagram_url           TEXT,
  facebook_url            TEXT,
  linkedin_url            TEXT,

  -- Configuración
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_new_leads       BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate             NUMERIC(10,2),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professional_profiles_user_id  ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_is_active ON professional_profiles(is_active);
CREATE INDEX idx_professional_profiles_location  ON professional_profiles(location_city, location_region);
CREATE INDEX idx_professional_profiles_rating    ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_profiles_geom      ON professional_profiles USING GIST(location);

CREATE TRIGGER trg_professional_profiles_updated_at
BEFORE UPDATE ON professional_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 3. CATEGORÍAS (especialidades predefinidas)
-- =====================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (name, slug, description) VALUES
  ('Fontanería',    'fontaneria',    'Tuberías, grifos, desagües'),
  ('Electricidad',  'electricidad',  'Instalaciones eléctricas'),
  ('Carpintería',   'carpinteria',   'Madera, muebles, puertas'),
  ('Pintura',       'pintura',       'Pintura interior y exterior'),
  ('Albañilería',   'albanileria',   'Construcción, muros, suelos'),
  ('Climatización', 'climatizacion', 'Aire acondicionado, calefacción'),
  ('Techumbre',     'techumbre',     'Tejados y cubiertas'),
  ('Cristalería',   'cristaleria',   'Cristales, espejos, mamparas'),
  ('Cerrajería',    'cerrajeria',    'Cerraduras, puertas de seguridad'),
  ('Jardinería',    'jardineria',    'Jardines y paisajismo');

-- =====================================================
-- 4. PROFESIONALES ↔ CATEGORÍAS (N:M)
-- =====================================================

CREATE TABLE professional_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  years_in_category INT,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, category_id)
);

CREATE INDEX idx_professional_categories_professional ON professional_categories(professional_id);
CREATE INDEX idx_professional_categories_category     ON professional_categories(category_id);

-- =====================================================
-- 5. PORTFOLIO (trabajos anteriores del profesional)
-- =====================================================

CREATE TABLE portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id),
  title           TEXT NOT NULL,
  description     TEXT,
  before_photo_url TEXT,
  after_photo_url  TEXT,
  additional_photos JSONB DEFAULT '[]',
  completion_date  DATE,
  client_location  TEXT,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  views_count      INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_items_professional ON portfolio_items(professional_id);
CREATE INDEX idx_portfolio_items_is_featured  ON portfolio_items(is_featured);

CREATE TRIGGER trg_portfolio_items_updated_at
BEFORE UPDATE ON portfolio_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 6. LEADS (solicitudes de presupuesto del cliente)
-- =====================================================

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  budget_min      NUMERIC(10,2),
  budget_max      NUMERIC(10,2),
  location_city   TEXT,
  location        GEOGRAPHY(Point, 4326),
  preferred_start_date DATE,
  urgency         TEXT NOT NULL DEFAULT 'media' CHECK (urgency IN ('baja', 'media', 'alta')),
  photos          JSONB DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'activo'
                    CHECK (status IN ('activo', 'en_negociacion', 'asignado', 'cerrado', 'cancelado')),
  assigned_professional_id UUID REFERENCES professional_profiles(id),
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  featured_until  TIMESTAMPTZ,
  views_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_leads_client_id    ON leads(client_id);
CREATE INDEX idx_leads_category_id  ON leads(category_id);
CREATE INDEX idx_leads_status       ON leads(status);
CREATE INDEX idx_leads_created_at   ON leads(created_at DESC);
CREATE INDEX idx_leads_location     ON leads USING GIST(location);

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 7. QUOTES (presupuestos enviados por profesionales)
-- =====================================================

CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  description     TEXT,
  delivery_days   INT,
  includes_materials BOOLEAN NOT NULL DEFAULT TRUE,
  payment_terms   TEXT,
  status          TEXT NOT NULL DEFAULT 'enviado'
                    CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado')),
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  viewed_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, professional_id)
);

CREATE INDEX idx_quotes_lead_id         ON quotes(lead_id);
CREATE INDEX idx_quotes_professional_id ON quotes(professional_id);
CREATE INDEX idx_quotes_status          ON quotes(status);

CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 8. PROJECTS (contrato cerrado entre cliente y profesional)
-- =====================================================

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  quote_id        UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id),
  title           TEXT NOT NULL,
  description     TEXT,
  agreed_price    NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  start_date      DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente', 'en_curso', 'pausado', 'completado', 'cancelado')),

  -- Comisión (columnas generadas)
  platform_commission_pct    NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  platform_commission_amount NUMERIC(10,2) GENERATED ALWAYS AS
                               (ROUND(agreed_price * platform_commission_pct / 100, 2)) STORED,
  professional_receives      NUMERIC(10,2) GENERATED ALWAYS AS
                               (ROUND(agreed_price - agreed_price * platform_commission_pct / 100, 2)) STORED,

  payment_status  TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (payment_status IN ('pendiente', 'en_proceso', 'completado', 'fallido')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_client_id       ON projects(client_id);
CREATE INDEX idx_projects_professional_id ON projects(professional_id);
CREATE INDEX idx_projects_status          ON projects(status);
CREATE INDEX idx_projects_payment_status  ON projects(payment_status);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 9. PAYMENTS (transacciones Stripe)
-- =====================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  gross_amount    NUMERIC(10,2),
  commission_amount NUMERIC(10,2),
  professional_amount NUMERIC(10,2),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id       TEXT,
  status          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente', 'procesando', 'completado', 'fallido', 'reembolsado')),
  payment_method  TEXT,
  paid_at         TIMESTAMPTZ,
  transferred_to_professional_at TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_project_id              ON payments(project_id);
CREATE INDEX idx_payments_status                  ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent   ON payments(stripe_payment_intent_id);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 10. COMMISSIONS (registro de comisiones de la plataforma)
-- =====================================================

CREATE TABLE commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  percentage        NUMERIC(5,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente', 'transferencia_iniciada', 'completada', 'fallida')),
  stripe_transfer_id TEXT,
  transferred_at    TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_project_id ON commissions(project_id);
CREATE INDEX idx_commissions_status     ON commissions(status);

CREATE TRIGGER trg_commissions_updated_at
BEFORE UPDATE ON commissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 11. REVIEWS (reseñas verificadas, 1 por proyecto)
-- =====================================================

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  comment         TEXT,
  rating_quality  INT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_timeline INT CHECK (rating_timeline BETWEEN 1 AND 5),
  rating_value    INT CHECK (rating_value BETWEEN 1 AND 5),
  photos          JSONB DEFAULT '[]',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
  helpful_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX idx_reviews_project_id      ON reviews(project_id);
CREATE INDEX idx_reviews_rating          ON reviews(rating DESC);

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 12. MESSAGES (chat en tiempo real, por proyecto)
-- =====================================================

CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text'
                 CHECK (message_type IN ('text', 'image', 'file', 'system')),
  content      TEXT,
  attachment_url TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_project_id   ON messages(project_id);
CREATE INDEX idx_messages_sender_id    ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at   ON messages(created_at DESC);

-- =====================================================
-- 13. VERIFICATION DOCUMENTS (documentos del profesional)
-- =====================================================

CREATE TABLE verification_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  document_type   TEXT CHECK (document_type IN ('dni_cif', 'company_registration', 'insurance', 'other')),
  file_url        TEXT NOT NULL,
  file_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente', 'verificado', 'rechazado')),
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_documents_professional ON verification_documents(professional_id);
CREATE INDEX idx_verification_documents_status       ON verification_documents(status);

CREATE TRIGGER trg_verification_documents_updated_at
BEFORE UPDATE ON verification_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 14. FAVORITES (clientes guardando profesionales)
-- =====================================================

CREATE TABLE favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, professional_id)
);

CREATE INDEX idx_favorites_client_id       ON favorites(client_id);
CREATE INDEX idx_favorites_professional_id ON favorites(professional_id);

-- =====================================================
-- 15. NOTIFICATIONS (notificaciones in-app)
-- =====================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT,
  message    TEXT,
  related_id UUID,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;

-- ── users ──────────────────────────────────────────
CREATE POLICY "users: ver propio y profesionales"
ON users FOR SELECT USING (
  auth.uid() = id OR user_type IN ('professional', 'admin')
);

CREATE POLICY "users: actualizar propio"
ON users FOR UPDATE USING (auth.uid() = id);

-- ── professional_profiles ──────────────────────────
CREATE POLICY "professional_profiles: lectura pública activos"
ON professional_profiles FOR SELECT USING (is_active = TRUE OR user_id = auth.uid());

CREATE POLICY "professional_profiles: el propio profesional gestiona"
ON professional_profiles FOR ALL USING (user_id = auth.uid());

-- ── categories ─────────────────────────────────────
CREATE POLICY "categories: lectura pública"
ON categories FOR SELECT USING (is_active = TRUE);

-- ── professional_categories ────────────────────────
CREATE POLICY "professional_categories: lectura pública"
ON professional_categories FOR SELECT USING (TRUE);

CREATE POLICY "professional_categories: gestión propia"
ON professional_categories FOR ALL USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── portfolio_items ────────────────────────────────
CREATE POLICY "portfolio_items: lectura pública"
ON portfolio_items FOR SELECT USING (TRUE);

CREATE POLICY "portfolio_items: gestión propia"
ON portfolio_items FOR ALL USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── leads ──────────────────────────────────────────
-- Los leads activos son visibles para profesionales; el cliente ve los suyos siempre
CREATE POLICY "leads: clientes ven los suyos"
ON leads FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "leads: profesionales ven activos"
ON leads FOR SELECT USING (
  status = 'activo'
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'professional')
);

CREATE POLICY "leads: profesionales ven leads asignados a ellos"
ON leads FOR SELECT USING (
  assigned_professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "leads: clientes crean"
ON leads FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "leads: clientes actualizan los suyos"
ON leads FOR UPDATE USING (client_id = auth.uid());

-- ── quotes ─────────────────────────────────────────
CREATE POLICY "quotes: cliente ve quotes de sus leads"
ON quotes FOR SELECT USING (
  lead_id IN (SELECT id FROM leads WHERE client_id = auth.uid())
);

CREATE POLICY "quotes: profesional ve sus quotes"
ON quotes FOR SELECT USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "quotes: profesional crea quote"
ON quotes FOR INSERT WITH CHECK (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "quotes: profesional actualiza sus quotes"
ON quotes FOR UPDATE USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── projects ───────────────────────────────────────
CREATE POLICY "projects: cliente ve los suyos"
ON projects FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "projects: profesional ve los suyos"
ON projects FOR SELECT USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "projects: actualización por participantes"
ON projects FOR UPDATE USING (
  client_id = auth.uid()
  OR professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── payments ───────────────────────────────────────
CREATE POLICY "payments: participantes ven sus pagos"
ON payments FOR SELECT USING (
  client_id = auth.uid()
  OR professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── commissions ────────────────────────────────────
-- Solo accesible por Edge Functions (service_role); usuarios normales no ven comisiones
CREATE POLICY "commissions: sin acceso de usuario"
ON commissions FOR SELECT USING (FALSE);

-- ── reviews ────────────────────────────────────────
CREATE POLICY "reviews: lectura pública"
ON reviews FOR SELECT USING (TRUE);

CREATE POLICY "reviews: cliente crea review de su proyecto completado"
ON reviews FOR INSERT WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
      AND client_id = auth.uid()
      AND status = 'completado'
  )
);

-- ── messages ───────────────────────────────────────
CREATE POLICY "messages: participantes del proyecto"
ON messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

CREATE POLICY "messages: enviar como uno mismo"
ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ── verification_documents ─────────────────────────
CREATE POLICY "verification_documents: propio profesional"
ON verification_documents FOR SELECT USING (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "verification_documents: subir documentos"
ON verification_documents FOR INSERT WITH CHECK (
  professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- ── favorites ──────────────────────────────────────
CREATE POLICY "favorites: el propio cliente"
ON favorites FOR ALL USING (client_id = auth.uid());

-- ── notifications ──────────────────────────────────
CREATE POLICY "notifications: propio usuario"
ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: marcar como leída"
ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- FUNCIONES Y TRIGGERS DE NEGOCIO
-- =====================================================

-- Actualizar avg_rating al insertar/borrar una review
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professional_profiles
  SET
    avg_rating   = COALESCE((SELECT AVG(rating) FROM reviews WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id)), 0),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id))
  WHERE id = COALESCE(NEW.professional_id, OLD.professional_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_professional_rating
AFTER INSERT OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- Registrar comisión automáticamente cuando payment.status → 'completado'
CREATE OR REPLACE FUNCTION create_commission_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status <> 'completado' THEN
    INSERT INTO commissions (payment_id, project_id, amount, percentage)
    SELECT
      NEW.id,
      NEW.project_id,
      NEW.commission_amount,
      p.platform_commission_pct
    FROM projects p
    WHERE p.id = NEW.project_id
    ON CONFLICT (payment_id) DO NOTHING;

    -- También marcar el proyecto como completado
    UPDATE projects SET status = 'completado', payment_status = 'completado'
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_commission_on_payment
AFTER UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION create_commission_on_payment();

-- Marcar quote como 'visto' al actualizarlo a ese estado
CREATE OR REPLACE FUNCTION mark_quote_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('visto', 'aceptado', 'rechazado') AND OLD.viewed_at IS NULL THEN
    NEW.viewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mark_quote_viewed
BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION mark_quote_viewed();

-- Notificación: nuevo quote al cliente
CREATE OR REPLACE FUNCTION notify_client_new_quote()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT
    l.client_id,
    'new_quote',
    'Nuevo presupuesto recibido',
    (SELECT full_name FROM users WHERE id = pp.user_id) || ' ha enviado un presupuesto para tu solicitud',
    NEW.id
  FROM leads l
  JOIN professional_profiles pp ON pp.id = NEW.professional_id
  WHERE l.id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_client_new_quote
AFTER INSERT ON quotes
FOR EACH ROW EXECUTE FUNCTION notify_client_new_quote();

-- Notificación: quote aceptado al profesional
CREATE OR REPLACE FUNCTION notify_professional_quote_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aceptado' AND OLD.status <> 'aceptado' THEN
    INSERT INTO notifications (user_id, type, title, message, related_id)
    SELECT
      pp.user_id,
      'quote_accepted',
      'Presupuesto aceptado',
      'Tu presupuesto ha sido aceptado. Ya puedes acceder al proyecto.',
      NEW.id
    FROM professional_profiles pp
    WHERE pp.id = NEW.professional_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_professional_quote_accepted
AFTER UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION notify_professional_quote_accepted();

-- =====================================================
-- VISTAS (SECURITY DEFINER para respetar RLS)
-- =====================================================

CREATE OR REPLACE VIEW professionals_with_categories
WITH (security_invoker = TRUE) AS
SELECT
  pp.id,
  pp.user_id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  pp.company_name,
  pp.company_type,
  pp.description,
  pp.experience_years,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.location_city,
  pp.location_region,
  pp.service_radius_km,
  pp.is_active,
  pp.accepts_new_leads,
  pp.website_url,
  pp.instagram_url,
  STRING_AGG(c.name, ', ' ORDER BY c.name) AS categories
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN professional_categories pc ON pp.id = pc.professional_id
LEFT JOIN categories c ON pc.category_id = c.id
WHERE pp.is_active = TRUE
GROUP BY pp.id, u.id;

-- =====================================================
-- FIN DEL ESQUEMA HABITUP
-- =====================================================
