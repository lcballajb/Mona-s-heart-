-- Stable ordering even when multiple consent choices share a transaction timestamp.
-- Existing history is preserved; do not infer new grants from old profile snapshots.
ALTER TABLE consent_records ADD COLUMN event_order bigint GENERATED ALWAYS AS IDENTITY;
CREATE INDEX consent_user_event_order ON consent_records(user_id,event_order DESC);
