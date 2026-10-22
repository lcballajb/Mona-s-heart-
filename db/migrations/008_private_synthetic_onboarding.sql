-- Inherits profiles forced owner RLS and account-deletion cascade.
-- Synthetic-only plaintext; production health encryption remains a release gate.
ALTER TABLE profiles ADD COLUMN onboarding jsonb
  CHECK (onboarding IS NULL OR (jsonb_typeof(onboarding) = 'object'
    AND octet_length(onboarding::text) <= 12000));
