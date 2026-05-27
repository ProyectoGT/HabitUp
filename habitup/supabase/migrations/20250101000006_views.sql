-- =====================================================
-- MIGRATION 006: Views
--
-- ⚠️  FIX DE SEGURIDAD: La vista original (migración 000)
--     usaba `pp.*` + omitía `security_invoker = TRUE`.
--     Esto exponía `stripe_account_id`, `nif_cif`, etc.
--     a cualquier cliente autenticado, y el planificador
--     ignoraba RLS sobre professional_profiles.
--
--     SOLUCIÓN:
--       1. Lista explícita de columnas seguras.
--       2. `WITH (security_invoker = TRUE)` para que RLS
--          de las tablas subyacentes se respete.
-- =====================================================

DROP VIEW IF EXISTS professionals_with_categories;

CREATE OR REPLACE VIEW professionals_with_categories
WITH (security_invoker = TRUE)
AS
SELECT
  pp.id,
  pp.user_id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.bio,
  pp.company_name,
  pp.company_type,
  pp.description,
  pp.experience_years,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.response_time_hours,
  pp.location_city,
  pp.location_region,
  pp.location_country,
  pp.service_radius_km,
  pp.is_active,
  pp.accepts_new_leads,
  pp.website_url,
  pp.instagram_url,
  pp.facebook_url,
  pp.linkedin_url,
  pp.hourly_rate,
  pp.created_at,
  pp.updated_at,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug
    )) FILTER (WHERE c.id IS NOT NULL),
    '[]'::jsonb
  ) AS categories
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN professional_categories pc ON pc.professional_id = pp.id
LEFT JOIN categories c ON c.id = pc.category_id
GROUP BY pp.id, u.id;
