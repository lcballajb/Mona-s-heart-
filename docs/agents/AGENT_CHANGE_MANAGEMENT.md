# Agent change management

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Treat role, mission, prompt, model, provider, tool, permission, source, knowledge snapshot, output schema, evaluation threshold, budget and escalation changes as versioned configuration changes. No mutable `latest` identifiers.

1. Open a change record with rationale, diff, data/risk impact, sources, owner and rollback.
2. Re-run applicable privacy/security/clinical/legal/accessibility threat and validation suites.
3. Obtain role owner, QA and all risk-domain approvals; permission expansion requires Security and resource owner.
4. Release to sandbox/shadow, then a flag-controlled limited pilot only after evidence passes.
5. Monitor predeclared safety, quality, cost and operational metrics; never auto-merge or deploy directly to production.
6. Roll back exact model/prompt/tool/knowledge/permission bundle; revoke obsolete credentials and archive evidence.

Emergency response may disable flags, revoke capabilities and cancel queues automatically within preapproved safety controls. Re-enablement and any alternative model/tool require human approval. Retrospective review follows the repository emergency-release process.
