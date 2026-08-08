-- Table owners normally bypass row-level security. The API/deploy role split is an
-- operational control, but these sensitive tables must remain fail-closed even if
-- ownership is accidentally assigned to the runtime role.
ALTER TABLE health_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE imported_records FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
