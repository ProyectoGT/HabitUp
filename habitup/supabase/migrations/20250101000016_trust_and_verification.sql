-- =====================================================
-- MIGRATION 016: Trust & Verification System
--
-- 1. verification_documents table (per-professional docs)
-- 2. Trigger: mark review as verified purchase
-- 3. Trigger: auto-update total_projects_completed
-- 4. RLS policies for verification_documents
-- 5. View: professional_trust_summary (public)
-- =====================================================

-- ═════════════════════════════════════════════════════════
-- 1. Verification documents
-- ═════════════════════════════════════════════════════════
-- Each professional can submit multiple documents.
-- Status lifecycle: pendiente → aprobado | rechazado → pendiente (re-submit)

CREATE TABLE IF NOT EXISTS verification_documents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id    UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  document_type      TEXT NOT NULL CHECK (document_type IN (
                        'nif_cif', 'identificacion', 'seguro_responsabilidad',
                        'certificado_profesional', 'licencia', 'otro'
                      )),
  file_path          TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  rejection_reason   TEXT,
  reviewed_by        UUID REFERENCES users(id),
  reviewed_at        TIMESTAMPTZ,
  expires_at         DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_verification_documents_updated_at ON verification_documents;
CREATE TRIGGER trg_verification_documents_updated_at
  BEFORE UPDATE ON verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═════════════════════════════════════════════════════════
-- 2. Auto-set nif_cif_verified when nif_cif doc is approved
-- ═════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apply_document_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprobado' AND OLD.status IS DISTINCT FROM 'aprobado' THEN
    IF NEW.document_type = 'nif_cif' THEN
      UPDATE professional_profiles
      SET nif_cif_verified = TRUE
      WHERE id = NEW.professional_id;
    END IF;

    -- Si todos los documentos del profesional están aprobados, marcar documents_verified
    IF NOT EXISTS (
      SELECT 1 FROM verification_documents
      WHERE professional_id = NEW.professional_id
        AND status != 'aprobado'
    ) THEN
      UPDATE professional_profiles
      SET documents_verified = TRUE
      WHERE id = NEW.professional_id;
    END IF;
  END IF;

  IF NEW.status = 'rechazado' AND OLD.status IS DISTINCT FROM 'rechazado' THEN
    IF NEW.document_type = 'nif_cif' THEN
      UPDATE professional_profiles
      SET nif_cif_verified = FALSE
      WHERE id = NEW.professional_id;
    END IF;

    -- Si algún documento está rechazado, desmarcar documents_verified
    UPDATE professional_profiles
    SET documents_verified = FALSE
    WHERE id = NEW.professional_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_document_verification ON verification_documents;
CREATE TRIGGER trg_apply_document_verification
  AFTER UPDATE OF status ON verification_documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.apply_document_verification();

-- ═════════════════════════════════════════════════════════
-- 3. Mark review as verified purchase (only from real projects)
-- ═════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mark_review_verified_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_status TEXT;
BEGIN
  SELECT status INTO v_project_status
  FROM projects
  WHERE id = NEW.project_id;

  IF v_project_status = 'completado' THEN
    NEW.is_verified_purchase := TRUE;
  ELSE
    NEW.is_verified_purchase := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_review_verified_purchase ON reviews;
CREATE TRIGGER trg_mark_review_verified_purchase
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_review_verified_purchase();

-- ═════════════════════════════════════════════════════════
-- 4. Auto-update total_projects_completed when project completes
-- ═════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_professional_project_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status IS DISTINCT FROM 'completado' THEN
    UPDATE professional_profiles
    SET total_projects_completed = total_projects_completed + 1
    WHERE id = NEW.professional_id;
  END IF;

  IF OLD.status = 'completado' AND NEW.status IS DISTINCT FROM 'completado' THEN
    UPDATE professional_profiles
    SET total_projects_completed = GREATEST(total_projects_completed - 1, 0)
    WHERE id = OLD.professional_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_professional_project_count ON projects;
CREATE TRIGGER trg_update_professional_project_count
  AFTER UPDATE OF status ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_project_count();

-- ═════════════════════════════════════════════════════════
-- 5. View: professional_trust_summary (public, read-only)
-- ═════════════════════════════════════════════════════════
-- Expone señales de confianza agregadas sin datos sensibles.

DROP VIEW IF EXISTS public.professional_trust_summary;

CREATE VIEW public.professional_trust_summary WITH (security_invoker = TRUE) AS
SELECT
  pp.id AS professional_id,
  pp.nif_cif_verified,
  pp.documents_verified,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.response_time_hours,
  pp.experience_years,
  pp.is_active,
  pp.accepts_new_leads,
  -- Compuesto: un profesional está "fully verified" si:
  --   - NIF/CIF verificado
  --   - Documentos verificados
  --   - Tiene al menos 1 reseña
  (pp.nif_cif_verified AND pp.documents_verified AND pp.total_reviews > 0) AS is_fully_verified,
  -- Cuenta de documentos aprobados por tipo
  (SELECT COUNT(*) FROM verification_documents vd
   WHERE vd.professional_id = pp.id AND vd.status = 'aprobado') AS approved_documents,
  -- Documentos pendientes
  (SELECT COUNT(*) FROM verification_documents vd
   WHERE vd.professional_id = pp.id AND vd.status = 'pendiente') AS pending_documents
FROM professional_profiles pp;

-- ═════════════════════════════════════════════════════════
-- 6. RLS policies on verification_documents
-- ═════════════════════════════════════════════════════════

ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Profesional puede ver sus propios documentos
DROP POLICY IF EXISTS "verification_documents: lectura propio" ON verification_documents;
CREATE POLICY "verification_documents: lectura propio"
  ON verification_documents FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- Profesional puede insertar documentos para sí mismo
DROP POLICY IF EXISTS "verification_documents: insercion propio" ON verification_documents;
CREATE POLICY "verification_documents: insercion propio"
  ON verification_documents FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  );

-- Solo admin puede cambiar estado
DROP POLICY IF EXISTS "verification_documents: actualizacion admin" ON verification_documents;
CREATE POLICY "verification_documents: actualizacion admin"
  ON verification_documents FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- El profesional puede eliminar solo documentos en estado pendiente
DROP POLICY IF EXISTS "verification_documents: borrado propio pendiente" ON verification_documents;
CREATE POLICY "verification_documents: borrado propio pendiente"
  ON verification_documents FOR DELETE
  USING (
    status = 'pendiente'
    AND professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  );

-- ═════════════════════════════════════════════════════════
-- 7. Grant permissions
-- ═════════════════════════════════════════════════════════

GRANT SELECT ON public.professional_trust_summary TO authenticated, anon;
