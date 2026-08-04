# Documentation map and ownership

This index identifies the canonical artifact for each topic so maintainers update existing material rather than creating duplicates. Supporting files contain registers, checklists, or a narrower implementation view; they must link back to the canonical artifact when edited.

| Topic                            | Canonical document                                | Supporting evidence                                                                       |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Master maturity audit and scores | `governance/MASTER_REPOSITORY_AUDIT.md`           | Gap analysis, scorecard, risk register                                                    |
| Governance cadence and ownership | `governance/ONGOING_COMPLIANCE_AND_TECH_WATCH.md` | Responsibility matrix, source/register files, policy workflow                             |
| Production decision              | `governance/PRODUCTION_GO_NO_GO.md`               | 90-day plan, readiness scorecard, risk register                                           |
| System architecture              | `architecture/SYSTEM_OVERVIEW.md`                 | ADR-002 through ADR-006, backend/interoperability diagrams                                |
| Security program                 | `security/SECURITY_PROGRAM.md`                    | Threat model, production controls, vulnerability, encryption, logging, supply chain       |
| Privacy                          | `privacy/PRIVACY_ARCHITECTURE.md`                 | Data inventory/flow/classification, consent, retention/deletion/export                    |
| AI                               | `ai/AI_GOVERNANCE.md`                             | Architecture/data flow, model/prompt/vendor registers, safety/evaluation/incident plans   |
| Accessibility                    | `accessibility/ACCESSIBILITY_PLAN.md`             | Testing checklist, limitations, watch and AT matrix                                       |
| Clinical content                 | `medical-safety/CLINICAL_CONTENT_GOVERNANCE.md`   | Evidence classification, review register, integrative policy, medical terminology sources |
| Interoperability                 | `interoperability/FHIR_ARCHITECTURE.md`           | SMART plan, profiles/mapping, standards watch and terminology policy                      |
| Release/operations               | `operations/RELEASE_MANAGEMENT.md`                | Change/emergency/rollback, staging, observability, DR/backup/database runbooks            |
| Dependencies/technical debt      | `operations/DEPENDENCY_UPDATE_PLAN.md`            | Dependabot triage, deprecation/technology watch, technical debt register                  |
| Policies                         | `policies/POLICY_REGISTRY.md`                     | Individually versioned draft policy files and immutable history                           |
| Trust and safety                 | `trust-safety/COMMUNITY_SAFETY_PROGRAM.md`        | Moderation, appeals, misinformation, crisis/vulnerable-user boundaries                    |
| Research                         | `research/RESEARCH_GOVERNANCE.md`                 | Ethics and de-identification limits                                                       |

## Duplication rule

Before adding a document, search this index and repository headings. Update the canonical file unless the artifact has a distinct owner, review cadence, version history, or operational record. Registers remain separate because they change independently from policies. ADRs remain immutable; supersede them with a new ADR. Policy files remain separate because each needs independent approval/version/notification history, even while all share one control schema in the registry.
