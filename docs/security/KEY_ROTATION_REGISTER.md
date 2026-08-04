# Key and credential rotation register

Do not record secret values.

| Credential class                         | Owner               | Rotation trigger/cadence                                      | Last/next                 | Revocation test | Evidence |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------- | ------------------------- | --------------- | -------- |
| Production app/database/storage/email/AI | Security+Operations | Incident, personnel/vendor change; cadence set by risk/vendor | Never / before production | Missing         | Missing  |
| TLS certificates                         | Operations          | Automated before expiry                                       | Unknown                   | Missing         | Missing  |
| Signing/encryption keys                  | Security            | Cryptoperiod and compromise plan required                     | None                      | Missing         | Missing  |

Use managed secret storage, dual control for high-impact keys, overlap only during verified migration, revoke old material, and test recovery.
