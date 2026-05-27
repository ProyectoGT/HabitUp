-- =====================================================
-- MIGRATION 010: Messages UPDATE policy for markAsRead
-- =====================================================
-- Before this migration, messages had only SELECT and INSERT
-- policies.  The `markAsRead` flow (UPDATE is_read, read_at)
-- was silently blocked by RLS (default-deny for all operations
-- without an explicit policy).
--
-- This policy allows the recipient of a message to mark it as
-- read, but ONLY if they are a participant in the project.
-- The WITH CHECK prevents modifying any column other than
-- is_read/read_at by requiring the final state to have
-- is_read=true and read_at IS NOT NULL.
-- =====================================================

DROP POLICY IF EXISTS "messages: destinatario marca como leido" ON messages;

CREATE POLICY "messages: destinatario marca como leido"
  ON messages
  FOR UPDATE
  USING (
    recipient_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM projects p
      LEFT JOIN professional_profiles pp ON pp.id = p.professional_id
      WHERE p.id = messages.project_id
        AND (p.client_id = auth.uid() OR pp.user_id = auth.uid())
    )
  )
  WITH CHECK (
    recipient_id = auth.uid()
    AND is_read = true
    AND read_at IS NOT NULL
  );
