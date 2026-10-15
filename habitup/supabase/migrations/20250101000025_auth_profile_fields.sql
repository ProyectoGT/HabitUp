-- Registration profile fields required by the mobile onboarding contract.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, phone, locality, postal_code, user_type,
    terms_accepted_at, marketing_consent
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'locality', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'postal_code', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'cliente'),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'accepted_terms')::BOOLEAN, FALSE) THEN NOW() ELSE NULL END,
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent')::BOOLEAN, FALSE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
