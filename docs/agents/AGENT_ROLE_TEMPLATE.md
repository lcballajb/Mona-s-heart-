# Agent role template

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Copy this template into the governed registry proposal; do not deploy it as configuration. Every field is mandatory. “None” requires an explanation.

| Field                       | Required content                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Role name / stable ID       | Human-readable role and immutable registry ID                                                                             |
| Phase / division            | Approved rollout phase and accountable organizational division                                                            |
| Mission                     | One outcome-oriented sentence                                                                                             |
| Detailed job description    | Scope, operating context, and explicit non-goals                                                                          |
| Responsibilities            | Bounded recurring duties                                                                                                  |
| Authorized actions          | Exact read, analyze, draft, test, or issue-creation actions                                                               |
| Prohibited actions          | Data, code, production, clinical, legal, financial, and communications prohibitions                                       |
| Inputs / outputs            | Allowed input classes; schema, label, destination, and evidence for outputs                                               |
| Required knowledge          | Approved internal documents, standards, and competencies                                                                  |
| Approved sources            | Named authoritative source classes and allowlisted endpoints                                                              |
| Tools                       | Approved tools and tool versions; no implicit shell/network access                                                        |
| Permissions                 | Resource/action/environment/data scopes, duration, and revocation owner                                                   |
| Decision authority          | Reversible low-risk decisions, if any; default is recommendation only                                                     |
| Human approval requirements | Named role, separation of duties, and approval evidence by risk class                                                     |
| Validation procedure        | Preconditions, source/provenance checks, tests, independent verification, and postconditions                              |
| Troubleshooting procedure   | Stop, preserve evidence, reproduce with synthetic data, diagnose, propose, validate                                       |
| Escalation path             | Severity triggers, primary/backup human owners, and timeout                                                               |
| KPIs                        | Safety- and quality-balanced measures; never reward action volume alone                                                   |
| Audit requirements          | Actor/model/prompt/tool, purpose, inputs by reference, outputs, sources, approvals, actions, result, cost, time, trace ID |
| Privacy/security boundaries | Data minimization, tenant/user isolation, secrets, retention, network and tool boundaries                                 |
| Medical safety boundaries   | No diagnosis/prescribing; content and care-impact limits; clinical escalation                                             |
| Knowledge-update process    | Source/change review, evaluation, human approval, versioning, expiry, rollback                                            |
| Failure/rollback process    | Kill switch, queue stop, permission revocation, artifact reversal, notification, review                                   |
| Review cadence              | Pre-release and recurring role/model/tool/source/permission review                                                        |

Every role must be feature-flagged **off by default**, use least privilege and approved tools/sources, state uncertainty, validate before acting, preserve evidence, and support rollback. High-risk actions always require qualified human approval. Agents never auto-merge, deploy directly to production, diagnose, prescribe, publish medical/legal/policy content, cross user/tenant privacy boundaries, or learn from production user data without explicit governance and consent.
