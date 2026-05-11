-- =====================================================
-- SEED DEMO HABITUP
-- Requiere crear antes estos usuarios en Supabase Auth con los UUID indicados.
-- Password sugerida para todos en demos locales: HabitUpDemo123!
--
-- Clientes:
-- cliente.demo@habitup.app     10000000-0000-4000-8000-000000000001
-- cliente2.demo@habitup.app    10000000-0000-4000-8000-000000000002
-- cliente3.demo@habitup.app    10000000-0000-4000-8000-000000000003
--
-- Profesionales:
-- pro1.demo@habitup.app ... pro10.demo@habitup.app
-- UUIDs: 20000000-0000-4000-8000-000000000001 .. 20000000-0000-4000-8000-000000000010
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '10000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Crea primero los usuarios demo en Supabase Auth con los UUID indicados en este archivo.';
  END IF;
END $$;

INSERT INTO users (id, email, full_name, phone, user_type, avatar_url, is_verified) VALUES
  ('10000000-0000-4000-8000-000000000001', 'cliente.demo@habitup.app', 'Laura Martin', NULL, 'cliente', NULL, TRUE),
  ('10000000-0000-4000-8000-000000000002', 'cliente2.demo@habitup.app', 'Carlos Gomez', NULL, 'cliente', NULL, TRUE),
  ('10000000-0000-4000-8000-000000000003', 'cliente3.demo@habitup.app', 'Marta Ruiz', NULL, 'cliente', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000001', 'pro1.demo@habitup.app', 'Reformas Norte', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000002', 'pro2.demo@habitup.app', 'Banos Madrid Pro', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000003', 'pro3.demo@habitup.app', 'Cocinas Clara', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000004', 'pro4.demo@habitup.app', 'Pinturas Atlas', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000005', 'pro5.demo@habitup.app', 'Electricidad Sol', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000006', 'pro6.demo@habitup.app', 'Fontaneria Rio', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000007', 'pro7.demo@habitup.app', 'Carpinteria Roble', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000008', 'pro8.demo@habitup.app', 'Clima Hogar', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000009', 'pro9.demo@habitup.app', 'Manitas Express', NULL, 'professional', NULL, TRUE),
  ('20000000-0000-4000-8000-000000000010', 'pro10.demo@habitup.app', 'Jardines Sierra', NULL, 'professional', NULL, TRUE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  is_verified = EXCLUDED.is_verified;

INSERT INTO professional_profiles (
  id, user_id, company_name, company_type, description, experience_years,
  avg_rating, total_reviews, total_projects_completed, response_time_hours,
  location_city, location_region, service_radius_km, documents_verified,
  is_active, accepts_new_leads
) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Reformas Norte', 'empresa', 'Reformas integrales con equipo propio y seguimiento semanal.', 12, 4.8, 18, 36, 45, 'Madrid', 'Madrid', 35, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Banos Madrid Pro', 'autonomo', 'Especialistas en reformas de bano completas y cambios de ducha.', 9, 4.9, 25, 52, 30, 'Madrid', 'Madrid', 25, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Cocinas Clara', 'empresa', 'Diseno e instalacion de cocinas funcionales.', 10, 4.7, 14, 31, 60, 'Madrid', 'Madrid', 30, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'Pinturas Atlas', 'autonomo', 'Pintura interior, alisado y pequenos arreglos.', 7, 4.6, 11, 44, 50, 'Madrid', 'Madrid', 20, FALSE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'Electricidad Sol', 'empresa', 'Instalaciones electricas, averias y cuadros.', 15, 4.8, 19, 58, 25, 'Madrid', 'Madrid', 40, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 'Fontaneria Rio', 'autonomo', 'Fugas, sanitarios, termos y reformas de fontaneria.', 11, 4.5, 16, 40, 35, 'Madrid', 'Madrid', 35, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', 'Carpinteria Roble', 'empresa', 'Puertas, armarios, tarima y trabajos a medida.', 13, 4.7, 12, 29, 70, 'Madrid', 'Madrid', 25, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000008', 'Clima Hogar', 'empresa', 'Aire acondicionado, calefaccion y mantenimiento.', 8, 4.4, 9, 21, 55, 'Madrid', 'Madrid', 45, FALSE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000009', 'Manitas Express', 'autonomo', 'Reparaciones rapidas y pequenos montajes.', 6, 4.6, 20, 63, 20, 'Madrid', 'Madrid', 18, TRUE, TRUE, TRUE),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000010', 'Jardines Sierra', 'empresa', 'Jardineria, terrazas y mantenimiento exterior.', 14, 4.9, 10, 27, 80, 'Madrid', 'Madrid', 50, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  description = EXCLUDED.description,
  avg_rating = EXCLUDED.avg_rating,
  total_reviews = EXCLUDED.total_reviews,
  total_projects_completed = EXCLUDED.total_projects_completed;

INSERT INTO professional_categories (professional_id, category_id, is_primary)
SELECT p.id, c.id, TRUE
FROM professional_profiles p
JOIN categories c ON (
  (p.company_name ILIKE '%Banos%' AND c.slug = 'banos') OR
  (p.company_name ILIKE '%Cocinas%' AND c.slug = 'cocinas') OR
  (p.company_name ILIKE '%Pinturas%' AND c.slug = 'pintura') OR
  (p.company_name ILIKE '%Electricidad%' AND c.slug = 'electricidad') OR
  (p.company_name ILIKE '%Fontaneria%' AND c.slug = 'fontaneria') OR
  (p.company_name ILIKE '%Carpinteria%' AND c.slug = 'carpinteria') OR
  (p.company_name ILIKE '%Clima%' AND c.slug = 'climatizacion') OR
  (p.company_name ILIKE '%Manitas%' AND c.slug = 'manitas') OR
  (p.company_name ILIKE '%Jardines%' AND c.slug = 'jardineria') OR
  (p.company_name ILIKE '%Reformas%' AND c.slug = 'reformas-integrales')
)
WHERE p.id::text LIKE '30000000-%'
ON CONFLICT (professional_id, category_id) DO NOTHING;

INSERT INTO leads (id, client_id, category_id, title, description, budget_min, budget_max, location_city, urgency, photos, status, created_at)
SELECT
  ('40000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  CASE WHEN gs % 3 = 1 THEN '10000000-0000-4000-8000-000000000001'::uuid WHEN gs % 3 = 2 THEN '10000000-0000-4000-8000-000000000002'::uuid ELSE '10000000-0000-4000-8000-000000000003'::uuid END,
  (SELECT id FROM categories WHERE slug = CASE
    WHEN gs IN (1, 6, 11) THEN 'banos'
    WHEN gs IN (2, 7, 12) THEN 'cocinas'
    WHEN gs IN (3, 8, 13) THEN 'pintura'
    WHEN gs IN (4, 9, 14) THEN 'electricidad'
    ELSE 'manitas'
  END),
  CASE
    WHEN gs IN (1, 6, 11) THEN 'Reforma de bano'
    WHEN gs IN (2, 7, 12) THEN 'Actualizar cocina'
    WHEN gs IN (3, 8, 13) THEN 'Pintar vivienda'
    WHEN gs IN (4, 9, 14) THEN 'Revisar instalacion electrica'
    ELSE 'Reparaciones en casa'
  END || ' demo ' || gs,
  'Solicitud demo con descripcion suficiente para recibir presupuestos comparables y fiables.',
  500 + gs * 100,
  1500 + gs * 250,
  'Madrid',
  CASE WHEN gs % 3 = 0 THEN 'alta' WHEN gs % 3 = 1 THEN 'media' ELSE 'baja' END,
  '[]'::jsonb,
  CASE WHEN gs <= 10 THEN 'asignado' ELSE 'activo' END,
  NOW() - (gs || ' days')::interval
FROM generate_series(1, 15) gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO quotes (id, lead_id, professional_id, amount, description, delivery_days, includes_materials, status, accepted_at, created_at)
SELECT
  ('50000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  ('40000000-0000-4000-8000-' || lpad(((gs - 1) % 15 + 1)::text, 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(((gs - 1) % 10 + 1)::text, 12, '0'))::uuid,
  900 + gs * 180,
  'Presupuesto demo con mano de obra, materiales principales y plazo estimado.',
  3 + (gs % 8),
  TRUE,
  CASE WHEN gs <= 10 THEN 'aceptado' WHEN gs % 4 = 0 THEN 'rechazado' ELSE 'enviado' END,
  CASE WHEN gs <= 10 THEN NOW() - (gs || ' days')::interval ELSE NULL END,
  NOW() - (gs || ' hours')::interval
FROM generate_series(1, 20) gs
ON CONFLICT (lead_id, professional_id) DO NOTHING;

INSERT INTO projects (id, lead_id, quote_id, client_id, professional_id, category_id, title, description, agreed_price, currency, status, payment_status, start_date, expected_end_date, actual_end_date)
SELECT
  ('60000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  l.id,
  q.id,
  l.client_id,
  q.professional_id,
  l.category_id,
  l.title,
  l.description,
  q.amount,
  'EUR',
  'completado',
  'pendiente',
  CURRENT_DATE - (gs + 12),
  CURRENT_DATE - (gs + 5),
  CURRENT_DATE - gs
FROM generate_series(1, 10) gs
JOIN quotes q ON q.id = ('50000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid
JOIN leads l ON l.id = q.lead_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, project_id, reviewer_id, professional_id, rating, comment, rating_quality, rating_communication, rating_timeline, rating_value, is_verified_purchase)
SELECT
  ('70000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  p.id,
  p.client_id,
  p.professional_id,
  4 + (gs % 2),
  'Trabajo demo realizado correctamente. Buena comunicacion y presupuesto claro.',
  4 + (gs % 2),
  5,
  4,
  4 + (gs % 2),
  TRUE
FROM generate_series(1, 10) gs
JOIN projects p ON p.id = ('60000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO portfolio_items (id, professional_id, category_id, title, description, additional_photos, client_location, is_featured)
SELECT
  ('80000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  pc.category_id,
  'Proyecto destacado demo ' || gs,
  'Portfolio demo con imagenes placeholder preparadas para Storage.',
  '["https://placehold.co/900x600?text=HabitUp+Portfolio"]'::jsonb,
  'Madrid',
  TRUE
FROM generate_series(1, 10) gs
JOIN professional_categories pc ON pc.professional_id = ('30000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid
ON CONFLICT (id) DO NOTHING;
