-- Account recovery must have at most one active token per account and purpose.
-- Retain the newest token when upgrading an installation with outstanding
-- siblings, then enforce the invariant independently of application code.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, purpose
           ORDER BY created_at DESC, id DESC
         ) AS position
  FROM account_tokens
  WHERE consumed_at IS NULL
)
UPDATE account_tokens tokens
SET consumed_at = now()
FROM ranked
WHERE tokens.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX account_tokens_one_active_per_purpose
  ON account_tokens(user_id, purpose)
  WHERE consumed_at IS NULL;
