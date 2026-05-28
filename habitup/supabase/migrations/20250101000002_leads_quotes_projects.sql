-- =====================================================
-- MIGRATION 002: Marketplace core — leads, quotes, projects
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 5. Leads (service requests from clients)
-- ═══════════════════════════════════════════════════

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

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 6. Quotes (estimates sent by professionals)
-- ═══════════════════════════════════════════════════

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
  status            TEXT NOT NULL DEFAULT 'enviado'
                    CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado', 'retirado')),
  accepted_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  viewed_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 7. Projects (contracts between client & professional)
-- ═══════════════════════════════════════════════════

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
  status                   TEXT NOT NULL DEFAULT 'pendiente'
                            CHECK (status IN ('pendiente', 'en_curso', 'pendiente_finalizacion', 'pausado', 'completado', 'cancelado')),
  platform_commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 10,
  platform_commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  professional_receives    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status           TEXT NOT NULL DEFAULT 'pendiente'
                            CHECK (payment_status IN ('pendiente', 'en_proceso', 'completado', 'fallido')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
