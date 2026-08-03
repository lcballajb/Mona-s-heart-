-- Roll-forward production persistence additions. This migration is transactional.
ALTER TABLE users ADD COLUMN password_algorithm text NOT NULL DEFAULT 'scrypt-v1';
ALTER TABLE users ADD CONSTRAINT users_failed_attempts_nonnegative CHECK (failed_attempts >= 0);
ALTER TABLE account_tokens ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE consent_records ADD COLUMN granted boolean NOT NULL DEFAULT true;
ALTER TABLE consent_records ADD COLUMN region text NOT NULL DEFAULT 'unspecified';
ALTER TABLE consent_records ADD COLUMN language text NOT NULL DEFAULT 'en';
ALTER TABLE consent_records ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE audit_events ADD COLUMN action_result text NOT NULL DEFAULT 'success';
ALTER TABLE audit_events ADD COLUMN request_id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE sessions ADD COLUMN refresh_token_digest bytea UNIQUE;
ALTER TABLE sessions ADD COLUMN device_metadata jsonb NOT NULL DEFAULT '{}';
CREATE INDEX sessions_user_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE mfa_enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, method text NOT NULL, secret_ciphertext bytea, enrolled_at timestamptz, disabled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE login_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), email_hash bytea NOT NULL, succeeded boolean NOT NULL, request_id uuid NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX login_attempts_user_time ON login_attempts(user_id, attempted_at DESC);

ALTER TABLE documents RENAME COLUMN storage_key TO encrypted_object_key;
ALTER TABLE documents ADD COLUMN object_id text UNIQUE;
ALTER TABLE documents ADD COLUMN storage_provider text NOT NULL DEFAULT 'development_mock';
ALTER TABLE documents ADD COLUMN checksum text;
ALTER TABLE documents ADD COLUMN retention_at timestamptz;
ALTER TABLE documents ADD COLUMN deleted_at timestamptz;
ALTER TABLE documents ADD COLUMN access_policy jsonb NOT NULL DEFAULT '{}';
ALTER TABLE imported_records ADD COLUMN deleted_at timestamptz;

ALTER TABLE background_jobs RENAME COLUMN payload TO legacy_payload;
ALTER TABLE background_jobs ALTER COLUMN legacy_payload SET DEFAULT '{}';
ALTER TABLE background_jobs RENAME COLUMN available_at TO scheduled_at;
ALTER TABLE background_jobs RENAME COLUMN last_error TO failure_reason;
ALTER TABLE background_jobs ADD COLUMN payload_reference uuid;
ALTER TABLE background_jobs ADD COLUMN completed_at timestamptz;
ALTER TABLE background_jobs ADD COLUMN dead_lettered boolean NOT NULL DEFAULT false;
ALTER TABLE background_jobs ADD CONSTRAINT jobs_status CHECK(status IN ('queued','running','completed','failed','cancelled'));
ALTER TABLE background_jobs ADD CONSTRAINT jobs_attempts_nonnegative CHECK(attempts >= 0);

CREATE TABLE export_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','ready','expired','failed')), object_id text, requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, expires_at timestamptz NOT NULL);
CREATE INDEX exports_owner_time ON export_requests(user_id, requested_at DESC);
CREATE TABLE deletion_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), status text NOT NULL DEFAULT 'pending_verification' CHECK(status IN ('pending_verification','cooling_off','processing','completed','cancelled','legal_hold')), verified_at timestamptz, cooling_off_until timestamptz NOT NULL, legal_hold boolean NOT NULL DEFAULT false, requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE INDEX deletions_owner_time ON deletion_requests(user_id, requested_at DESC);

CREATE TABLE storage_objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_id text UNIQUE NOT NULL, owner_id uuid NOT NULL REFERENCES users(id), provider text NOT NULL, encrypted_object_key text NOT NULL, mime_type text NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes > 0), checksum text NOT NULL, malware_scan_status text NOT NULL DEFAULT 'pending', retention_at timestamptz, deleted_at timestamptz, access_policy jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON profiles USING (user_id=nullif(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY own_import ON imported_records USING (user_id=nullif(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY conversation_access ON conversations USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=conversations.id AND cm.user_id=nullif(current_setting('app.user_id',true),'')::uuid));
CREATE POLICY organization_scope ON organization_memberships USING (organization_id = ANY(string_to_array(nullif(current_setting('app.organization_ids',true),''),',')::uuid[]));

CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit events are append-only'; END $$;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

CREATE INDEX health_owner_kind_time ON health_entries(user_id,kind,created_at DESC);
CREATE INDEX documents_owner_time ON documents(owner_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX consent_owner_purpose_time ON consent_records(user_id,purpose,granted_at DESC);
CREATE INDEX memberships_user_status ON organization_memberships(user_id,status);
