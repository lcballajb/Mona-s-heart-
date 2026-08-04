# Implemented API reference

**Source of truth:** `server/index.mjs`; this inventory is descriptive, not a stable public contract. The parser caps JSON bodies at 64 KiB. Production requests require the configured HTTPS/proxy boundary. Unknown routes return 404; exceptions are logged through redaction and return generic errors.

| Method/path                          | Authentication     | CSRF | Purpose / current boundary                                                                     |
| ------------------------------------ | ------------------ | ---- | ---------------------------------------------------------------------------------------------- |
| `GET /health/live`                   | None               | No   | Process liveness only; must not depend on downstreams                                          |
| `GET /health/ready`                  | None               | No   | Dependency readiness with redacted status                                                      |
| `GET /v1/terminology/medications?q=` | None               | No   | Bounded server-side medication lookup; provider/provenance behavior is configuration dependent |
| `POST /v1/auth/register`             | None               | No   | Register bounded email/password/display name; fictional-data prototype only                    |
| `POST /v1/auth/verify`               | Verification token | No   | Complete email verification                                                                    |
| `POST /v1/auth/login`                | Credentials        | No   | Create HttpOnly, SameSite=Strict session cookie and return CSRF token/expiry                   |
| `POST /v1/auth/logout`               | Session cookie     | Yes  | Revoke current session and clear cookie                                                        |

Every request is subject to rate limiting. Authenticated application service methods exist for health, documents, organizations, consent, export, deletion, moderation and feature flags, but they are not all exposed as HTTP routes. Do not document or consume them as APIs until explicit route authorization, schema, status/error semantics and contract tests are added.

## Missing contract controls

No OpenAPI document, API version retirement policy, pagination standard, idempotency-key contract, request correlation response header, public error catalog, webhook signature contract, or browser E2E/API contract suite exists. Add these only with the first consumer/integration and use a dedicated ADR for compatibility policy.
