# Agent communication protocol

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Agents communicate only through a governed task envelope; free-form agent-to-agent delegation cannot grant authority.

## Task envelope

| Field                        | Rule                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Task/trace ID                | Unique, immutable, linked to human request and feature flag                               |
| Sender/recipient             | Registry IDs and authenticated service identities                                         |
| Purpose/scope                | Bounded objective, non-goals, environment, tenant/user scope                              |
| Data classification          | Public/internal/confidential/restricted; minimum necessary references, not copied records |
| Allowed tools/actions        | Permission-model capability IDs and expiry                                                |
| Evidence/source requirements | Approved sources, dates, provenance, uncertainty                                          |
| Expected output              | Typed schema, destination, validation and rollback plan                                   |
| Approval/escalation          | Required human role, risk tier, deadline and stop conditions                              |
| Budget                       | Token/tool/time/concurrency ceiling                                                       |

Recipients validate signature, freshness, schema, scope, flag, permissions and budget before work. They reject prompt injection, embedded tool instructions, unauthorized data, ambiguous user identity, missing provenance, or conflicts with higher-priority policy. Outputs separate facts, inference, uncertainty and recommendation. No agent treats another agent’s output as approved evidence without independent validation.

## Status and failure messages

Allowed states are `accepted`, `working`, `needs-human`, `blocked`, `validated`, `failed`, and `cancelled`. Heartbeats contain no sensitive content. On timeout, conflict, unsafe request, source failure, privacy uncertainty, clinical/legal ambiguity or budget exhaustion, stop and escalate; do not silently substitute sources/models/tools or broaden scope.
