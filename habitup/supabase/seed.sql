-- =====================================================
-- SEED — Reference data
-- Executed by `supabase db reset` after all migrations.
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
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url    = EXCLUDED.icon_url,
  is_active   = TRUE;
