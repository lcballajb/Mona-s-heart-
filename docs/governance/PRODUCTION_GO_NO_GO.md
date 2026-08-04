# Production Go/No-Go checklist

**Current decision: NO-GO.** This checklist does not authorize production. Product, Engineering, Security, Privacy, Legal, Clinical and Operations must each sign scoped evidence; independent reviewers sign where stated.

| Gate                   | Required evidence                                                                                           | Decision                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------- |
| Scope and architecture | Released feature/data/vendor inventory, trust boundaries, ADRs, no production mock fallback test            | No-Go                       |
| Legal/privacy          | Counsel applicability decisions, approved policy versions, consent/notice/rights/retention/transfer tests   | No-Go—Requires Human Review |
| Identity/access        | Production identity recovery, MFA decision, role/tenant/object matrix, adversarial authorization test       | No-Go                       |
| Data/security          | IAM/KMS/secrets/encryption, audit integrity, upload/malware/storage controls, current vulnerability results | No-Go                       |
| Clinical/AI            | Approved content and reviewers; AI remains off or exact approved model/evaluation/gateway evidence          | No-Go—Requires Human Review |
| Reliability            | SLOs, dashboards/alerts, capacity test, backup success, witnessed restore, DR/BC exercise, on-call roster   | No-Go                       |
| Accessibility          | Critical journeys tested with supported browsers/AT; independent evaluation and remediation decision        | No-Go—Requires Human Review |
| Trust and safety       | High-risk features disabled or staffed moderation/reporting/appeals/crisis exercise                         | No-Go                       |
| Supply chain/release   | SBOM/license/CVE/container evidence, protected environment, signed approvals, canary/rollback rehearsal     | No-Go                       |
| Support/exit           | Support and incident communications staffed; export/deletion/vendor exit/shutdown paths tested              | No-Go                       |

A “Go” decision records commit/artifact, environment, scope, exclusions, evidence URLs, expiration, residual risks and every approver. Conditional approval must use expiring feature flags and must not waive a critical safety, privacy, security, or legal gate.
