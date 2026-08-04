# Production readiness scorecard

Statuses: Complete, Partially complete, Missing, Blocked, Requires professional review. No category is “Complete” based only on repository artifacts.

| Gate                                     | Status                       | Evidence / exit criterion                                    |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Product/backend/database                 | Partially complete           | Independent architecture/tenant/migration/load review        |
| Identity, authorization, consent, audit  | Partially complete           | Production configuration and adversarial end-to-end evidence |
| Privacy, retention, deletion, rights     | Requires professional review | Legal decisions plus tested vendor/backup workflows          |
| Upload/storage/malware/email/jobs        | Partially complete           | Fail-closed production integration and recovery tests        |
| Monitoring/incident/backup/DR/continuity | Partially complete           | Staffed exercises and restore evidence                       |
| Legal policies/jurisdictions             | Requires professional review | Qualified signed approvals; version/notice/consent release   |
| Clinical/integrative content             | Blocked                      | Qualified reviewers and approved content registry            |
| AI                                       | Blocked                      | Exact model approval/evaluation/contract; currently disabled |
| Minors/research/community/video          | Blocked                      | Independent/legal/safety review and staffed controls         |
| Accessibility/localization               | Requires professional review | Independent evaluation; locale/RTL testing                   |
| FHIR/SMART/hospital                      | Blocked                      | Partner sandbox, conformance, procurement/IT review          |
| Vendors/insurance/IP                     | Missing                      | Contracts, reviews, broker/counsel evidence                  |
| Security/release/support                 | Partially complete           | Independent testing, protected environments, staffed support |
| International/mobile/app stores          | Blocked                      | Country/store-specific review and implementation             |

**Overall: Blocked for production and real user data.** Product owner may change a status only with linked, scoped, dated evidence and verifier identity; professional-review items cannot be self-approved.

## Numeric cross-reference

The reproducible repository maturity, security, production, governance, AI, accessibility and technical-debt scores are maintained in [`MASTER_REPOSITORY_AUDIT.md`](MASTER_REPOSITORY_AUDIT.md). This gate table remains the authoritative status view. A numeric score can never override a Blocked or Requires professional review gate.

## Multi-agent architecture gate

**Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

| Gate                                  | Status                      | Evidence / exit criterion                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Governed multi-agent operating system | Future capability / Blocked | Named accountable humans; approved registry and model/tool/source inventory; threat/privacy/clinical/legal reviews; synthetic adversarial evaluation; least-privilege gateway; audit/cost controls; tested kill switch and rollback; separately approved Phase A sandbox. Planning documents alone do not satisfy this gate. |

No production-readiness score includes an implemented agent system. Every proposed agent is disabled and has no production, user-data, merge, deployment, diagnosis, prescribing, or controlled-publication authority.
