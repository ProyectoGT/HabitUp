-- =====================================================
-- MIGRATION 018: Analytics & Metrics Layer
--
-- Proposito: Capa minima de metricas para operar
-- HabitUp en beta cerrada.
--
-- Filosofia:
--   - Views regulares (no materializadas) para beta.
--     El volumen de datos es bajo (<10K filas).
--   - Cuando el volumen crezca, migrar a matviews
--     con refresco cada 5-15min via pg_cron.
--   - Esquema separado `analytics` para no contaminar
--     el esquema public.
--   - Indices minimos en columnas de filtrado comun
--     para que las views no degraden produccion.
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 0. Indices para queries de analytics
--    Sin estos, cada refresh de view hace seq scan
--    en tablas en crecimiento.
-- ═══════════════════════════════════════════════════

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_category_id ON leads(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_category_id ON projects(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_user_type ON users(user_type);

-- ═══════════════════════════════════════════════════
-- 1. SCHEMA: analytics
--    Aisla las vistas de metricas del esquema public.
-- ═══════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS analytics;

COMMENT ON SCHEMA analytics IS 'Metricas y analytics del marketplace. Solo lectura para admins.';

-- ═══════════════════════════════════════════════════
-- 2. VIEW: analytics.kpi_overview
--    Fila unica con todas las metricas acumuladas.
--    Es el "estado del marketplace ahora".
--
--    Metricas incluidas:
--      - leads_*          → leads creados (total, 7d, 30d)
--      - quotes_*         → quotes enviados, aceptados, tasa
--      - projects_*       → proyectos creados, completados, tasa
--      - gmv              → suma de agreed_price completados
--      - platform_commission → suma de comisiones
--      - payments_failed  → pagos fallidos
--      - professionals_active → perfiles activos
--      - clients_total    → clientes registrados
--      - clients_active   → clientes con lead en ultimos 30d
--      - reviews_total    → resenas totales
--      - avg_rating       → rating medio global
--      - lead_to_project_rate → % de leads que llegaron a proyecto
--      - lead_to_quote_rate   → % de leads con al menos 1 quote
--      - avg_quotes_per_lead  → media de quotes por lead
--      - avg_hours_to_first_quote → tiempo medio hasta primer quote
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.kpi_overview AS
WITH
  lead_stats AS (
    SELECT
      COUNT(*)                                                                   AS total_leads,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')           AS leads_7d,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')          AS leads_30d,
      COUNT(*) FILTER (WHERE status = 'activo')                                 AS leads_activos,
      COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days')           AS leads_maduros
    FROM leads
  ),
  quote_stats AS (
    SELECT
      COUNT(*)                                                                   AS total_quotes,
      COUNT(*) FILTER (WHERE status = 'aceptado')                               AS quotes_aceptados,
      COUNT(*) FILTER (WHERE status = 'rechazado')                              AS quotes_rechazados,
      COUNT(*) FILTER (WHERE status = 'enviado')                                AS quotes_pendientes
    FROM quotes
  ),
  project_stats AS (
    SELECT
      COUNT(*)                                                                   AS total_projects,
      COUNT(*) FILTER (WHERE status = 'completado')                             AS projects_completados,
      COUNT(*) FILTER (WHERE status IN ('en_curso', 'pendiente_finalizacion'))  AS projects_en_curso,
      COALESCE(SUM(agreed_price) FILTER (WHERE status = 'completado'), 0)       AS gmv,
      COALESCE(SUM(platform_commission_amount)
               FILTER (WHERE status = 'completado'), 0)                         AS platform_commission
    FROM projects
  ),
  payment_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'fallido')                                AS payments_fallidos,
      COUNT(*)                                                                   AS total_payments,
      COUNT(*) FILTER (WHERE status = 'completado')                             AS payments_completados
    FROM payments
  ),
  review_stats AS (
    SELECT
      COUNT(*)                                                                   AS total_reviews,
      COALESCE(AVG(rating), 0)                                                  AS avg_rating_global
    FROM reviews
    WHERE is_hidden = FALSE
  ),
  user_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE user_type = 'professional')                        AS total_professionals,
      COUNT(*) FILTER (WHERE user_type = 'cliente')                             AS total_clients
    FROM users
  ),
  active_clients AS (
    SELECT COUNT(DISTINCT client_id) AS clients_activos_30d
    FROM leads
    WHERE created_at >= NOW() - INTERVAL '30 days'
  ),
  active_professionals AS (
    SELECT COUNT(*) AS professionals_activos
    FROM professional_profiles
    WHERE is_active = TRUE
  ),
  -- Tiempo medio hasta primer quote por lead
  first_quote_time AS (
    SELECT COALESCE(
      AVG(diff.hours),
      0
    ) AS avg_hours_to_first_quote
    FROM (
      SELECT
        EXTRACT(EPOCH FROM (MIN(q.created_at) - l.created_at)) / 3600 AS hours
      FROM leads l
      JOIN quotes q ON q.lead_id = l.id
      GROUP BY l.id
    ) diff
  ),
  -- Leads que recibieron al menos un quote
  leads_with_quotes AS (
    SELECT COUNT(DISTINCT lead_id) AS total FROM quotes
  ),
  -- Leads que llegaron a proyecto
  leads_with_projects AS (
    SELECT COUNT(DISTINCT lead_id) AS total
    FROM projects
    WHERE lead_id IS NOT NULL
  ),
  -- Quotes por lead (media)
  quotes_per_lead AS (
    SELECT COALESCE(AVG(cnt), 0) AS avg_quotes_per_lead
    FROM (
      SELECT COUNT(*) AS cnt
      FROM quotes
      GROUP BY lead_id
    ) sub
  )
SELECT
  -- Leads
  ls.total_leads,
  ls.leads_7d,
  ls.leads_30d,
  ls.leads_activos,
  -- Quotes
  qs.total_quotes,
  qs.quotes_aceptados,
  qs.quotes_rechazados,
  qs.quotes_pendientes,
  CASE
    WHEN qs.total_quotes > 0
    THEN ROUND(qs.quotes_aceptados::numeric / qs.total_quotes * 100, 1)
    ELSE 0
  END AS quote_acceptance_rate_pct,
  -- Projects
  ps.total_projects,
  ps.projects_completados,
  ps.projects_en_curso,
  CASE
    WHEN ps.total_projects > 0
    THEN ROUND(ps.projects_completados::numeric / ps.total_projects * 100, 1)
    ELSE 0
  END AS project_completion_rate_pct,
  -- Financial
  ps.gmv,
  ps.platform_commission,
  ps.gmv - ps.platform_commission AS professional_earnings,
  -- Payments
  pmt.payments_fallidos,
  CASE
    WHEN pmt.total_payments > 0
    THEN ROUND(pmt.payments_fallidos::numeric / pmt.total_payments * 100, 1)
    ELSE 0
  END AS payment_failure_rate_pct,
  -- Reviews
  rs.total_reviews,
  ROUND(rs.avg_rating_global, 2) AS avg_rating_global,
  -- Users
  us.total_professionals,
  us.total_clients,
  ap.professionals_activos,
  ROUND(
    ap.professionals_activos::numeric / NULLIF(us.total_professionals, 0) * 100,
    1
  ) AS professional_activation_rate_pct,
  ac.clients_activos_30d,
  -- Conversion rates
  CASE
    WHEN ls.leads_maduros > 0
    THEN ROUND(lwp.total::numeric / ls.leads_maduros * 100, 1)
    ELSE 0
  END AS lead_to_project_rate_pct,
  CASE
    WHEN ls.total_leads > 0
    THEN ROUND(lwq.total::numeric / ls.total_leads * 100, 1)
    ELSE 0
  END AS lead_to_quote_rate_pct,
  ROUND(fqt.avg_hours_to_first_quote, 1) AS avg_hours_to_first_quote,
  ROUND(qpl.avg_quotes_per_lead, 1) AS avg_quotes_per_lead
FROM lead_stats ls
CROSS JOIN quote_stats qs
CROSS JOIN project_stats ps
CROSS JOIN payment_stats pmt
CROSS JOIN review_stats rs
CROSS JOIN user_stats us
CROSS JOIN active_clients ac
CROSS JOIN active_professionals ap
CROSS JOIN first_quote_time fqt
CROSS JOIN leads_with_quotes lwq
CROSS JOIN leads_with_projects lwp
CROSS JOIN quotes_per_lead qpl;

COMMENT ON VIEW analytics.kpi_overview IS
'Estado actual del marketplace. Una fila con todas las metricas acumuladas.';

-- ═══════════════════════════════════════════════════
-- 3. VIEW: analytics.leads_by_category
--    Distribucion de leads por categoria.
--    Usado para ver que servicios tienen mas demanda.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.leads_by_category AS
SELECT
  c.id                                                              AS category_id,
  c.name                                                            AS category_name,
  c.slug                                                            AS category_slug,
  COUNT(l.id)                                                       AS total_leads,
  COUNT(l.id) FILTER (WHERE l.created_at >= NOW() - INTERVAL '30 days') AS leads_30d,
  COUNT(l.id) FILTER (WHERE l.status = 'activo')                    AS leads_activos,
  COUNT(DISTINCT q.id)                                              AS total_quotes,
  AVG(q.amount)::numeric(10,2)                                      AS avg_quote_amount,
  COUNT(DISTINCT p.id)                                              AS total_projects
FROM categories c
LEFT JOIN leads l ON l.category_id = c.id
LEFT JOIN quotes q ON q.lead_id = l.id
LEFT JOIN projects p ON p.lead_id = l.id
GROUP BY c.id, c.name, c.slug
HAVING COUNT(l.id) > 0
ORDER BY total_leads DESC;

COMMENT ON VIEW analytics.leads_by_category IS
'Demanda agregada por categoria. Excluye categorias sin leads.';

-- ═══════════════════════════════════════════════════
-- 4. VIEW: analytics.conversion_funnel
--    Embutido de conversion: lead → quote → project → completo
--    Muestra en que paso se pierde cada lead.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.conversion_funnel AS
WITH
  lead_base AS (
    SELECT
      l.id,
      l.created_at,
      l.status                                                      AS lead_status,
      CASE WHEN q.id IS NOT NULL THEN TRUE ELSE FALSE END           AS has_quote,
      CASE WHEN q.status = 'aceptado' THEN TRUE ELSE FALSE END      AS has_accepted_quote,
      CASE WHEN p.id IS NOT NULL THEN TRUE ELSE FALSE END           AS has_project,
      CASE WHEN p.status = 'completado' THEN TRUE ELSE FALSE END    AS has_completed_project
    FROM leads l
    LEFT JOIN LATERAL (
      SELECT q.id, q.status
      FROM quotes q
      WHERE q.lead_id = l.id
      ORDER BY q.created_at DESC
      LIMIT 1
    ) q ON TRUE
    LEFT JOIN LATERAL (
      SELECT p.id, p.status
      FROM projects p
      WHERE p.lead_id = l.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) p ON TRUE
  )
SELECT
  'Total leads'                                                     AS etapa,
  COUNT(*)                                                          AS cantidad,
  100.0                                                             AS conversion_pct,
  COUNT(*) - COUNT(*) FILTER (WHERE has_quote)                      AS perdidos
FROM lead_base
UNION ALL
SELECT
  'Leads con quote',
  COUNT(*) FILTER (WHERE has_quote),
  ROUND(COUNT(*) FILTER (WHERE has_quote)::numeric / NULLIF(COUNT(*), 0) * 100, 1),
  COUNT(*) FILTER (WHERE has_quote) - COUNT(*) FILTER (WHERE has_accepted_quote)
FROM lead_base
UNION ALL
SELECT
  'Leads con quote aceptado',
  COUNT(*) FILTER (WHERE has_accepted_quote),
  ROUND(COUNT(*) FILTER (WHERE has_accepted_quote)::numeric / NULLIF(COUNT(*) FILTER (WHERE has_quote), 0) * 100, 1),
  COUNT(*) FILTER (WHERE has_accepted_quote) - COUNT(*) FILTER (WHERE has_project)
FROM lead_base
UNION ALL
SELECT
  'Proyectos creados',
  COUNT(*) FILTER (WHERE has_project),
  ROUND(COUNT(*) FILTER (WHERE has_project)::numeric / NULLIF(COUNT(*) FILTER (WHERE has_accepted_quote), 0) * 100, 1),
  COUNT(*) FILTER (WHERE has_project) - COUNT(*) FILTER (WHERE has_completed_project)
FROM lead_base
UNION ALL
SELECT
  'Proyectos completados',
  COUNT(*) FILTER (WHERE has_completed_project),
  ROUND(COUNT(*) FILTER (WHERE has_completed_project)::numeric / NULLIF(COUNT(*) FILTER (WHERE has_project), 0) * 100, 1),
  0
FROM lead_base;

COMMENT ON VIEW analytics.conversion_funnel IS
'Funnel de conversion lead → quote → proyecto → completado.
Cada fila muestra cuantos llegan a esa etapa y cuantos se pierden respecto a la siguiente.';

-- ═══════════════════════════════════════════════════
-- 5. VIEW: analytics.daily_trend
--    Serie temporal diaria para graficos de evolucion.
--    Una fila por dia con los KPI mas importantes.
--    Sin datos = el dia no aparece (no rellenamos con 0).
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.daily_trend AS
WITH
  dates AS (
    SELECT DISTINCT d::date AS date
    FROM generate_series(
      (SELECT MIN(created_at)::date FROM leads),
      CURRENT_DATE,
      '1 day'::interval
    ) d
  ),
  daily_leads AS (
    SELECT
      created_at::date AS date,
      COUNT(*) AS leads_created
    FROM leads
    GROUP BY created_at::date
  ),
  daily_quotes AS (
    SELECT
      created_at::date AS date,
      COUNT(*) AS quotes_sent,
      COUNT(*) FILTER (WHERE status = 'aceptado') AS quotes_accepted
    FROM quotes
    GROUP BY created_at::date
  ),
  daily_projects AS (
    SELECT
      created_at::date AS date,
      COUNT(*) AS projects_created,
      COUNT(*) FILTER (WHERE status = 'completado') AS projects_completed,
      COALESCE(SUM(agreed_price), 0) AS daily_gmv
    FROM projects
    GROUP BY created_at::date
  ),
  daily_reviews AS (
    SELECT
      created_at::date AS date,
      COUNT(*) AS reviews_created,
      ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM reviews
    WHERE is_hidden = FALSE
    GROUP BY created_at::date
  )
SELECT
  d.date,
  COALESCE(dl.leads_created, 0)                                     AS leads_created,
  COALESCE(dq.quotes_sent, 0)                                       AS quotes_sent,
  COALESCE(dq.quotes_accepted, 0)                                   AS quotes_accepted,
  COALESCE(dp.projects_created, 0)                                  AS projects_created,
  COALESCE(dp.projects_completed, 0)                                AS projects_completed,
  COALESCE(dp.daily_gmv, 0)                                         AS gmv,
  COALESCE(dr.reviews_created, 0)                                   AS reviews_created,
  dr.avg_rating
FROM dates d
LEFT JOIN daily_leads dl ON dl.date = d.date
LEFT JOIN daily_quotes dq ON dq.date = d.date
LEFT JOIN daily_projects dp ON dp.date = d.date
LEFT JOIN daily_reviews dr ON dr.date = d.date
ORDER BY d.date DESC;

COMMENT ON VIEW analytics.daily_trend IS
'Serie temporal diaria. Dias sin actividad no aparecen (devuelven 0 con COALESCE).';

-- ═══════════════════════════════════════════════════
-- 6. VIEW: analytics.professional_ratings
--    Distribucion de ratings por profesional.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.professional_ratings AS
SELECT
  pp.id                                                             AS professional_id,
  u.full_name,
  pp.company_name,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.avg_rating,
  -- Distribucion de ratings
  COUNT(r.id) FILTER (WHERE r.rating = 5)                           AS ratings_5,
  COUNT(r.id) FILTER (WHERE r.rating = 4)                           AS ratings_4,
  COUNT(r.id) FILTER (WHERE r.rating = 3)                           AS ratings_3,
  COUNT(r.id) FILTER (WHERE r.rating = 2)                           AS ratings_2,
  COUNT(r.id) FILTER (WHERE r.rating = 1)                           AS ratings_1,
  -- Reviews recientes
  COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') AS reviews_30d
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
LEFT JOIN reviews r ON r.professional_id = pp.id AND r.is_hidden = FALSE
GROUP BY pp.id, u.full_name, pp.company_name, pp.total_reviews,
         pp.total_projects_completed, pp.avg_rating
ORDER BY pp.total_reviews DESC;

COMMENT ON VIEW analytics.professional_ratings IS
'Distribucion completa de ratings por profesional. Incluye conteo por estrella.';

-- ═══════════════════════════════════════════════════
-- 7. VIEW: analytics.top_professionals
--    Top 50 profesionales por conversión a proyecto.
--    Útil para identificar mejores performers.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.top_professionals AS
SELECT
  u.full_name,
  pp.company_name,
  pp.location_city,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  -- Proyectos completados sobre quotes enviados
  ROUND(
    pp.total_projects_completed::numeric / NULLIF(
      (SELECT COUNT(*) FROM quotes q
       JOIN professional_profiles p2 ON p2.id = q.professional_id
       WHERE p2.id = pp.id),
      0
    ) * 100, 1
  ) AS quote_to_project_rate_pct,
  -- Tiempo de respuesta medio (si se trackea)
  pp.response_time_hours,
  pp.is_active,
  pp.accepts_new_leads
FROM professional_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.total_projects_completed > 0
   OR pp.total_reviews > 0
ORDER BY pp.total_projects_completed DESC, pp.avg_rating DESC
LIMIT 50;

COMMENT ON VIEW analytics.top_professionals IS
'Top 50 profesionales por proyectos completados y rating.';

-- ═══════════════════════════════════════════════════
-- 8. Permisos de lectura
--    Solo usuarios admin pueden leer analytics.
-- ═══════════════════════════════════════════════════

GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;

-- ═══════════════════════════════════════════════════
-- 9. Función helper: analytics.refresh_all()
--    Placeholder para cuando migremos a matviews.
--    Por ahora es un no-op; las views siempre
--    reflejan datos en tiempo real.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION analytics.refresh_all()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
BEGIN
  -- Placeholder: cuando las views sean materializadas,
  -- aqui se hará REFRESH MATERIALIZED VIEW CONCURRENTLY.
  -- Por ahora las views son "live".
  RETURN 'OK (live views, no refresh needed)';
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.refresh_all() TO authenticated;

-- ═══════════════════════════════════════════════════
-- NOTAS SOBRE LA ESTRATEGIA FUTURA:
--
-- 1. Cuando el volumen supere ~50K leads, convertir
--    analytics.kpi_overview a materialized view.
-- 2. Programar refresco con pg_cron (o edge function):
--      SELECT cron.schedule('analytics-refresh',
--        '*/5 * * * *',
--        'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.kpi_overview'
--      );
-- 3. daily_trend se presta a ser incremental:
--    solo refrescar ultimos 2 dias + hoy.
-- 4. professional_ratings es rapida incluso con
--    cientos de miles de reviews por el index
--    idx_reviews_professional_id.
-- ═══════════════════════════════════════════════════

