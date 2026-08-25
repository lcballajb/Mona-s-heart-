-- Close the remaining user-owned-table RLS gaps. Database roles are provisioned
-- by infrastructure, not by ordinary application migrations.
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE conversation_members FORCE ROW LEVEL SECURITY;
ALTER TABLE consent_records FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE export_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY conversation_member_access ON conversation_members
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY own_consent ON consent_records
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY own_notification ON notifications
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY own_export ON export_requests
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY own_deletion ON deletion_requests
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY own_import ON imported_records;
CREATE POLICY own_import ON imported_records
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    AND (document_id IS NULL OR EXISTS (
      SELECT 1 FROM documents
       WHERE documents.id = imported_records.document_id
         AND documents.owner_id = nullif(current_setting('app.user_id', true), '')::uuid
         AND documents.deleted_at IS NULL
    ))
  );
