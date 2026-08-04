# Agent permission model

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

## Default-deny capability model

Permissions are explicit tuples: `agent ID × tool action × resource × environment × data class × purpose × time`. There is no role inheritance, wildcard resource, shared credential, standing production write, or cross-tenant scope. Feature flags, service identity, policy engine, network allowlist and tool gateway must all agree. A flag does not grant permission.

| Tier                     | Examples                                                                             | Agent authority                                        | Required approval                                               |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------- |
| P0 public read           | Approved public authoritative sources, public repository docs                        | Read/summarize with provenance                         | Role owner approves source allowlist                            |
| P1 internal read         | Assigned issues, code/docs, synthetic test output, redacted telemetry                | Read only for ticket purpose                           | Resource owner; time-bound                                      |
| P2 reversible draft/test | Draft issue/PR, run sandbox tests, create non-sensitive artifact                     | May propose; cannot merge/release                      | Human review before external effect                             |
| P3 sensitive/high-impact | User/tenant data, security findings, clinical/legal/policy content, vendor decisions | Default prohibited; exceptional supervised access only | Domain owner plus Privacy/Security/Clinical/Legal as applicable |
| P4 production mutation   | Deploy, merge, change IAM/secrets/data, send user communications                     | Prohibited to agents                                   | Humans using existing protected process                         |

## Required controls

- Short-lived scoped identity; separate development/test/staging; production read access exceptional and just-in-time.
- Synthetic or de-identified approved fixtures first; no direct learning/training from production data.
- Tool input/output schemas, size/rate/cost limits, egress allowlists, secret redaction, tenant-purpose checks, and immutable audit IDs.
- Two-person human approval for any P3 exception; requester cannot approve or validate its own access.
- Automatic expiry, emergency kill switch, credential revocation, queue cancellation, and quarterly entitlement recertification.
- Prompt/model/source updates cannot broaden permissions. Subagents receive the intersection—not union—of parent and assigned-task permissions.
