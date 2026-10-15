-- =====================================================
-- MIGRATION 023: Fix signup 500 (duplicate key users_pkey)
-- El signup fallaba con 23505 porque public.users ya recibía
-- una fila para el nuevo auth user (trigger duplicado en la BD
-- remota). Se hace el insert idempotente y se garantiza que solo
-- existe UN trigger sobre auth.users.
-- =====================================================

-- 1. Insert idempotente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Eliminar cualquier trigger duplicado sobre auth.users que no sea
--    on_auth_user_created y que ejecute una función de creación de usuario.
DO $$
DECLARE
  trg RECORD;
BEGIN
  FOR trg IN
    SELECT t.tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND NOT t.tgisinternal
      AND t.tgname <> 'on_auth_user_created'
      AND t.tgtype & 4 = 4  -- AFTER ... INSERT
  LOOP
    RAISE NOTICE 'Eliminando trigger duplicado: %', trg.tgname;
    EXECUTE format('DROP TRIGGER %I ON auth.users', trg.tgname);
  END LOOP;
END;
$$;

-- 3. Reafirmar el trigger canónico
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
