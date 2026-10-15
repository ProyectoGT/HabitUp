-- =====================================================
-- MIGRATION 022: Revoke PostgREST access to spatial_ref_sys
--
-- spatial_ref_sys is a PostGIS system table owned by the superuser.
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is not possible from
-- migrations. Revoking SELECT from the PostgREST roles achieves the
-- same outcome: the table is inaccessible via the API.
-- =====================================================
REVOKE SELECT ON public.spatial_ref_sys FROM anon, authenticated;
