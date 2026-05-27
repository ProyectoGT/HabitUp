-- =====================================================
-- MIGRATION 001: Users, categories, professional profiles
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. Users (public profile mirror of auth.users)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  user_type       TEXT NOT NULL CHECK (user_type IN ('cliente', 'professional', 'admin')),
  bio             TEXT,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  expo_push_token TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create user row when someone signs up via Auth
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

-- Backfill: create user rows for existing auth users that lack them
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

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 2. Service categories
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- 3. Professional profiles (1:1 with users)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS professional_profiles (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name             TEXT,
  company_type             TEXT CHECK (company_type IN ('autonomo', 'empresa')),
  nif_cif                  TEXT,
  nif_cif_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  documents_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  description              TEXT,
  experience_years         INTEGER,
  avg_rating               NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews            INTEGER NOT NULL DEFAULT 0,
  total_projects_completed INTEGER NOT NULL DEFAULT 0,
  response_time_hours      INTEGER,
  location_city            TEXT,
  location_region          TEXT,
  location_country         TEXT NOT NULL DEFAULT 'España',
  service_radius_km        INTEGER NOT NULL DEFAULT 0,
  stripe_account_id        TEXT,
  stripe_account_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  website_url              TEXT,
  instagram_url            TEXT,
  facebook_url             TEXT,
  linkedin_url             TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_new_leads        BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate              NUMERIC(10,2),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_professional_profiles_updated_at ON professional_profiles;
CREATE TRIGGER trg_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 4. Professional ↔ categories (N:M pivot)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS professional_categories (
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (professional_id, category_id)
);
