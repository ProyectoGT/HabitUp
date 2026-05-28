-- =====================================================
-- MIGRATION 011: Storage buckets and RLS policies
-- =====================================================
-- Creates HabitUp's 4 storage buckets and all their RLS
-- policies on storage.objects.  Every policy is explicit
-- and versioned — no reliance on auto-generated defaults.
--
-- Buckets:
--   avatars               (public)  — profile pictures
--   lead-images            (public)  — lead photo attachments
--   portfolio-images       (public)  — portfolio gallery photos
--   verification-documents (private) — NIF/CIF, ID docs, etc.
--
-- File-naming convention:  {owner_id}/{uuid}.{ext}
-- Ownership is derived from the first path segment.
-- =====================================================

-- ═════════════════════════════════════════════════════════
-- 1. Create buckets  (idempotent — ON CONFLICT DO NOTHING)
-- ═════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,  -- 5 MiB
  '{image/jpeg,image/png,image/webp}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-images',
  'lead-images',
  TRUE,
  10485760,  -- 10 MiB
  '{image/jpeg,image/png,image/webp}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  TRUE,
  10485760,  -- 10 MiB
  '{image/jpeg,image/png,image/webp}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  FALSE,
  20971520,  -- 20 MiB
  '{image/jpeg,image/png,image/webp,application/pdf}'
)
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════
-- 2. RLS policies on storage.objects
-- ═════════════════════════════════════════════════════════
-- RLS is enabled by default on storage.objects.
-- Without an explicit policy every operation is denied.
--
-- Path convention for ownership checks:
--   storage.foldername(name)[1]  →  first folder segment
--   For {owner_id}/{uuid}.{ext}  →  owner_id

-- ── 2a. avatars ─────────────────────────────────────────
-- Public read
DROP POLICY IF EXISTS "avatars: lectura publica" ON storage.objects;
CREATE POLICY "avatars: lectura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users manage files inside their own folder only
DROP POLICY IF EXISTS "avatars: subida propia" ON storage.objects;
CREATE POLICY "avatars: subida propia"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: actualizacion propia" ON storage.objects;
CREATE POLICY "avatars: actualizacion propia"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: borrado propio" ON storage.objects;
CREATE POLICY "avatars: borrado propio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

-- ── 2b. lead-images ─────────────────────────────────────
-- Public read
DROP POLICY IF EXISTS "lead-images: lectura publica" ON storage.objects;
CREATE POLICY "lead-images: lectura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lead-images');

-- Insert: only the lead-owning client
DROP POLICY IF EXISTS "lead-images: subida cliente propietario" ON storage.objects;
CREATE POLICY "lead-images: subida cliente propietario"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM leads
      WHERE id::text = storage.foldername(name)[1]
        AND client_id = auth.uid()
    )
  );

-- Delete: only the lead-owning client
DROP POLICY IF EXISTS "lead-images: borrado cliente propietario" ON storage.objects;
CREATE POLICY "lead-images: borrado cliente propietario"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM leads
      WHERE id::text = storage.foldername(name)[1]
        AND client_id = auth.uid()
    )
  );

-- ── 2c. portfolio-images ────────────────────────────────
-- Public read
DROP POLICY IF EXISTS "portfolio-images: lectura publica" ON storage.objects;
CREATE POLICY "portfolio-images: lectura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- Insert: only the professional who owns the portfolio item
DROP POLICY IF EXISTS "portfolio-images: subida profesional propietario" ON storage.objects;
CREATE POLICY "portfolio-images: subida profesional propietario"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM portfolio_items pi
      JOIN professional_profiles pp ON pp.id = pi.professional_id
      WHERE pi.id::text = storage.foldername(name)[1]
        AND pp.user_id = auth.uid()
    )
  );

-- Delete: only the professional who owns the portfolio item
DROP POLICY IF EXISTS "portfolio-images: borrado profesional propietario" ON storage.objects;
CREATE POLICY "portfolio-images: borrado profesional propietario"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM portfolio_items pi
      JOIN professional_profiles pp ON pp.id = pi.professional_id
      WHERE pi.id::text = storage.foldername(name)[1]
        AND pp.user_id = auth.uid()
    )
  );

-- ── 2d. verification-documents (PRIVATE bucket) ─────────
-- NO public SELECT policy — files are NOT accessible via
-- public URL.  Reading requires a signed URL, which checks
-- RLS before generating.
--
-- Select: professional who uploaded OR admin user OR
--         service_role (Edge Functions / triggers)
DROP POLICY IF EXISTS "verification-documents: lectura propio o admin" ON storage.objects;
CREATE POLICY "verification-documents: lectura propio o admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND (
      storage.foldername(name)[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
          AND user_type = 'admin'
      )
      OR auth.role() = 'service_role'
    )
  );

-- Insert: the professional uploads into their own folder
DROP POLICY IF EXISTS "verification-documents: subida profesional" ON storage.objects;
CREATE POLICY "verification-documents: subida profesional"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.role() = 'authenticated'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

-- Update: the professional can replace their own documents
DROP POLICY IF EXISTS "verification-documents: actualizacion profesional" ON storage.objects;
CREATE POLICY "verification-documents: actualizacion profesional"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verification-documents'
    AND auth.role() = 'authenticated'
    AND storage.foldername(name)[1] = auth.uid()::text
  );

-- Delete: only admin or service_role (not the professional
-- themselves — prevents evidence removal)
DROP POLICY IF EXISTS "verification-documents: borrado admin" ON storage.objects;
CREATE POLICY "verification-documents: borrado admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-documents'
    AND (
      EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
          AND user_type = 'admin'
      )
      OR auth.role() = 'service_role'
    )
  );
