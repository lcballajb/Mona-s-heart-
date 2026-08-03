# Mona's Heart

Mona’s Heart is proprietary software owned by Prominent Life Investments.

## Terminology services

Medication autocomplete now uses the same-origin Node proxy for the official NLM RxNorm service when `RXNORM_PROXY_ENABLED=true`; it remains disabled by default and clearly labels fictional development fallback data. Diagnosis providers, ICD-10-CM, licensed SNOMED CT, LOINC/UCUM, official medication information, and reviewed educational associations use provenance-preserving abstractions and require production configuration and review. See [medication terminology](docs/medical/MEDICATION_TERMINOLOGY.md), [diagnosis terminology](docs/medical/DIAGNOSIS_TERMINOLOGY.md), and [the architecture decision](docs/architecture/ADR-003-terminology-services.md).

Mona’s Heart is a healthcare support application developed and operated by Prominent Life Investments.

> **Prototype only:** Use fictional data. Mona’s Heart provides peer support, educational information, and organizational tools. It does not provide medical advice, diagnosis, or treatment. If you may be experiencing a medical emergency, contact local emergency services immediately.

## What this hardening prototype includes

- Keyboard-accessible, debounced medication autocomplete shaped for a future **server-side RxNorm proxy**, with RxCUI metadata, an unverified free-text path, explicit add confirmation, and private-by-default history.
- Diagnosis autocomplete with terminology provenance, user experience labels, and diagnosis disclaimer.
- Provider-neutral, server-only AI interfaces, validated grounded-output schema, medical red-team guardrails, feature flags, human review and governance documents. AI is disabled without configuration.
- Deterministic explainable matching that uses confirmed factors and explicit privacy boundaries—never a hidden medical-risk score.
- Complementary and Integrative Wellness education with medication-replacement and interaction warnings.
- Draft security, privacy, accessibility, legal, hospital, HL7 FHIR/SMART, real-time communication, and incident-response architecture.
- PWA manifest, icon, privacy-safe offline fallback, and service worker that does not cache authenticated pages, health records, or documents.
- CI, tests, type checking, ESLint, Prettier, Git hooks, issue templates, Dependabot, and ownership files.

## Development

Requires Node.js 20+.

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

Major routes include `/`, `/signup`, `/onboarding`, `/dashboard`, `/health-profile`, `/medications`, `/matches`, `/messages`, `/calls`, `/documents`, `/wellness`, `/medical`, `/ai`, `/hospital`, `/accessibility`, `/privacy`, and `/terms`.

## Architecture and boundaries

`src/health` contains structured mock terminology; replace its search implementation with an authenticated, rate-limited server proxy before live terminology use. `src/ai` contains provider-neutral contracts, schemas, and guardrails. Client code must never import a provider secret. `src/features/flags.ts` defaults every high-risk capability off. See `docs/KNOWN_LIMITATIONS.md` before evaluation.

There is no backend, production identity, real authorization, persistence, EHR connection, AI vendor, or approved clinical workflow. Front-end role affordances are demonstrations, not security controls. Do not use real patient or confidential data. No legal compliance, HIPAA compliance, FDA approval, clinical validation, hospital approval, trademark or copyright registration, or patent protection is claimed.

## Ownership

© 2026 Prominent Life Investments. Mona’s Heart and all associated software, designs, content, workflows, and documentation are proprietary. All rights reserved. See [LICENSE](LICENSE).

## Secure backend foundation

The production direction is a separate Node/PostgreSQL API; see [ADR-002](docs/architecture/ADR-002-production-backend.md), the [security controls](docs/security/PRODUCTION_CONTROLS.md), and the normalized [migration](db/migrations/001_secure_foundation.sql). The checked-in API repository is useful for security-domain tests but its in-memory adapter is not production persistence. Health features remain demonstration-only and disabled pending professional reviews. Mona's Heart is owned by Prominent Life Investments; no HIPAA compliance claim is made.

## Backend persistence

The backend now supports dependency-injected `memory` and `postgres` adapters. Memory is intended only for local demos/tests. Production must set `DATABASE_ADAPTER=postgres`, a secret `DATABASE_URL`, verified TLS, and the pool/timeout settings described in [PostgreSQL setup](docs/backend/POSTGRESQL_SETUP.md); startup fails rather than falling back. Apply `npm run db:migrate` and the idempotent fictional seed with `npm run db:seed`. PostgreSQL integration tests use only `TEST_DATABASE_URL` via `npm run test:postgres`. See [ADR-004](docs/architecture/ADR-004-postgresql-persistence.md) and the operations runbook. Email delivery, production object storage, malware scanning, workers/monitoring, and final privacy, cybersecurity and legal approvals remain outstanding.

## Production-service readiness

Provider-neutral email, object storage, malware scanning, durable workers, shared controls, privacy-conscious observability and health endpoints are documented under `docs/backend` and `docs/operations`. Development adapters are mocks and cannot silently start in production. The staging compose plan uses fictional data only; no live provider, clinical integration, EHR/FHIR connection, or compliance certification is implied. Prominent Life Investments retains proprietary ownership as described in `docs/OWNERSHIP.md`.
