-- =====================================================
-- MIGRATION 028: Ranking por mérito, media bayesiana y sellos de visado
--
-- TRES PROBLEMAS QUE RESUELVE
--
-- 1. LA MEDIA ARITMÉTICA MIENTE CON POCAS RESEÑAS.
--    Un perfil con una sola reseña de 5★ no puede ir por delante de otro con
--    47 reseñas y un 4,8. Usamos media bayesiana: cada perfil arranca
--    "prestado" hacia la media global y solo se separa de ella cuando acumula
--    reseñas suficientes.
--
-- 2. EL PROFESIONAL NUEVO NO PUEDE EMPEZAR A CERO.
--    Si el orden solo premia valoraciones, quien entra hoy es invisible, no
--    consigue trabajos, no consigue reseñas y sigue invisible. Reservamos una
--    cuota de resultados para perfiles nuevos verificados.
--
-- 3. EL SELLO DEBE SER RELATIVO A LA BÚSQUEDA.
--    Ser top 10% de España no sirve de nada si el cliente busca un fontanero
--    en Girona. El percentil se calcula DENTRO del conjunto filtrado.
--
-- LA SUSCRIPCIÓN NO REORDENA NADA. Los promocionados salen marcados en su
-- propio bloque; el orden orgánico lo manda exclusivamente el mérito.
-- =====================================================

-- ---------- Parámetros del ranking, editables sin tocar código ----------
CREATE TABLE IF NOT EXISTS ranking_settings (
  key         VARCHAR(50) PRIMARY KEY,
  value       NUMERIC NOT NULL,
  description TEXT
);

INSERT INTO ranking_settings (key, value, description) VALUES
  ('bayesian_prior_votes', 8,
   'Nº de reseñas "virtuales" hacia la media global. Más alto = más conservador con perfiles nuevos.'),
  ('weight_rating',        0.50, 'Peso de la valoración bayesiana en el mérito.'),
  ('weight_volume',        0.20, 'Peso de trabajos completados Y PAGADOS en la app.'),
  ('weight_response',      0.15, 'Peso de la tasa y velocidad de respuesta.'),
  ('weight_verification',  0.15, 'Peso de las verificaciones completadas.'),
  ('new_pro_quota',        0.15, 'Fracción de resultados reservada a perfiles nuevos verificados.'),
  ('seal_top_pct',         0.10, 'Percentil para el sello dorado.'),
  ('seal_mid_pct',         0.25, 'Percentil para el sello plateado.')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE ranking_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ranking_settings: lectura publica" ON ranking_settings;
CREATE POLICY "ranking_settings: lectura publica"
ON ranking_settings FOR SELECT USING (TRUE);
GRANT SELECT ON ranking_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ranking_setting(p_key VARCHAR)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT value FROM ranking_settings WHERE key = p_key $$;

-- ---------- Media bayesiana ----------
-- R = (v/(v+m)) * media_perfil + (m/(v+m)) * media_global
--   v = nº de reseñas del perfil, m = prior en votos
CREATE OR REPLACE FUNCTION public.bayesian_rating(
  p_avg   NUMERIC,
  p_count INT
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prior  NUMERIC := COALESCE(public.ranking_setting('bayesian_prior_votes'), 8);
  v_global NUMERIC;
BEGIN
  SELECT COALESCE(AVG(NULLIF(avg_rating, 0)), 4.0)
    INTO v_global
  FROM professional_profiles
  WHERE total_reviews > 0;

  IF COALESCE(p_count, 0) = 0 THEN
    RETURN v_global;
  END IF;

  RETURN ROUND(
    (p_count::NUMERIC / (p_count + v_prior)) * COALESCE(p_avg, 0)
    + (v_prior / (p_count + v_prior)) * v_global
  , 4);
END;
$$;

-- ---------- Score de mérito ----------
-- Combina cuatro señales, no solo la nota. El volumen cuenta trabajos PAGADOS
-- en la plataforma: eso ataca de paso la fuga fuera de la app.
CREATE OR REPLACE FUNCTION public.merit_score(p_professional_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pp             professional_profiles%ROWTYPE;
  v_rating_norm    NUMERIC;
  v_volume_norm    NUMERIC;
  v_response_norm  NUMERIC;
  v_verif_norm     NUMERIC;
  v_paid_projects  INT;
BEGIN
  SELECT * INTO v_pp FROM professional_profiles WHERE id = p_professional_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Valoración bayesiana normalizada a 0..1
  v_rating_norm := public.bayesian_rating(v_pp.avg_rating, v_pp.total_reviews) / 5.0;

  -- Volumen: proyectos completados con pago confirmado. Saturación logarítmica
  -- para que a partir de ~30 trabajos deje de comprar posiciones.
  SELECT COUNT(*) INTO v_paid_projects
  FROM projects p
  WHERE p.professional_id = p_professional_id
    AND p.status = 'completado'
    AND p.payment_status = 'completado';

  v_volume_norm := LEAST(LN(v_paid_projects + 1) / LN(31), 1.0);

  -- Respuesta: 2 h o menos es el ideal; 48 h o más puntúa 0.
  v_response_norm := CASE
    WHEN v_pp.response_time_hours IS NULL THEN 0.5
    WHEN v_pp.response_time_hours <= 2  THEN 1.0
    WHEN v_pp.response_time_hours >= 48 THEN 0.0
    ELSE 1.0 - ((v_pp.response_time_hours - 2)::NUMERIC / 46.0)
  END;

  -- Verificaciones: es lo que más convierte en reformas. El cliente teme al
  -- chapuzas, no al precio.
  v_verif_norm :=
      (CASE WHEN v_pp.nif_cif_verified   THEN 0.5 ELSE 0 END)
    + (CASE WHEN v_pp.documents_verified THEN 0.5 ELSE 0 END);

  RETURN ROUND(
      COALESCE(public.ranking_setting('weight_rating'),       0.50) * v_rating_norm
    + COALESCE(public.ranking_setting('weight_volume'),       0.20) * v_volume_norm
    + COALESCE(public.ranking_setting('weight_response'),     0.15) * v_response_norm
    + COALESCE(public.ranking_setting('weight_verification'), 0.15) * v_verif_norm
  , 6);
END;
$$;

-- ---------- Búsqueda con mérito, sellos y promocionados ----------
DROP FUNCTION IF EXISTS public.search_professionals(TEXT, TEXT, NUMERIC, INT, INT);

CREATE OR REPLACE FUNCTION public.search_professionals(
  p_city          TEXT    DEFAULT NULL,
  p_category_slug TEXT    DEFAULT NULL,
  p_min_rating    NUMERIC DEFAULT NULL,
  p_limit         INT     DEFAULT 20,
  p_offset        INT     DEFAULT 0
)
RETURNS TABLE (
  id                       UUID,
  user_id                  UUID,
  full_name                VARCHAR,
  avatar_url               TEXT,
  company_name             VARCHAR,
  description              TEXT,
  avg_rating               NUMERIC,
  bayes_rating             NUMERIC,
  total_reviews            INT,
  total_projects_completed INT,
  location_city            VARCHAR,
  location_region          VARCHAR,
  categories               TEXT,
  category_slugs           TEXT,
  is_active                BOOLEAN,
  accepts_new_leads        BOOLEAN,
  nif_cif_verified         BOOLEAN,
  documents_verified       BOOLEAN,
  merit                    NUMERIC,
  seal_level               TEXT,
  is_promoted              BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH filtrados AS (
    SELECT
      pp.id,
      pp.user_id,
      u.full_name,
      u.avatar_url,
      pp.company_name,
      pp.description,
      pp.avg_rating,
      public.bayesian_rating(pp.avg_rating, pp.total_reviews) AS bayes_rating,
      pp.total_reviews,
      pp.total_projects_completed,
      pp.location_city,
      pp.location_region,
      STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) AS categories,
      STRING_AGG(DISTINCT c.slug, ','  ORDER BY c.slug) AS category_slugs,
      pp.is_active,
      pp.accepts_new_leads,
      pp.nif_cif_verified,
      pp.documents_verified,
      public.merit_score(pp.id) AS merit,
      EXISTS (
        SELECT 1
        FROM professional_subscriptions ps
        JOIN subscription_plans sp ON sp.id = ps.plan_id
        WHERE ps.professional_id = pp.id
          AND ps.status IN ('active','trialing')
          AND sp.promoted_slots > 0
      ) AS is_promoted
    FROM professional_profiles pp
    JOIN users u ON u.id = pp.user_id
    LEFT JOIN professional_categories pc ON pc.professional_id = pp.id
    LEFT JOIN categories c ON c.id = pc.category_id
    WHERE pp.is_active = TRUE
      AND (p_city IS NULL OR pp.location_city ILIKE '%' || p_city || '%')
      AND (p_min_rating IS NULL OR pp.avg_rating >= p_min_rating)
      AND (
        p_category_slug IS NULL
        OR EXISTS (
          SELECT 1
          FROM professional_categories pc2
          JOIN categories c2 ON c2.id = pc2.category_id
          WHERE pc2.professional_id = pp.id
            AND c2.slug = p_category_slug
        )
      )
    GROUP BY pp.id, u.full_name, u.avatar_url
  ),
  -- El percentil se calcula DENTRO del conjunto filtrado: el sello es
  -- relativo a esta búsqueda (categoría + zona), no global.
  con_percentil AS (
    SELECT
      f.*,
      PERCENT_RANK() OVER (ORDER BY f.merit DESC) AS pct_rank
    FROM filtrados f
  )
  SELECT
    cp.id, cp.user_id, cp.full_name, cp.avatar_url, cp.company_name,
    cp.description, cp.avg_rating, cp.bayes_rating, cp.total_reviews,
    cp.total_projects_completed, cp.location_city, cp.location_region,
    cp.categories, cp.category_slugs, cp.is_active, cp.accepts_new_leads,
    cp.nif_cif_verified, cp.documents_verified, cp.merit,
    CASE
      -- Sin reseñas no hay mérito medible: no se otorga sello de percentil.
      WHEN cp.total_reviews = 0 THEN
        CASE WHEN cp.nif_cif_verified AND cp.documents_verified
             THEN 'verified' ELSE NULL END
      WHEN cp.pct_rank <= COALESCE(public.ranking_setting('seal_top_pct'), 0.10)
        THEN 'top10'
      WHEN cp.pct_rank <= COALESCE(public.ranking_setting('seal_mid_pct'), 0.25)
        THEN 'top25'
      WHEN cp.nif_cif_verified AND cp.documents_verified
        THEN 'verified'
      ELSE NULL
    END::TEXT AS seal_level,
    cp.is_promoted
  FROM con_percentil cp
  ORDER BY cp.merit DESC, cp.total_reviews DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_professionals(TEXT, TEXT, NUMERIC, INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bayesian_rating(NUMERIC, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merit_score(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ranking_setting(VARCHAR) TO anon, authenticated;

COMMENT ON FUNCTION public.search_professionals IS
  'Búsqueda ordenada por mérito. El sello es un percentil DENTRO del conjunto filtrado. La suscripción marca is_promoted pero nunca altera el orden.';
