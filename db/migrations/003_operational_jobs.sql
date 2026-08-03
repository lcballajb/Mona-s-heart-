ALTER TABLE background_jobs ADD COLUMN correlation_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE background_jobs ADD COLUMN idempotency_key text;
CREATE UNIQUE INDEX background_jobs_idempotency ON background_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX background_jobs_claim ON background_jobs(scheduled_at, locked_at) WHERE completed_at IS NULL AND dead_lettered=false;
