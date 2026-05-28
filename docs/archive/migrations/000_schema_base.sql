-- =====================================================
-- MIGRACION 000: Schema base de HabitUp
-- Crea todas las tablas, vistas, RLS,
-- trigger de perfil automatico + datos iniciales.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLAS BASE
-- =====================================================

-- 1. Usuarios (perfil publico sincronizado con auth.users)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  user_type   TEXT NOT NULL CHECK (user_type IN ('cliente', 'professional', 'admin')),
  bio         TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  expo_push_token TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categorias de servicio
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Perfiles de profesional
CREATE TABLE IF NOT EXISTS professional_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name            TEXT,
  company_type            TEXT CHECK (company_type IN ('autonomo', 'empresa')),
  nif_cif                 TEXT,
  nif_cif_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  documents_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  description             TEXT,
  experience_years        INTEGER,
  avg_rating              NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews           INTEGER NOT NULL DEFAULT 0,
  total_projects_completed INTEGER NOT NULL DEFAULT 0,
  response_time_hours     INTEGER,
  location_city           TEXT,
  location_region         TEXT,
  location_country        TEXT NOT NULL DEFAULT 'España',
  service_radius_km       INTEGER NOT NULL DEFAULT 0,
  stripe_account_id       TEXT,
  stripe_account_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  website_url             TEXT,
  instagram_url           TEXT,
  facebook_url            TEXT,
  linkedin_url            TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_new_leads       BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate             NUMERIC(10,2),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Categorias por profesional (pivote)
CREATE TABLE IF NOT EXISTS professional_categories (
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (professional_id, category_id)
);

-- 5. Solicitudes / Leads
CREATE TABLE IF NOT EXISTS leads (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id              UUID NOT NULL REFERENCES categories(id),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  budget_min               NUMERIC(10,2),
  budget_max               NUMERIC(10,2),
  location_city            TEXT,
  preferred_start_date     DATE,
  urgency                  TEXT NOT NULL DEFAULT 'media' CHECK (urgency IN ('baja', 'media', 'alta')),
  photos                   JSONB NOT NULL DEFAULT '[]',
  status                   TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'en_negociacion', 'asignado', 'cerrado', 'cancelado')),
  assigned_professional_id UUID REFERENCES professional_profiles(id),
  is_featured              BOOLEAN NOT NULL DEFAULT FALSE,
  views_count              INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at                TIMESTAMPTZ
);

-- 6. Presupuestos / Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'EUR',
  description       TEXT,
  delivery_days     INTEGER,
  includes_materials BOOLEAN NOT NULL DEFAULT FALSE,
  payment_terms     TEXT,
  status            TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado', 'retirado')),
  accepted_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  viewed_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Proyectos
CREATE TABLE IF NOT EXISTS projects (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id                  UUID REFERENCES leads(id),
  quote_id                 UUID REFERENCES quotes(id),
  client_id                UUID NOT NULL REFERENCES users(id),
  professional_id          UUID NOT NULL REFERENCES professional_profiles(id),
  category_id              UUID NOT NULL REFERENCES categories(id),
  title                    TEXT NOT NULL,
  description              TEXT,
  agreed_price             NUMERIC(10,2) NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'EUR',
  start_date               DATE,
  expected_end_date        DATE,
  actual_end_date          DATE,
  status                   TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_curso', 'pendiente_finalizacion', 'pausado', 'completado', 'cancelado')),
  platform_commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,
  platform_commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  professional_receives    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'en_proceso', 'completado', 'fallido')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Mensajes / Chat
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  recipient_id    UUID NOT NULL REFERENCES users(id),
  message_type    TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  content         TEXT,
  attachment_url  TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id             UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id            UUID NOT NULL REFERENCES users(id),
  professional_id        UUID NOT NULL REFERENCES professional_profiles(id),
  rating                 INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title                  TEXT,
  comment                TEXT,
  rating_quality         INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
  rating_communication   INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_timeline        INTEGER CHECK (rating_timeline >= 1 AND rating_timeline <= 5),
  rating_value           INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),
  photos                 JSONB NOT NULL DEFAULT '[]',
  is_verified_purchase   BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count          INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT,
  message     TEXT,
  related_id  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Portfolio de profesionales
CREATE TABLE IF NOT EXISTS portfolio_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id    UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id        UUID REFERENCES categories(id),
  title              TEXT NOT NULL,
  description        TEXT,
  photos             JSONB NOT NULL DEFAULT '[]',
  additional_photos  JSONB NOT NULL DEFAULT '[]',
  client_location    TEXT,
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at       DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista para busqueda de profesionales con categorias
CREATE OR REPLACE VIEW professionals_with_categories AS
SELECT
  pp.*,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug
    )) FILTER (WHERE c.id IS NOT NULL),
    '[]'::jsonb
  ) AS categories
FROM professional_profiles pp
LEFT JOIN professional_categories pc ON pc.professional_id = pp.id
LEFT JOIN categories c ON c.id = pc.category_id
GROUP BY pp.id;

-- =====================================================
-- TRIGGER: Crear perfil en users al registrarse en Auth
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'cliente')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: crea perfil en users para usuarios auth existentes que no lo tengan
INSERT INTO public.users (id, email, full_name, user_type)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data ->> 'user_type', 'cliente')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TRIGGER: actualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- 1. users: cada uno ve su propio perfil
DROP POLICY IF EXISTS "users: lectura propia" ON users;
CREATE POLICY "users: lectura propia" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users: actualizacion propia" ON users;
CREATE POLICY "users: actualizacion propia" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 2. professional_profiles: lectura publica, escritura solo propio
DROP POLICY IF EXISTS "professional_profiles: lectura publica" ON professional_profiles;
CREATE POLICY "professional_profiles: lectura publica" ON professional_profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "professional_profiles: insercion propia" ON professional_profiles;
CREATE POLICY "professional_profiles: insercion propia" ON professional_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "professional_profiles: actualizacion propia" ON professional_profiles;
CREATE POLICY "professional_profiles: actualizacion propia" ON professional_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- 3. professional_categories: lectura publica
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

-- 4. categories: lectura publica
DROP POLICY IF EXISTS "categories: lectura publica" ON categories;
CREATE POLICY "categories: lectura publica" ON categories
  FOR SELECT USING (TRUE);

-- 5. leads: clientes ven los suyos, profesionales ven activos
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

-- 6. quotes: clientes ven de sus leads, profesionales ven propios
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

-- 7. projects: participantes ven y actualizan
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

-- 8. messages: politicas en migracion 002 (ya existen)

-- 9. reviews: lectura publica, escritura solo cliente del proyecto
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

-- 10. notifications: cada usuario ve las suyas
DROP POLICY IF EXISTS "notifications: propias" ON notifications;
CREATE POLICY "notifications: propias" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- 11. portfolio_items: lectura publica, gestion propio profesional
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

-- =====================================================
-- DATOS INICIALES: Categorias
-- =====================================================

INSERT INTO categories (name, slug, description, icon_url, is_active) VALUES
  ('Reformas integrales', 'reformas-integrales', 'Reformas completas de vivienda o local', 'home', TRUE),
  ('Banos', 'banos', 'Reformas y reparaciones de banos', 'bath', TRUE),
  ('Cocinas', 'cocinas', 'Reformas de cocina, encimeras y mobiliario', 'chef-hat', TRUE),
  ('Pintura', 'pintura', 'Pintura interior, exterior y alisado', 'paintbrush', TRUE),
  ('Fontaneria', 'fontaneria', 'Tuberias, grifos, fugas y sanitarios', 'droplets', TRUE),
  ('Electricidad', 'electricidad', 'Instalaciones, averias y boletines', 'zap', TRUE),
  ('Carpinteria', 'carpinteria', 'Puertas, muebles, tarimas y madera', 'hammer', TRUE),
  ('Climatizacion', 'climatizacion', 'Aire acondicionado, calefaccion y ventilacion', 'snowflake', TRUE),
  ('Albanileria', 'albanileria', 'Muros, tabiques, suelos y trabajos de obra', 'brick-wall', TRUE),
  ('Suelos', 'suelos', 'Tarima, parquet, porcelanico y microcemento', 'layers', TRUE),
  ('Jardineria', 'jardineria', 'Jardines, terrazas y mantenimiento exterior', 'leaf', TRUE),
  ('Limpieza', 'limpieza', 'Limpieza puntual, fin de obra y mantenimiento', 'sparkles', TRUE),
  ('Mudanzas', 'mudanzas', 'Mudanzas, portes y montaje', 'truck', TRUE),
  ('Persianas y ventanas', 'persianas-ventanas', 'Persianas, ventanas, cristales y cerramientos', 'blinds', TRUE),
  ('Manitas', 'manitas', 'Pequenas reparaciones e instalaciones del hogar', 'wrench', TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  is_active = TRUE;
