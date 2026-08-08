# Implemented API reference

**Source of truth:** `server/index.mjs`; this inventory is descriptive, not a stable public contract. The parser caps JSON bodies at 32 KiB. Production requests require the configured HTTPS/proxy boundary. Unknown routes return 404; exceptions are logged through redaction and return generic errors.

| Method/path                             | Authentication     | CSRF | Purpose / current boundary                                                                     |
| --------------------------------------- | ------------------ | ---- | ---------------------------------------------------------------------------------------------- |
| `GET /health/live`                      | None               | No   | Process liveness only; must not depend on downstreams                                          |
| `GET /health/ready`                     | None               | No   | Dependency readiness with redacted status                                                      |
| `GET /health/dependencies`              | None               | No   | Redacted dependency detail for operational diagnosis                                           |
| `GET /v1/terminology/health`            | None               | No   | Redacted terminology-provider circuit status                                                   |
| `GET /v1/terminology/medications?q=`    | None               | No   | Bounded server-side medication lookup; provider/provenance behavior is configuration dependent |
| `POST /v1/auth/register`                | None               | No   | Register bounded email/password/public role; fictional-data prototype only                     |
| `POST /v1/auth/verify`                  | Verification token | No   | Complete email verification and invalidate sibling verification tokens                         |
| `POST /v1/auth/password-reset/request`  | None               | No   | Return an enumeration-resistant response and request a bounded reset email                     |
| `POST /v1/auth/password-reset/complete` | Reset token        | No   | Change the password, revoke sessions, and invalidate all outstanding reset tokens              |
| `POST /v1/auth/sign-in`                 | Credentials        | No   | Create HttpOnly, SameSite=Strict session cookie and return CSRF token/expiry                   |
| `POST /v1/auth/sign-out`                | Session cookie     | Yes  | Revoke current session and clear cookie                                                        |
| `GET /v1/auth/sessions`                 | Session cookie     | No   | List the account's active sessions without token or CSRF digests                               |
| `DELETE /v1/auth/sessions/{id}`         | Session cookie     | Yes  | Revoke an account-owned session; cross-account identifiers are denied                          |
| `POST /v1/auth/password/change`         | Session cookie     | Yes  | Verify the current password, change it, revoke all sessions, and send a security notification  |
| `POST /v1/account/export`               | Session cookie     | Yes  | Queue an account-scoped export request                                                         |
| `DELETE /v1/account`                    | Session cookie     | Yes  | Mark the account for deletion, revoke sessions, and queue the governed deletion workflow       |

Every request is subject to rate limiting. Authenticated application service methods exist for health, documents, organizations, consent, export, deletion, moderation and feature flags, but they are not all exposed as HTTP routes. Do not document or consume them as APIs until explicit route authorization, schema, status/error semantics and contract tests are added.

Authentication input is normalized and allowlisted before service processing. Production session lookup digests are HMAC-SHA-256 values keyed with `SESSION_PEPPER`; the raw cookie is never persisted.

## Missing contract controls

No OpenAPI document, API version retirement policy, pagination standard, idempotency-key contract, request correlation response header, public error catalog, webhook signature contract, or browser E2E/API contract suite exists. Add these only with the first consumer/integration and use a dedicated ADR for compatibility policy.
