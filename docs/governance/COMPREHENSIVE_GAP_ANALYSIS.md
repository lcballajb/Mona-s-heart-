# Comprehensive gap analysis

**Assessment date:** 2026-08-04. This is a repository review, not production inspection or compliance/clinical/security certification. “Partial” means artifacts exist, not controls operate. Priority is the earliest gate; later gates still apply.

| Domain                              | State   | Classification                          | Evidence-based gap                                                                 |
| ----------------------------------- | ------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Product architecture                | Partial | Required before private beta            | Prototype boundaries exist; production context/feature inventory not verified      |
| Backend architecture                | Partial | Critical before any real user data      | Adapters exist; production topology and fail-closed verification absent            |
| Database design                     | Partial | Critical before any real user data      | PostgreSQL path exists; independent schema, tenancy and migration review missing   |
| Authentication                      | Partial | Critical before any real user data      | Prototype security exists; production identity/session/MFA recovery not proven     |
| Authorization                       | Partial | Critical before any real user data      | Access policy exists; object/tenant authorization abuse tests incomplete           |
| Consent                             | Partial | Critical before any real user data      | Design docs exist; versioned jurisdictional consent evidence incomplete            |
| Audit logging                       | Partial | Critical before any real user data      | Logging guidance exists; immutable production audit/alert testing missing          |
| User privacy                        | Partial | Critical before any real user data      | Data inventory/flows drafted; professional review and runtime verification missing |
| Organization privacy                | Missing | Required before hospital pilot          | Tenant notices, admin boundaries and contracts missing                             |
| Secure messaging                    | Missing | Required before private beta            | Architecture only; encryption, abuse, retention and delivery semantics unverified  |
| Notifications                       | Missing | Required before private beta            | Consent/preferences/quiet hours/provider delivery absent                           |
| Video calling                       | Missing | Required before hospital pilot          | WebRTC/vendor/E2EE/accessibility/clinical boundaries absent                        |
| Upload security                     | Partial | Critical before any real user data      | Service abstractions exist; content validation/quarantine tests incomplete         |
| Malware scanning                    | Partial | Critical before any real user data      | Adapter exists; production scanner/fail-closed quarantine not proven               |
| Object storage                      | Partial | Critical before any real user data      | Provider abstraction exists; bucket IAM/encryption/lifecycle unverified            |
| Email delivery                      | Partial | Required before private beta            | Provider abstraction; domain auth/suppression/privacy unverified                   |
| Background jobs                     | Partial | Required before private beta            | Worker exists; idempotency/dead-letter/PHI logging operations incomplete           |
| Monitoring                          | Partial | Critical before any real user data      | Observability code exists; production alerting/redaction/on-call absent            |
| Incident response                   | Partial | Critical before any real user data      | Plan exists; staffed exercise and legal matrices missing                           |
| Backup and recovery                 | Partial | Critical before any real user data      | Scripts/runbooks exist; encrypted production restore evidence absent               |
| Disaster recovery                   | Partial | Required before private beta            | Plan exists; RTO/RPO exercise and dependency failure test missing                  |
| Business continuity                 | Partial | Required before private beta            | Draft exists; staffing/vendor/comms exercise absent                                |
| Accessibility                       | Partial | Required before private beta            | Plans exist; independent assistive-tech evaluation absent                          |
| Localization                        | Missing | Required before international expansion | No governed translation/content QA                                                 |
| Internationalization                | Missing | Required before international expansion | RTL, locale/date/number and data residency not proven                              |
| Clinical terminology                | Partial | Required before private beta            | Adapters/mappings exist; licensed refresh and clinical validation missing          |
| FHIR readiness                      | Partial | Required before hospital pilot          | Architecture only; no supported version/conformance evidence                       |
| SMART on FHIR readiness             | Partial | Required before hospital pilot          | Plan only; authorization/EHR sandbox certification absent                          |
| AI safety                           | Partial | Required before private beta            | Guardrails documented; no approved model/evaluation; AI stays off                  |
| AI governance                       | Partial | Required before private beta            | Policies/register added; staffed approvals and monitoring absent                   |
| Medical-content review              | Missing | Critical before any real user data      | Governance template only; qualified reviewers/content records missing              |
| Complementary-health review         | Missing | Critical before any real user data      | Governance template only; interaction review missing                               |
| Community moderation                | Missing | Required before private beta            | Program drafted; tools/staffing/exercises absent; features should remain off       |
| Child and minor safety              | Blocked | Required before private beta            | Minors mode must remain off pending independent/legal review                       |
| Research use                        | Blocked | Future capability                       | Research OFF; protocol/ethics infrastructure absent                                |
| Hospital deployment                 | Blocked | Required before hospital pilot          | Procurement, BAA/applicability, integration/security review absent                 |
| Mobile application readiness        | Missing | Future capability                       | Web/PWA exists; native lifecycle/privacy/accessibility unassessed                  |
| App-store readiness                 | Missing | Future capability                       | No store policy, privacy labels, review or account-deletion validation             |
| Legal documents                     | Partial | Critical before any real user data      | Unapproved policy drafts added; qualified review required                          |
| Intellectual property documentation | Partial | Recommended improvement                 | Plan only; searches/assignments/registrations not verified                         |
| Vendor management                   | Missing | Critical before any real user data      | Registers are empty; diligence/contracts/exit tests absent                         |
| Insurance/risk transfer             | Missing | Required before private beta            | Broker/counsel assessment and coverage absent                                      |
| Production deployment               | Blocked | Critical before any real user data      | Staging artifacts only; production controls/evidence absent                        |
| Release management                  | Partial | Required before private beta            | Procedures added; protected environments/canary evidence absent                    |
| Support operations                  | Missing | Required before private beta            | Staffing, SLAs, escalation, privacy verification absent                            |
| Data-subject requests               | Partial | Critical before any real user data      | Procedure draft; identity verification and execution tests absent                  |
| Records retention                   | Partial | Critical before any real user data      | Schedule exists; legally approved automated enforcement absent                     |
| Account deletion                    | Partial | Critical before any real user data      | Design exists; end-to-end vendor/backup deletion evidence absent                   |
| Security testing                    | Partial | Critical before any real user data      | CI/tests exist; SAST/container/pentest and independent review missing              |
| Independent professional review     | Missing | Critical before any real user data      | No verified legal/privacy/security/clinical/accessibility approvals                |

## Critical risk synthesis

Do not accept real user data until qualified owners verify production identity/authorization, consent, privacy, audit, uploads/storage, monitoring/incidents, recovery, deletion/retention, vendors, medical content and legal scope. Keep AI, research, minors, community matching/messaging/video, hospital and international modes disabled. Repository documents cannot demonstrate cloud settings, staffing, contracts, professional review or operational effectiveness.

## Method and uncertainty

Reviewed tracked source, tests, configuration and existing documentation; no deployed environment, GitHub settings, vendor contract, legal advice, penetration report, clinical validation or accessibility audit was available. Reassess after each material implementation and independent evidence review.
