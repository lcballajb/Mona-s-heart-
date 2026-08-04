# Ongoing compliance and technology watch

## Operating cycle

| Cadence   | Review                                                                                                                                                      | Evidence/output                           | Accountable        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------ |
| Weekly    | Dependency/security advisories, failed CI, certificates/domains, critical vendor notices                                                                    | Triage issue, SLA/owner/source/date       | Security/Ops       |
| Monthly   | Dependencies/licenses/SBOM, browsers/platform/app stores, AI vendors/models, terminology, accessibility, vulnerability and technology/deprecation registers | Updated register + decision               | Domain owners      |
| Quarterly | Legal policies/privacy, clinical/integrative content, AI, vendors, restore test, incident exercise, accessibility and DR                                    | Minutes, test evidence, approvals/actions | Governance council |
| Annual    | Terms/privacy, threat model, penetration-test plan, insurance/IP, hospital readiness, independent accessibility, clinical advisory board                    | Independent/professional reports          | Executive/Product  |

Scheduled workflows create reminder/scan issues only. They never decide applicability, alter legal/medical content, merge upgrades or publish policies. Owners verify authoritative sources, record uncertainty and route high-risk changes via the responsibility and change matrices. Missed critical review escalates to Product and blocks affected release. Metrics: overdue reviews, time-to-triage/mitigate, restore success, content expiry, appeal error, accessibility defects and vendor exit-test coverage—never reward unsafe closure.

## Governance calendar and evidence

| Frequency | Automation boundary                                                                                 | Human evidence required                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Daily     | Security workflow creates a triage reminder; it cannot read external runtime or organization alerts | Dependency/KEV, secret scanning, failed CI, runtime/API/database alerts and certificate/vendor evidence or explicit “unavailable” |
| Weekly    | Governance and security workflows create issues; weekly inventory attempts audit/SBOM               | Repository health, security, documentation, vulnerability SLA and artifact/run links                                              |
| Monthly   | Governance and standards issues                                                                     | Architecture/ADR drift, technical debt, cost, AI usage/vendor/model, platform/browser/terminology and accessibility decisions     |
| Quarterly | Governance and standards strategy issues                                                            | Dependency/platform strategy, governance/privacy/security/clinical/vendor reviews and restore/incident exercise results           |
| Annual    | Governance issue                                                                                    | DR/BC validation, all policies, roadmap, vendor/insurance/IP, hospital readiness and independent accessibility/clinical reviews   |

An issue is a reminder, not evidence of completion. The owner closes it only with source dates, reviewer, decision, uncertainty, follow-up, approval and artifact links. Overdue critical reviews are recorded in the risk register and block the affected release.

## Document boundary and cross-references

Cadence and evidence process only; domain registers retain their own decisions and histories. Use the [source register](AUTHORITATIVE_SOURCE_REGISTER.md), [regulatory watch](REGULATORY_WATCH_REGISTER.md), [standards watch](../interoperability/STANDARDS_WATCH.md), [security update register](../security/SECURITY_UPDATE_REGISTER.md), and [technology watch](../operations/TECHNOLOGY_WATCH.md).
