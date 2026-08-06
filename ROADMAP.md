# Roadmap

## Production implementation sequence

Engineering delivery now follows the repository-wide [engineering execution plan](docs/engineering/ENGINEERING_EXECUTION_PLAN.md): runtime/infrastructure, authentication, authorization and database isolation, versioned API completion, audit/observability/testing, then controlled deployment. The current increment centralizes fail-closed API configuration. AI and multi-agent runtimes remain separately gated and disabled until the existing named prerequisites and approvals are satisfied.

## Prototype hardening

Independent clinical/pharmacy/legal/privacy/security/accessibility review; replace mock terminology through a server proxy; split monolithic UI; complete end-to-end tests.

## Controlled pilot (not approved)

Implement backend identity, authorization, consent, audit, moderation, rate limits, encrypted persistence, vendor review, localization, and incident exercises.

## Future evaluation

Separately approve AI providers, SMART on FHIR, hospital mode, minors, international regions, WebRTC, and research. No item implies clinical, legal, or hospital approval.

## Future phase: governed multi-agent operating system (planning only)

**Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

The planning foundation is in [`docs/agents/AGENT_ROADMAP.md`](docs/agents/AGENT_ROADMAP.md). Phase A proposes coordination and read-mostly agents; Phase B proposes specialist implementation-support agents; Phase C proposes hospital, partnership, localization, analytics, cost, research-governance, and global-expansion agents. Every role remains unapproved, feature-flagged off, least-privilege, human-supervised, auditable, and unable to auto-merge, deploy directly to production, diagnose, prescribe, publish controlled content, cross privacy boundaries, or learn from production user data without explicit governance and consent.
