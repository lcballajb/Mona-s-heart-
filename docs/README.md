# Documentation map and ownership

This index identifies the canonical artifact for each topic so maintainers update existing material rather than creating duplicates. Supporting files contain registers, checklists, or a narrower implementation view; they must link back to the canonical artifact when edited.

| Topic                            | Canonical document                                | Supporting evidence                                                                                                   |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Master maturity audit and scores | `governance/MASTER_REPOSITORY_AUDIT.md`           | Gap analysis, scorecard, risk register                                                                                |
| Governance cadence and ownership | `governance/ONGOING_COMPLIANCE_AND_TECH_WATCH.md` | Responsibility matrix, source/register files, policy workflow                                                         |
| Production decision              | `governance/PRODUCTION_GO_NO_GO.md`               | 90-day plan, readiness scorecard, risk register                                                                       |
| System architecture              | `architecture/SYSTEM_OVERVIEW.md`                 | ADR-002 through ADR-006, backend/interoperability diagrams                                                            |
| Security program                 | `security/SECURITY_PROGRAM.md`                    | Threat model, production controls, vulnerability, encryption, logging, supply chain                                   |
| Privacy                          | `privacy/PRIVACY_ARCHITECTURE.md`                 | Data inventory/flow/classification, consent, retention/deletion/export                                                |
| AI                               | `ai/AI_GOVERNANCE.md`                             | Architecture/data flow, model/prompt/vendor registers, safety/evaluation/incident plans                               |
| Multi-agent future architecture  | `agents/AGENT_ROADMAP.md`                         | Registry, permission, communication, memory, validation, escalation, evaluation, audit, cost and change-control plans |
| Accessibility                    | `accessibility/ACCESSIBILITY_PLAN.md`             | Testing checklist, limitations, watch and AT matrix                                                                   |
| Clinical content                 | `medical-safety/CLINICAL_CONTENT_GOVERNANCE.md`   | Evidence classification, review register, integrative policy, medical terminology sources                             |
| Interoperability                 | `interoperability/FHIR_ARCHITECTURE.md`           | SMART plan, profiles/mapping, standards watch and terminology policy                                                  |
| Release/operations               | `operations/RELEASE_MANAGEMENT.md`                | Change/emergency/rollback, staging, observability, DR/backup/database runbooks                                        |
| Dependencies/technical debt      | `operations/DEPENDENCY_UPDATE_PLAN.md`            | Dependabot triage, deprecation/technology watch, technical debt register                                              |
| Policies                         | `policies/POLICY_REGISTRY.md`                     | Individually versioned draft policy files and immutable history                                                       |
| Trust and safety                 | `trust-safety/COMMUNITY_SAFETY_PROGRAM.md`        | Moderation, appeals, misinformation, crisis/vulnerable-user boundaries                                                |
| Research                         | `research/RESEARCH_GOVERNANCE.md`                 | Ethics and de-identification limits                                                                                   |

## Duplication rule

Before adding a document, search this index and repository headings. Update the canonical file unless the artifact has a distinct owner, review cadence, version history, or operational record. Registers remain separate because they change independently from policies. ADRs remain immutable; supersede them with a new ADR. Policy files remain separate because each needs independent approval/version/notification history, even while all share one control schema in the registry.

## Source and provenance rule

Every factual change must cite the nearest canonical internal evidence or an authoritative source from the [source register](governance/AUTHORITATIVE_SOURCE_REGISTER.md), including source/retrieval date and uncertainty where currency matters. Legal, medical, regulatory, security, standards, vendor, and platform conclusions require the domain review defined in their canonical document. A link is a research starting point, not proof of applicability, approval, validation, conformance, or operational effectiveness.

## Complete documentation inventory

This inventory is the navigation reference used by the orphan/link check. Inclusion means the file is discoverable, not approved or production-ready. Canonical ownership remains in the table above.

### General

- [Known Limitations](KNOWN_LIMITATIONS.md)
- [Ownership](OWNERSHIP.md)

### accessibility

- [Accessibility Plan](accessibility/ACCESSIBILITY_PLAN.md)
- [Accessibility watch](accessibility/ACCESSIBILITY_WATCH.md)
- [Assistive technology test matrix](accessibility/ASSISTIVE_TECH_TEST_MATRIX.md)
- [Inclusive research plan](accessibility/INCLUSIVE_RESEARCH_PLAN.md)
- [Known Limitations](accessibility/KNOWN_LIMITATIONS.md)
- [Testing Checklist](accessibility/TESTING_CHECKLIST.md)

### agents

- [Agent audit and logging](agents/AGENT_AUDIT_AND_LOGGING.md)
- [Agent change management](agents/AGENT_CHANGE_MANAGEMENT.md)
- [Agent communication protocol](agents/AGENT_COMMUNICATION_PROTOCOL.md)
- [Agent cost and resource policy](agents/AGENT_COST_AND_RESOURCE_POLICY.md)
- [Agent escalation matrix](agents/AGENT_ESCALATION_MATRIX.md)
- [Agent evaluation framework](agents/AGENT_EVALUATION_FRAMEWORK.md)
- [Agent memory and knowledge policy](agents/AGENT_MEMORY_AND_KNOWLEDGE_POLICY.md)
- [Agent organization chart](agents/AGENT_ORGANIZATION_CHART.md)
- [Agent permission model](agents/AGENT_PERMISSION_MODEL.md)
- [Proposed agent registry](agents/AGENT_REGISTRY.md)
- [Governed multi-agent roadmap](agents/AGENT_ROADMAP.md)
- [Agent role template](agents/AGENT_ROLE_TEMPLATE.md)
- [Agent validation standard](agents/AGENT_VALIDATION_STANDARD.md)

### ai

- [Ai Architecture](ai/AI_ARCHITECTURE.md)
- [Ai Data Flow](ai/AI_DATA_FLOW.md)
- [AI deprecation plan](ai/AI_DEPRECATION_PLAN.md)
- [Ai Evaluation Plan](ai/AI_EVALUATION_PLAN.md)
- [Ai Governance](ai/AI_GOVERNANCE.md)
- [Ai Human Review](ai/AI_HUMAN_REVIEW.md)
- [Ai Incident Response](ai/AI_INCIDENT_RESPONSE.md)
- [AI model registry](ai/AI_MODEL_REGISTRY.md)
- [Ai Prompt Registry](ai/AI_PROMPT_REGISTRY.md)
- [AI regulatory watch](ai/AI_REGULATORY_WATCH.md)
- [AI rollback plan](ai/AI_ROLLBACK_PLAN.md)
- [Ai Safety Policy](ai/AI_SAFETY_POLICY.md)
- [Ai Transparency Notice](ai/AI_TRANSPARENCY_NOTICE.md)
- [AI vendor change register](ai/AI_VENDOR_CHANGE_REGISTER.md)
- [Ai Vendor Review](ai/AI_VENDOR_REVIEW.md)

### architecture

- [ADR-002: Node API with PostgreSQL security boundaries](architecture/ADR-002-production-backend.md)
- [ADR-003: Terminology services](architecture/ADR-003-terminology-services.md)
- [ADR-004: PostgreSQL persistence with node-postgres](architecture/ADR-004-postgresql-persistence.md)
- [ADR-005: Production service boundaries](architecture/ADR-005-production-services.md)
- [ADR-006: Canonical governance and evidence boundaries](architecture/ADR-006-governance-and-evidence-boundaries.md)
- [System architecture and trust boundaries](architecture/SYSTEM_OVERVIEW.md)

### backend

- [Implemented API reference](backend/API_REFERENCE.md)
- [Background jobs](backend/BACKGROUND_JOBS.md)
- [Data access layer](backend/DATA_ACCESS_LAYER.md)
- [Email provider](backend/EMAIL_PROVIDER.md)
- [Malware scanning](backend/MALWARE_SCANNING.md)
- [Migrations](backend/MIGRATIONS.md)
- [Object storage](backend/OBJECT_STORAGE.md)
- [PostgreSQL setup](backend/POSTGRESQL_SETUP.md)
- [Rate limiting and cache](backend/RATE_LIMITING_AND_CACHE.md)
- [Worker architecture](backend/WORKER_ARCHITECTURE.md)
- [Store adapter contract](backend/STORE_ADAPTER_CONTRACT.md)

### engineering

- [Engineering execution plan](engineering/ENGINEERING_EXECUTION_PLAN.md)
- [E2 authentication hardening milestone](engineering/MILESTONE_E2_AUTHENTICATION.md)

### communications

- [Real Time Architecture](communications/REAL_TIME_ARCHITECTURE.md)

### governance

- [90-day action plan](governance/90_DAY_ACTION_PLAN.md)
- [Authoritative source register](governance/AUTHORITATIVE_SOURCE_REGISTER.md)
- [Comprehensive gap analysis](governance/COMPREHENSIVE_GAP_ANALYSIS.md)
- [Insurance and risk transfer plan](governance/INSURANCE_AND_RISK_TRANSFER.md)
- [Intellectual-property protection plan](governance/IP_PROTECTION_PLAN.md)
- [Jurisdiction decision matrix](governance/JURISDICTION_MATRIX.md)
- [Legal review log](governance/LEGAL_REVIEW_LOG.md)
- [Master repository hardening and maturity audit](governance/MASTER_REPOSITORY_AUDIT.md)
- [Ongoing compliance and technology watch](governance/ONGOING_COMPLIANCE_AND_TECH_WATCH.md)
- [Policy change workflow](governance/POLICY_CHANGE_WORKFLOW.md)
- [Production Go/No-Go checklist](governance/PRODUCTION_GO_NO_GO.md)
- [Production readiness scorecard](governance/PRODUCTION_READINESS_SCORECARD.md)
- [Regulatory watch register](governance/REGULATORY_WATCH_REGISTER.md)
- [Responsibility matrix](governance/RESPONSIBILITY_MATRIX.md)
- [Consolidated risk register](governance/RISK_REGISTER.md)
- [Subprocessor register](governance/SUBPROCESSOR_REGISTER.md)
- [Vendor register](governance/VENDOR_REGISTER.md)

### hospital

- [Hospital Readiness](hospital/HOSPITAL_READINESS.md)

### interoperability

- [Ehr Integration Boundaries](interoperability/EHR_INTEGRATION_BOUNDARIES.md)
- [Fhir Architecture](interoperability/FHIR_ARCHITECTURE.md)
- [Fhir Resource Mapping](interoperability/FHIR_RESOURCE_MAPPING.md)
- [FHIR version policy](interoperability/FHIR_VERSION_POLICY.md)
- [Smart On Fhir Plan](interoperability/SMART_ON_FHIR_PLAN.md)
- [Standards watch](interoperability/STANDARDS_WATCH.md)
- [Terminology mapping](interoperability/TERMINOLOGY_MAPPING.md)
- [Terminology update policy](interoperability/TERMINOLOGY_UPDATE_POLICY.md)

### medical

- [Diagnosis–medication associations](medical/DIAGNOSIS_MEDICATION_ASSOCIATIONS.md)
- [Diagnosis terminology](medical/DIAGNOSIS_TERMINOLOGY.md)
- [Medication education sources](medical/MEDICATION_EDUCATION_SOURCES.md)
- [Medication terminology](medical/MEDICATION_TERMINOLOGY.md)

### medical-safety

- [Clinical content governance](medical-safety/CLINICAL_CONTENT_GOVERNANCE.md)
- [Content review register](medical-safety/CONTENT_REVIEW_REGISTER.md)
- [Evidence classification](medical-safety/EVIDENCE_CLASSIFICATION.md)
- [Integrative health review policy](medical-safety/INTEGRATIVE_HEALTH_REVIEW_POLICY.md)

### operations

- [Backup and restore](operations/BACKUP_AND_RESTORE.md)
- [Branch protection recommendations](operations/BRANCH_PROTECTION_RECOMMENDATIONS.md)
- [Change management](operations/CHANGE_MANAGEMENT.md)
- [CI/CD and build pipeline](operations/CI_CD.md)
- [Cleanup report](operations/CLEANUP_REPORT.md)
- [Database runbook](operations/DATABASE_RUNBOOK.md)
- [Dependabot triage report](operations/DEPENDABOT_TRIAGE.md)
- [Dependency update plan](operations/DEPENDENCY_UPDATE_PLAN.md)
- [Deprecation register](operations/DEPRECATION_REGISTER.md)
- [Disaster recovery](operations/DISASTER_RECOVERY.md)
- [Emergency release process](operations/EMERGENCY_RELEASE_PROCESS.md)
- [Environment-variable and configuration reference](operations/ENVIRONMENT_REFERENCE.md)
- [Government and law-enforcement request policy](operations/GOVERNMENT_REQUEST_POLICY.md)
- [Health and readiness](operations/HEALTH_AND_READINESS.md)
- [Innovation backlog](operations/INNOVATION_BACKLOG.md)
- [Observability](operations/OBSERVABILITY.md)
- [Release management](operations/RELEASE_MANAGEMENT.md)
- [Repository health audit](operations/REPOSITORY_HEALTH_AUDIT.md)
- [Post-merge production baseline](operations/POST_MERGE_PRODUCTION_BASELINE.md)
- [GitHub reconciliation evidence — 2026-08-08](operations/GITHUB_RECONCILIATION_2026-08-08.md)
- [Rollback checklist](operations/ROLLBACK_CHECKLIST.md)
- [Service shutdown plan](operations/SERVICE_SHUTDOWN_PLAN.md)
- [Staging deployment](operations/STAGING_DEPLOYMENT.md)
- [Technical debt register](operations/TECHNICAL_DEBT_REGISTER.md)
- [Technology watch](operations/TECHNOLOGY_WATCH.md)
- [Vite 8.2 migration evaluation](operations/VITE_8_EVALUATION.md)

### policies

- [Acceptable Use Policy](policies/ACCEPTABLE_USE_POLICY.md)
- [Accessibility Statement](policies/ACCESSIBILITY_STATEMENT.md)
- [Account Suspension and Appeal Policy](policies/ACCOUNT_SUSPENSION_APPEAL_POLICY.md)
- [AI Disclosure](policies/AI_DISCLOSURE.md)
- [Children’s Privacy Notice](policies/CHILDRENS_PRIVACY_NOTICE.md)
- [Community Guidelines](policies/COMMUNITY_GUIDELINES.md)
- [Complementary Wellness Disclaimer](policies/COMPLEMENTARY_WELLNESS_DISCLAIMER.md)
- [Content Moderation Policy](policies/CONTENT_MODERATION_POLICY.md)
- [Cookie Notice](policies/COOKIE_NOTICE.md)
- [Data Deletion Notice](policies/DATA_DELETION_NOTICE.md)
- [Data Rights Request Procedure](policies/DATA_RIGHTS_REQUEST_PROCEDURE.md)
- [Hospital and Clinic Notice](policies/HOSPITAL_CLINIC_NOTICE.md)
- [Intellectual Property Notice](policies/INTELLECTUAL_PROPERTY_NOTICE.md)
- [International Data Transfer Notice](policies/INTERNATIONAL_DATA_TRANSFER_NOTICE.md)
- [Medical Disclaimer](policies/MEDICAL_DISCLAIMER.md)
- [Policy control standard](policies/POLICY_CONTROL_STANDARD.md)
- [Policy registry](policies/POLICY_REGISTRY.md)
- [Privacy Policy](policies/PRIVACY_POLICY.md)
- [Records Retention Notice](policies/RECORDS_RETENTION_NOTICE.md)
- [Research Notice](policies/RESEARCH_NOTICE.md)
- [Safety Policy](policies/SAFETY_POLICY.md)
- [Security Disclosure Policy](policies/SECURITY_DISCLOSURE_POLICY.md)
- [Terms of Use](policies/TERMS_OF_USE.md)
- [Vendor Privacy Notice](policies/VENDOR_PRIVACY_NOTICE.md)

### policies/policy-history

- [Policy version history](policies/policy-history/README.md)

### privacy

- [Account deletion](privacy/ACCOUNT_DELETION.md)
- [Children And Minors](privacy/CHILDREN_AND_MINORS.md)
- [Consent Management](privacy/CONSENT_MANAGEMENT.md)
- [Cross Border Data](privacy/CROSS_BORDER_DATA.md)
- [Data Classification](privacy/DATA_CLASSIFICATION.md)
- [Data export](privacy/DATA_EXPORT.md)
- [Data Flow Map](privacy/DATA_FLOW_MAP.md)
- [Data Inventory](privacy/DATA_INVENTORY.md)
- [Health search data](privacy/HEALTH_SEARCH_DATA.md)
- [Minors readiness plan](privacy/MINORS_READINESS_PLAN.md)
- [Privacy Architecture](privacy/PRIVACY_ARCHITECTURE.md)
- [Retention Schedule](privacy/RETENTION_SCHEDULE.md)

### research

- [De-identification limitations](research/DEIDENTIFICATION_LIMITATIONS.md)
- [Ethics review requirements](research/ETHICS_REVIEW_REQUIREMENTS.md)
- [Research governance](research/RESEARCH_GOVERNANCE.md)

### security

- [Access Control Policy](security/ACCESS_CONTROL_POLICY.md)
- [Backup And Recovery](security/BACKUP_AND_RECOVERY.md)
- [Business Continuity](security/BUSINESS_CONTINUITY.md)
- [Database security](security/DATABASE_SECURITY.md)
- [Dependency vulnerability review](security/DEPENDENCY_VULNERABILITY_REVIEW.md)
- [Encryption Standard](security/ENCRYPTION_STANDARD.md)
- [Incident Response Plan](security/INCIDENT_RESPONSE_PLAN.md)
- [Key and credential rotation register](security/KEY_ROTATION_REGISTER.md)
- [Logging Standard](security/LOGGING_STANDARD.md)
- [Penetration Test Plan](security/PENETRATION_TEST_PLAN.md)
- [Production security and privacy controls](security/PRODUCTION_CONTROLS.md)
- [SBOM policy](security/SBOM_POLICY.md)
- [Secure Development Lifecycle](security/SECURE_DEVELOPMENT_LIFECYCLE.md)
- [Security headers and proxy controls](security/SECURITY_HEADERS.md)
- [Security Program](security/SECURITY_PROGRAM.md)
- [Security update register](security/SECURITY_UPDATE_REGISTER.md)
- [Supply-chain security](security/SUPPLY_CHAIN_SECURITY.md)
- [Terminology service security](security/TERMINOLOGY_SERVICE_SECURITY.md)
- [Threat Model](security/THREAT_MODEL.md)
- [Vendor Security Review](security/VENDOR_SECURITY_REVIEW.md)
- [Vulnerability Management](security/VULNERABILITY_MANAGEMENT.md)
- [Vulnerability SLA](security/VULNERABILITY_SLA.md)

### testing

- [Test matrix](testing/TEST_MATRIX.md)

### trust-safety

- [Community safety program](trust-safety/COMMUNITY_SAFETY_PROGRAM.md)
- [Crisis response boundaries](trust-safety/CRISIS_RESPONSE_BOUNDARIES.md)
- [Misinformation policy](trust-safety/MISINFORMATION_POLICY.md)
- [Moderation escalation](trust-safety/MODERATION_ESCALATION.md)
- [User appeals](trust-safety/USER_APPEALS.md)
- [Vulnerable user protections](trust-safety/VULNERABLE_USER_PROTECTIONS.md)
