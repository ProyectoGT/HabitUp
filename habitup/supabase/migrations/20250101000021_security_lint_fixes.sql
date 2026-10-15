-- =====================================================
-- MIGRATION 021: Security lint fixes
--
-- Fix 1: professionals_with_categories must use
--   security_invoker so RLS on the underlying tables
--   is enforced for the querying user, not the view owner.
--
-- Fix 2: spatial_ref_sys (PostGIS extension table) is
--   exposed to PostgREST without RLS. Enable RLS with no
--   permissive policies so it is effectively read-blocked
--   via the API (it is a system reference table, not
--   app data).
-- =====================================================

-- Fix 1: recreate view with security_invoker
DROP VIEW IF EXISTS professionals_with_categories;
CREATE VIEW professionals_with_categories
WITH (security_invoker = TRUE)
AS
SELECT
  pp.id,
  pp.user_id,
  u.full_name,
  u.avatar_url,
  pp.company_name,
  pp.company_type,
  pp.description,
  pp.experience_years,
  pp.location_city,
  pp.location_region,
  pp.service_radius_km,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.response_time_hours,
  pp.accepts_new_leads,
  pp.is_active,
  pp.nif_cif_verified,
  pp.documents_verified,
  COALESCE(
    JSONB_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'icon', c.icon_url
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::JSONB
  ) AS categories
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
LEFT JOIN professional_categories pc ON pc.professional_id = pp.id
LEFT JOIN categories c ON c.id = pc.category_id
WHERE pp.is_active = TRUE
GROUP BY pp.id, u.full_name, u.avatar_url;

GRANT SELECT ON professionals_with_categories TO anon, authenticated;

-- Fix 2: revoke PostgREST access to PostGIS system table.
-- spatial_ref_sys is owned by the superuser so ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- is not possible from migrations. Revoking SELECT from anon/authenticated achieves
-- the same security outcome: the table is not accessible via the API.
REVOKE SELECT ON public.spatial_ref_sys FROM anon, authenticated;
