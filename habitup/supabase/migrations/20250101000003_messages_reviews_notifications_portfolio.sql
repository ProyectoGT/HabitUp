-- =====================================================
-- MIGRATION 003: Messages, reviews, notifications, portfolio
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 8. Messages (per-project chat)
-- ═══════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════
-- 9. Reviews (one per completed project)
-- ═══════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════
-- 10. Notifications (in-app)
-- ═══════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════
-- 11. Portfolio items (professional's past work)
-- ═══════════════════════════════════════════════════

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

DROP TRIGGER IF EXISTS trg_portfolio_items_updated_at ON portfolio_items;
CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
