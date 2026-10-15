-- =====================================================
-- RESET DESTRUCTIVO DE DATOS — SOLO ENTORNOS DE PRUEBA
--
-- ⚠️  BORRA TODAS LAS CUENTAS Y TODOS LOS DATOS TRANSACCIONALES.
--     Es IRREVERSIBLE. No lo ejecutes contra un proyecto con datos reales.
--
-- Requiere confirmación explícita para no dispararse por accidente:
--
--   psql "$DATABASE_URL" \
--     -v ON_ERROR_STOP=1 \
--     -c "SET habitup.confirm = 'BORRAR-TODO';" \
--     -f seed_dev_reset.sql
--
-- No toca el ESQUEMA (tablas, funciones, policies). Solo vacía datos.
-- Las migraciones siguen siendo la fuente de verdad de la estructura.
-- =====================================================

DO $$
BEGIN
  IF COALESCE(current_setting('habitup.confirm', TRUE), '') <> 'BORRAR-TODO' THEN
    RAISE EXCEPTION
      'Reset abortado. Para confirmar ejecuta antes: SET habitup.confirm = ''BORRAR-TODO'';';
  END IF;
  RAISE NOTICE 'Confirmado. Vaciando datos...';
END $$;

-- Orden irrelevante gracias a CASCADE, pero lo dejamos explícito para que se
-- lea qué se está borrando.
TRUNCATE TABLE
  reviews,
  commissions,
  payments,
  projects,
  quotes,
  leads,
  messages,
  conversations,
  notifications,
  portfolio_items,
  verification_documents,
  professional_categories,
  professional_profiles
CASCADE;

-- Suscripciones, si existen ya (migración 027).
DO $$
BEGIN
  IF to_regclass('public.professional_subscriptions') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE professional_subscriptions CASCADE';
  END IF;
END $$;

-- Borrar cuentas. public.users cae por FK desde auth.users.
DELETE FROM auth.users;

-- Las categorías NO se borran: son datos de referencia (seed.sql).

DO $$
DECLARE v_users INT; v_cats INT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM auth.users;
  SELECT COUNT(*) INTO v_cats  FROM categories;
  RAISE NOTICE 'Reset completado. auth.users=% categorias=%', v_users, v_cats;
END $$;
