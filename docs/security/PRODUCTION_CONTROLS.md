# Production security and privacy controls

Mona's Heart is owned by **Prominent Life Investments**. Health functionality is demonstration-only and must remain feature-flagged off until professional medical, privacy, security, and legal reviews approve release. This project does **not** claim HIPAA compliance.

- Terminate TLS 1.2+ at the gateway, redirect HTTP, enable HSTS after domain validation, and accept trusted proxy headers only from the gateway.
- Validate request shape and bounded lengths at every route. Parameterize all PostgreSQL statements; never concatenate user values. React escapes text by default; prohibit unsafe HTML and enforce CSP.
- Keep opaque sessions server-side, expire them after 30 minutes, rotate on privilege/MFA change, revoke on sign-out/deactivation/deletion, and require CSRF tokens on mutations. Optional MFA stores an encrypted TOTP/WebAuthn credential only after reauthentication and recovery-code generation.
- Apply gateway per-IP limits and Redis-backed per-account limits. Use generic authentication/recovery responses, incremental delay, five-attempt lockout, abuse telemetry, and verified-email activation.
- Restrict uploads by allowlisted MIME and magic bytes, 25 MiB limit, random storage keys, quarantine bucket, asynchronous malware scan, and deny download until clean. Never execute or inline user uploads.
- Envelope-encrypt objects and sensitive database columns with distinct KMS keys. Rotate and audit keys; encrypt backups and quarterly test isolated restores.
- Redact request bodies, authorization/cookie headers, email, health data, message content, filenames, and object keys from logs and monitoring. Hash identifiers with a separately managed rotating log key.
- Audit login, profile access/change, consent, export/deletion, role changes, document and organization access, and moderation. Forward append-only copies to retention-locked storage and alert if forwarding fails.
- Account deletion is a job: immediately deactivate/revoke, pseudonymize the login, erase user-controlled content and object keys under the retention policy, preserve only legally required minimal audit evidence, and issue completion status. Export jobs encrypt archives, expire links, and audit access.
- Authorized representatives require identity/proof review, explicit scoped authorization, expiry/revocation, conflict handling, and a separate login. No representative capability is enabled by this foundation.
