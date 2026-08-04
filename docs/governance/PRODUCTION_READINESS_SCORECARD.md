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
