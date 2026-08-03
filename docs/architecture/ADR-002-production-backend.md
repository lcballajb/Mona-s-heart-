# ADR-002: Node API with PostgreSQL security boundaries

- **Status:** Accepted (foundation)
- **Date:** 2026-08-03
- **Owner:** Prominent Life Investments

## Context and decision

Keep the React/Vite demonstration frontend and add a separately deployed Node.js API backed by PostgreSQL. The API owns authentication, authorization, validation, audit creation, consent, and signed access to encrypted object storage. Browser state is never an authority. Production will use a maintained PostgreSQL driver/pool and migrations in `db/migrations`; the dependency could not be vendored into this repository's restricted build environment, so the executable reference server currently uses an injected in-memory repository and is **not a production persistence adapter**.

PostgreSQL supplies transactions, constraints, normalized records, and defense-in-depth row-level security (RLS). The service authorization layer is primary because visibility depends on approved connections, mentor matches, and scoped organization membership. All health features remain disabled by default and demonstration-only pending medical, security, privacy, and legal reviews.

## Trust boundaries

A TLS-terminating gateway sends only HTTPS traffic to the API. Opaque, short-lived sessions are stored server-side; browsers receive `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Mutations require a per-session CSRF value. Passwords use salted memory-hard scrypt; reset/verification/session tokens are random and only digests are persisted. Privileged roles require immutable approval records from an administrator and cannot be selected at registration.

Private object storage rejects public access and uses per-object envelope encryption with a managed KMS key. `documents.storage_key` is an opaque locator; an API authorization check and successful malware scan are required before a short-lived download is issued. Rotation re-wraps data keys without exposing plaintext. Workers claim PostgreSQL `background_jobs` for mail, export, deletion, scanning, notification, and key-rotation work.

## Operations and environments

Development, test, staging, and production use separate accounts, databases, buckets, KMS keys, email projects, monitoring projects, and feature-flag rows. Secrets come from a managed secret store, never environment files in source control. Structured logs allow event names, request IDs, status, duration, and keyed pseudonymous identifiers only—never email, message text, tokens, document names, health values, or request bodies. Error monitoring applies the same scrubbing.

Deployments enforce rate limits at gateway and account/IP keyed login limits at the API; five failures cause a 15-minute account lock. Alerts cover authentication abuse, privileged actions, scanner failures, audit-pipeline failures, and anomalous export/document access. Incident hooks page the security/privacy on-call and preserve relevant immutable audit records.

Backups use provider encryption plus customer-managed keys, restricted restore roles, retention/deletion policy, and quarterly isolated restore tests with recorded recovery-time and recovery-point results. Key rotation is at least annual and immediately after suspected compromise; old keys remain only for controlled re-wrap/restore windows.

## Consequences

This design avoids unnecessary frontend replacement and supports horizontal API/workers. It requires a production PostgreSQL adapter, email provider, encrypted storage/KMS adapter, malware scanner, distributed rate limiter, and monitoring provider before launch. RLS policies must be expanded and penetration-tested alongside application authorization.
