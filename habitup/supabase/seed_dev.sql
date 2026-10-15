-- =====================================================
-- SEED DE DESARROLLO — datos ficticios realistas
--
-- Genera ~150 profesionales y ~80 clientes con DISTRIBUCIÓN DESIGUAL, que es
-- lo único que permite probar de verdad:
--   · el ranking por mérito y la media bayesiana (perfiles con 1 reseña
--     no deben adelantar a perfiles con 40)
--   · los percentiles del sello (relativos a categoría + zona)
--   · el arranque en frío (hay perfiles con 0 reseñas a propósito)
--   · ciudades densas frente a ciudades casi vacías
--
-- Contraseña de todas las cuentas: HabitUpDev123!
-- Emails: cliente001@dev.habitup.app / pro001@dev.habitup.app ...
--
-- Uso:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seed_dev.sql
--
-- Idempotente: si detecta que ya hay datos de seed, aborta en vez de duplicar.
-- =====================================================

DO $$
DECLARE
  -- Volumen
  N_CLIENTES  CONSTANT INT := 80;
  N_PROS      CONSTANT INT := 150;

  -- Ciudades con densidad DESIGUAL a propósito: el peso es cuántas veces más
  -- probable es que un profesional caiga ahí. Lugo y Teruel quedan casi vacías
  -- para poder probar el caso "no hay nadie en mi zona".
  ciudades   TEXT[]  := ARRAY['Madrid','Barcelona','Valencia','Sevilla','Zaragoza',
                              'Bilbao','Malaga','Girona','Lugo','Teruel'];
  regiones   TEXT[]  := ARRAY['Madrid','Cataluna','Comunidad Valenciana','Andalucia','Aragon',
                              'Pais Vasco','Andalucia','Cataluna','Galicia','Aragon'];
  pesos      INT[]   := ARRAY[30, 25, 14, 11, 6, 5, 5, 2, 1, 1];
  peso_total INT;

  nombres    TEXT[] := ARRAY['Laura','Carlos','Marta','Javier','Elena','Sergio','Ana','David',
                             'Cristina','Miguel','Nuria','Pablo','Rocio','Alberto','Silvia',
                             'Ruben','Beatriz','Ivan','Patricia','Oscar'];
  apellidos  TEXT[] := ARRAY['Garcia','Martinez','Lopez','Sanchez','Perez','Gomez','Fernandez',
                             'Ruiz','Diaz','Moreno','Alvarez','Romero','Navarro','Torres','Gil'];
  prefijos   TEXT[] := ARRAY['Reformas','Obras','Servicios','Grupo','Taller','Proyectos','Casa'];
  sufijos    TEXT[] := ARRAY['Norte','Sur','Levante','Atlas','Nova','Integral','Express','Premium'];

  comentarios TEXT[] := ARRAY[
    'Trabajo impecable y plazos cumplidos.',
    'Muy profesional, dejo todo limpio al terminar.',
    'Buena comunicacion durante toda la obra.',
    'Cumplio el presupuesto sin sorpresas.',
    'Resolvio una urgencia el mismo dia.',
    'Acabados muy cuidados, repetiria sin dudarlo.',
    'Correcto en general, algun retraso puntual.',
    'El resultado esta bien pero tardo mas de lo previsto.',
    'Trato cercano y precio ajustado.'
  ];

  cat_ids     UUID[];
  n_cats      INT;

  v_uid       UUID;
  v_pp_id     UUID;
  v_lead_id   UUID;
  v_quote_id  UUID;
  v_proj_id   UUID;

  v_ciudad_ix INT;
  v_ciudad    TEXT;
  v_region    TEXT;
  v_email     TEXT;
  v_nombre    TEXT;
  v_empresa   TEXT;
  v_cat       UUID;
  v_precio    NUMERIC(10,2);
  v_pct       NUMERIC(5,2);
  v_fee       NUMERIC(10,2);
  v_rating    INT;
  v_n_trabajos INT;
  v_perfil    INT;
  v_fecha     TIMESTAMPTZ;
  v_pass      TEXT;

  cliente_ids UUID[] := '{}';
  pro_user_ids UUID[] := '{}';
  pro_pp_ids   UUID[] := '{}';

  i INT; j INT; k INT; r INT;
BEGIN
  -- ---------- Guardas ----------
  IF EXISTS (SELECT 1 FROM auth.users WHERE email LIKE '%@dev.habitup.app') THEN
    RAISE EXCEPTION 'Ya hay datos de seed cargados. Ejecuta antes seed_dev_reset.sql';
  END IF;

  SELECT ARRAY_AGG(id ORDER BY slug) INTO cat_ids FROM categories WHERE is_active;
  n_cats := COALESCE(ARRAY_LENGTH(cat_ids, 1), 0);
  IF n_cats = 0 THEN
    RAISE EXCEPTION 'No hay categorias. Ejecuta antes seed.sql';
  END IF;

  SELECT SUM(p) INTO peso_total FROM UNNEST(pesos) p;

  -- Contraseña común. bcrypt via pgcrypto (extensión ya presente).
  v_pass := crypt('HabitUpDev123!', gen_salt('bf'));

  -- Semilla fija: el seed es reproducible entre ejecuciones.
  PERFORM setseed(0.42);

  RAISE NOTICE 'Generando % clientes...', N_CLIENTES;

  -- ---------- CLIENTES ----------
  FOR i IN 1..N_CLIENTES LOOP
    v_uid   := gen_random_uuid();
    v_email := FORMAT('cliente%s@dev.habitup.app', LPAD(i::TEXT, 3, '0'));
    v_nombre := nombres[1 + FLOOR(RANDOM() * ARRAY_LENGTH(nombres,1))::INT] || ' ' ||
                apellidos[1 + FLOOR(RANDOM() * ARRAY_LENGTH(apellidos,1))::INT];

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, v_pass, NOW(), NOW() - (RANDOM() * 400 || ' days')::INTERVAL, NOW(),
      '{"provider":"email","providers":["email"]}'::JSONB,
      JSONB_BUILD_OBJECT('full_name', v_nombre, 'user_type', 'cliente')
    );

    -- El trigger handle_new_user ya creo public.users. Completamos datos.
    -- Campos de la migracion 025: sin onboarding_completed_at la app manda
    -- al usuario a la pantalla de alta en vez de dejarle entrar.
    UPDATE users
       SET phone = '6' || LPAD(FLOOR(RANDOM()*100000000)::TEXT, 8, '0'),
           is_verified = TRUE,
           locality = v_ciudad,
           postal_code = LPAD((10000 + FLOOR(RANDOM()*42000))::TEXT, 5, '0'),
           onboarding_completed_at = NOW(),
           terms_accepted_at = NOW(),
           marketing_consent = RANDOM() < 0.3
     WHERE id = v_uid;

    cliente_ids := cliente_ids || v_uid;
  END LOOP;

  RAISE NOTICE 'Generando % profesionales...', N_PROS;

  -- ---------- PROFESIONALES ----------
  FOR i IN 1..N_PROS LOOP
    v_uid   := gen_random_uuid();
    v_email := FORMAT('pro%s@dev.habitup.app', LPAD(i::TEXT, 3, '0'));
    v_nombre := nombres[1 + FLOOR(RANDOM() * ARRAY_LENGTH(nombres,1))::INT] || ' ' ||
                apellidos[1 + FLOOR(RANDOM() * ARRAY_LENGTH(apellidos,1))::INT];
    v_empresa := prefijos[1 + FLOOR(RANDOM() * ARRAY_LENGTH(prefijos,1))::INT] || ' ' ||
                 sufijos[1 + FLOOR(RANDOM() * ARRAY_LENGTH(sufijos,1))::INT];

    -- Ciudad ponderada
    r := 1 + FLOOR(RANDOM() * peso_total)::INT;
    v_ciudad_ix := 1;
    WHILE r > pesos[v_ciudad_ix] LOOP
      r := r - pesos[v_ciudad_ix];
      v_ciudad_ix := v_ciudad_ix + 1;
    END LOOP;
    v_ciudad := ciudades[v_ciudad_ix];
    v_region := regiones[v_ciudad_ix];

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, v_pass, NOW(), NOW() - (RANDOM() * 700 || ' days')::INTERVAL, NOW(),
      '{"provider":"email","providers":["email"]}'::JSONB,
      JSONB_BUILD_OBJECT('full_name', v_nombre, 'user_type', 'professional')
    );

    UPDATE users
       SET user_type = 'professional',
           phone = '6' || LPAD(FLOOR(RANDOM()*100000000)::TEXT, 8, '0'),
           is_verified = TRUE,
           locality = v_ciudad,
           postal_code = LPAD((10000 + FLOOR(RANDOM()*42000))::TEXT, 5, '0'),
           onboarding_completed_at = NOW(),
           terms_accepted_at = NOW(),
           marketing_consent = RANDOM() < 0.5
     WHERE id = v_uid;

    -- PERFIL DE MADUREZ — aquí está la desigualdad que hace útil el seed:
    --   1 (20%) recién llegado: 0 trabajos, sin verificar
    --   2 (40%) emergente:      1-8 trabajos
    --   3 (30%) consolidado:    9-35 trabajos
    --   4 (10%) veterano:       36-90 trabajos
    r := 1 + FLOOR(RANDOM() * 100)::INT;
    v_perfil := CASE
      WHEN r <= 20 THEN 1
      WHEN r <= 60 THEN 2
      WHEN r <= 90 THEN 3
      ELSE 4
    END;

    v_n_trabajos := CASE v_perfil
      WHEN 1 THEN 0
      WHEN 2 THEN 1  + FLOOR(RANDOM() * 8)::INT
      WHEN 3 THEN 9  + FLOOR(RANDOM() * 27)::INT
      ELSE       36 + FLOOR(RANDOM() * 55)::INT
    END;

    INSERT INTO professional_profiles (
      user_id, company_name, company_type, nif_cif,
      nif_cif_verified, documents_verified,
      description, experience_years,
      response_time_hours, location_city, location_region,
      service_radius_km, is_active, accepts_new_leads, hourly_rate,
      website_url, created_at
    ) VALUES (
      v_uid, v_empresa,
      CASE WHEN RANDOM() < 0.6 THEN 'autonomo' ELSE 'empresa' END,
      LPAD(FLOOR(RANDOM()*100000000)::TEXT, 8, '0') || 'X',
      -- Los recién llegados en su mayoría aún no están verificados.
      CASE WHEN v_perfil = 1 THEN RANDOM() < 0.4 ELSE RANDOM() < 0.9 END,
      CASE WHEN v_perfil = 1 THEN RANDOM() < 0.2 ELSE RANDOM() < 0.75 END,
      'Especialistas en ' || LOWER(v_empresa) || '. Presupuesto sin compromiso y trabajo garantizado.',
      1 + FLOOR(RANDOM() * 25)::INT,
      -- Los veteranos responden antes; hay algún desastre a propósito.
      CASE v_perfil WHEN 1 THEN 6 + FLOOR(RANDOM()*60)::INT
                    WHEN 2 THEN 4 + FLOOR(RANDOM()*40)::INT
                    WHEN 3 THEN 2 + FLOOR(RANDOM()*20)::INT
                    ELSE        1 + FLOOR(RANDOM()*8)::INT END,
      v_ciudad, v_region,
      10 + FLOOR(RANDOM() * 60)::INT,
      TRUE,
      RANDOM() < 0.88,          -- ~12% no acepta encargos ahora mismo
      25 + FLOOR(RANDOM() * 45)::INT,
      CASE WHEN RANDOM() < 0.45 THEN 'https://' || LOWER(REPLACE(v_empresa,' ','')) || '.es' END,
      NOW() - (RANDOM() * 700 || ' days')::INTERVAL
    ) RETURNING id INTO v_pp_id;

    -- 1-3 especialidades
    FOR j IN 1..(1 + FLOOR(RANDOM() * 3)::INT) LOOP
      v_cat := cat_ids[1 + FLOOR(RANDOM() * n_cats)::INT];
      INSERT INTO professional_categories (professional_id, category_id, years_in_category, is_primary)
      VALUES (v_pp_id, v_cat, 1 + FLOOR(RANDOM()*15)::INT, j = 1)
      ON CONFLICT (professional_id, category_id) DO NOTHING;
    END LOOP;

    -- Portfolio para los que ya tienen recorrido
    IF v_perfil >= 2 THEN
      FOR j IN 1..(1 + FLOOR(RANDOM() * 5)::INT) LOOP
        INSERT INTO portfolio_items (professional_id, category_id, title, description,
                                     photos, client_location, completed_at, created_at)
        VALUES (v_pp_id,
                cat_ids[1 + FLOOR(RANDOM() * n_cats)::INT],
                'Trabajo ' || j,
                'Ejemplo de proyecto realizado por ' || v_empresa || '.',
                '[]'::JSONB,
                v_ciudad,
                (NOW() - (RANDOM() * 500 || ' days')::INTERVAL)::DATE,
                NOW() - (RANDOM() * 500 || ' days')::INTERVAL);
      END LOOP;
    END IF;

    pro_user_ids := pro_user_ids || v_uid;
    pro_pp_ids   := pro_pp_ids   || v_pp_id;

    -- ---------- HISTORIAL: lead → quote → project → payment → review ----------
    FOR k IN 1..v_n_trabajos LOOP
      v_cat    := cat_ids[1 + FLOOR(RANDOM() * n_cats)::INT];
      v_fecha  := NOW() - (30 + RANDOM() * 600 || ' days')::INTERVAL;
      -- Distribución de precios sesgada a tickets pequeños, con cola larga.
      v_precio := ROUND((150 + POWER(RANDOM(), 3) * 18000)::NUMERIC, 2);

      INSERT INTO leads (client_id, category_id, title, description,
                         budget_min, budget_max, location_city,
                         urgency, status, created_at, closed_at)
      VALUES (
        cliente_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(cliente_ids,1))::INT],
        v_cat,
        'Trabajo de ' || (SELECT name FROM categories WHERE id = v_cat),
        'Solicitud generada para pruebas de desarrollo.',
        ROUND(v_precio * 0.8, 2), ROUND(v_precio * 1.3, 2),
        v_ciudad,
        (ARRAY['baja','media','alta'])[1 + FLOOR(RANDOM()*3)::INT],
        'cerrado', v_fecha, v_fecha + INTERVAL '3 days'
      ) RETURNING id, client_id INTO v_lead_id, v_uid;

      INSERT INTO quotes (lead_id, professional_id, amount, description,
                          delivery_days, includes_materials, status,
                          accepted_at, viewed_at, created_at)
      VALUES (v_lead_id, v_pp_id, v_precio, 'Presupuesto de prueba.',
              3 + FLOOR(RANDOM()*30)::INT, RANDOM() < 0.6, 'aceptado',
              v_fecha + INTERVAL '2 days', v_fecha + INTERVAL '1 day', v_fecha)
      RETURNING id INTO v_quote_id;

      -- Comisión por tramos si la migración 027 ya está aplicada.
      IF to_regproc('public.resolve_commission') IS NOT NULL THEN
        SELECT c.pct, c.fee INTO v_pct, v_fee FROM public.resolve_commission(v_precio) c;
      ELSE
        v_pct := 10; v_fee := ROUND(v_precio * 0.10, 2);
      END IF;

      INSERT INTO projects (
        lead_id, quote_id, client_id, professional_id, category_id,
        title, description, agreed_price,
        start_date, expected_end_date, actual_end_date,
        status, platform_commission_pct, platform_commission_amount,
        professional_receives, payment_status, created_at
      ) VALUES (
        v_lead_id, v_quote_id,
        (SELECT client_id FROM leads WHERE id = v_lead_id),
        v_pp_id, v_cat,
        'Trabajo de ' || (SELECT name FROM categories WHERE id = v_cat),
        'Proyecto generado para pruebas.', v_precio,
        (v_fecha + INTERVAL '3 days')::DATE,
        (v_fecha + INTERVAL '20 days')::DATE,
        (v_fecha + INTERVAL '18 days')::DATE,
        'completado', v_pct, v_fee, v_precio - v_fee, 'completado',
        v_fecha + INTERVAL '3 days'
      ) RETURNING id, client_id INTO v_proj_id, v_uid;

      INSERT INTO payments (
        project_id, client_id, professional_id,
        amount, gross_amount, currency,
        platform_commission_pct, commission_amount, professional_amount,
        stripe_payment_intent_id, status, paid_at, created_at
      ) VALUES (
        v_proj_id, v_uid, v_pp_id,
        v_precio, v_precio, 'eur',
        v_pct, v_fee, v_precio - v_fee,
        'pi_dev_' || REPLACE(v_proj_id::TEXT, '-', ''),
        'completado',
        v_fecha + INTERVAL '19 days', v_fecha + INTERVAL '18 days'
      );

      -- ~85% de los trabajos reciben reseña. La nota depende del perfil:
      -- los veteranos puntúan mejor, pero hay dispersión real.
      IF RANDOM() < 0.85 THEN
        v_rating := CASE
          WHEN v_perfil >= 3 THEN (ARRAY[3,4,4,5,5,5,5,5])[1 + FLOOR(RANDOM()*8)::INT]
          ELSE                    (ARRAY[1,2,3,3,4,4,5,5,5])[1 + FLOOR(RANDOM()*9)::INT]
        END;

        INSERT INTO reviews (
          project_id, reviewer_id, professional_id, rating,
          title, comment,
          rating_quality, rating_communication, rating_timeline, rating_value,
          is_verified_purchase, created_at
        ) VALUES (
          v_proj_id, v_uid, v_pp_id, v_rating,
          NULL,
          comentarios[1 + FLOOR(RANDOM() * ARRAY_LENGTH(comentarios,1))::INT],
          GREATEST(1, LEAST(5, v_rating + FLOOR(RANDOM()*3)::INT - 1)),
          GREATEST(1, LEAST(5, v_rating + FLOOR(RANDOM()*3)::INT - 1)),
          GREATEST(1, LEAST(5, v_rating + FLOOR(RANDOM()*3)::INT - 1)),
          GREATEST(1, LEAST(5, v_rating + FLOOR(RANDOM()*3)::INT - 1)),
          TRUE,
          v_fecha + INTERVAL '20 days'
        );
      END IF;
    END LOOP;

    UPDATE professional_profiles
       SET total_projects_completed = v_n_trabajos
     WHERE id = v_pp_id;
  END LOOP;

  -- ---------- LEADS ABIERTOS (para el feed del profesional) ----------
  FOR i IN 1..60 LOOP
    v_cat := cat_ids[1 + FLOOR(RANDOM() * n_cats)::INT];
    r := 1 + FLOOR(RANDOM() * peso_total)::INT;
    v_ciudad_ix := 1;
    WHILE r > pesos[v_ciudad_ix] LOOP
      r := r - pesos[v_ciudad_ix];
      v_ciudad_ix := v_ciudad_ix + 1;
    END LOOP;

    INSERT INTO leads (client_id, category_id, title, description,
                       budget_min, budget_max, location_city, urgency, status, created_at)
    VALUES (
      cliente_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(cliente_ids,1))::INT],
      v_cat,
      'Necesito ' || LOWER((SELECT name FROM categories WHERE id = v_cat)),
      'Solicitud abierta generada para pruebas de desarrollo.',
      200, 200 + FLOOR(RANDOM()*6000)::INT,
      ciudades[v_ciudad_ix],
      (ARRAY['baja','media','alta'])[1 + FLOOR(RANDOM()*3)::INT],
      'activo',
      NOW() - (RANDOM() * 25 || ' days')::INTERVAL
    );
  END LOOP;

  -- ---------- SUSCRIPCIONES (~12% en plan Pro) ----------
  IF to_regclass('public.professional_subscriptions') IS NOT NULL THEN
    INSERT INTO professional_subscriptions (professional_id, plan_id, status, current_period_end)
    SELECT pp_id, (SELECT id FROM subscription_plans WHERE slug = 'pro'),
           'active', NOW() + INTERVAL '30 days'
    FROM UNNEST(pro_pp_ids) AS pp_id
    WHERE RANDOM() < 0.12
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE 'Seed completado.';
  RAISE NOTICE 'Clientes: %  Profesionales: %', N_CLIENTES, N_PROS;
  RAISE NOTICE 'Password de todas las cuentas: HabitUpDev123!';
  RAISE NOTICE 'Ej: cliente001@dev.habitup.app / pro001@dev.habitup.app';
  RAISE NOTICE '--------------------------------------------';
END $$;

-- ---------- Resumen de lo cargado ----------
SELECT 'profesionales'   AS entidad, COUNT(*)::TEXT AS total FROM professional_profiles
UNION ALL SELECT 'clientes',     COUNT(*)::TEXT FROM users WHERE user_type = 'cliente'
UNION ALL SELECT 'proyectos',    COUNT(*)::TEXT FROM projects
UNION ALL SELECT 'resenas',      COUNT(*)::TEXT FROM reviews
UNION ALL SELECT 'leads activos',COUNT(*)::TEXT FROM leads WHERE status = 'activo'
UNION ALL SELECT 'sin resenas',  COUNT(*)::TEXT FROM professional_profiles WHERE total_reviews = 0;

-- Reparto por ciudad, para comprobar la densidad desigual.
SELECT location_city AS ciudad,
       COUNT(*)                                   AS profesionales,
       ROUND(AVG(avg_rating), 2)                  AS nota_media,
       COUNT(*) FILTER (WHERE total_reviews = 0)  AS sin_resenas
FROM professional_profiles
GROUP BY location_city
ORDER BY profesionales DESC;
