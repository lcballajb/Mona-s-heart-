# System architecture and trust boundaries

**Evidence status:** verified from tracked source at 2026-08-04; no deployed production system was inspected.

## Runtime context

```text
Browser/PWA (untrusted) -- HTTPS/JSON --> Node API trust boundary
                                            |
                 +--------------------------+--------------------------+
                 |                          |                          |
          store interface            provider interfaces       external terminology
        memory (dev/test)            email/storage/scan         RxNorm/openFDA
        PostgreSQL (prod)            cache/monitoring           (server-side only)
                 |
        PostgreSQL trust boundary
      identity, consent, audit, health,
      organization, document and job data
```

The browser is never trusted for authorization, organization membership, consent state, terminology provenance, clinical approval, or feature enablement. Provider credentials are server-only. Production selection must fail closed: PostgreSQL replaces memory; real providers replace console/development mocks; HTTPS and trusted proxy configuration are explicit.

## Components and ownership

| Component             | Responsibility                                                               | Data/trust boundary                                                  | Canonical evidence                                              |
| --------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/`                | React UI, navigation, explicit fictional data and high-risk feature defaults | Browser is untrusted; no secrets or authoritative authorization      | `src/features/flags.ts`, `src/health/terminology.ts`, PWA files |
| `server/index.mjs`    | HTTP parsing, headers/CORS, rate limiting, cookies/CSRF and route dispatch   | Internet/API boundary; request size and authentication enforced here | API reference and security headers doc                          |
| `server/service.mjs`  | Identity, role, ownership, consent and audit business rules                  | Authorization boundary independent of UI                             | Access-control policy and tests                                 |
| Store implementations | Memory for tests/demos; PostgreSQL for production direction                  | Persistent sensitive-data boundary; transactions and tenant context  | ADR-004, migrations, data-access docs                           |
| Service providers     | Email, object storage, malware, cache, monitoring                            | Vendor/data-egress boundary; mocks prohibited in production          | ADR-005 and backend provider docs                               |
| Terminology           | Normalization, provenance, cache/circuit behavior                            | External official/licensed source boundary                           | ADR-003 and terminology docs                                    |
| AI contracts          | Output schema, safety guardrails and allowlist configuration check           | No provider/runtime call path exists                                 | AI governance and model registry                                |
| Worker                | Durable allowlisted background job execution                                 | Queue/retry/dead-letter boundary                                     | Worker architecture and jobs docs                               |

## Data flows

1. Registration/login: API validates bounded JSON, service hashes/verifies credentials, store persists identity/session digests, and audit events record security actions.
2. Health/organization access: authenticated actor reaches service-layer role/ownership checks; PostgreSQL transactions set user/organization context before RLS-sensitive operations.
3. Consent/rights: version, purpose, grant/withdrawal, export and deletion requests are persisted and audited; downstream vendor/backup completion is not implemented.
4. Documents: service authorizes owner-scoped signed operations; new objects remain quarantined until a valid scanner result. Only development adapters exist.
5. Terminology: browser calls same-origin API; server queries configured upstream with normalization, timeout, cache and provenance. No browser analytics receives the search.
6. AI: contracts and guardrails exist, but no configured model or provider invocation was found. AI remains disabled.

## Deployment and availability

Docker images split frontend, API and worker; staging Compose includes nginx and PostgreSQL with fictional-data constraints. No production IaC, orchestration, secrets manager, KMS, DNS/certificate monitor, autoscaling, network policy, SIEM, WAF or managed vendor configuration is tracked. These are **requires deployment review**, not assumed missing from every external environment.

## Mobile boundary

The repository contains a responsive PWA manifest/service worker but no React Native, iOS, Android, Capacitor or native store project. Native/mobile-store readiness is a future product decision. Do not infer native security, offline health-data handling, platform attestation, store privacy labels or mobile accessibility from the PWA.
