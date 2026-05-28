-- =====================================================
-- SEED: Crear usuario admin inicial
-- Ejecutar SOLO en desarrollo / primera vez:
--   1. Crea un auth user (admin@habitup.com / Admin123!)
--   2. La trigger on_auth_user_created crea la fila en users
--   3. Cambiamos user_type a 'admin'
--
-- Para producción: crear el admin desde el backoffice
-- o directamente en Supabase Auth UI.
-- =====================================================

-- Crear usuario en auth.users (solo si no existe)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'admin@habitup.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"full_name": "Admin HabitUp", "user_type": "admin"}'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@habitup.com'
);

-- La trigger on_auth_user_created ya crea la fila en public.users
-- Solo necesitamos asegurar user_type = 'admin'
UPDATE public.users
SET
  user_type = 'admin',
  is_verified = TRUE,
  verified_at = NOW()
WHERE email = 'admin@habitup.com';
