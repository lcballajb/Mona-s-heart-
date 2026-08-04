# Agent audit and logging

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Each task produces an append-only trace: task/parent IDs; agent/role/model/prompt/tool/knowledge versions; feature flag; authenticated requester and purpose; environment; permission decision; input references and classification (not unnecessary content); sources and retrieval dates; tool calls/arguments redacted by schema; output hash/location; uncertainty; validations; human approvals/overrides; action result; rollback; latency/tokens/cost; and timestamps.

Logs must exclude secrets, session tokens, full prompts containing restricted data, unnecessary health/message/document content and raw external payloads. Access is least privilege and purpose/tenant scoped; integrity, retention, legal hold, deletion/export implications and monitoring alerts require Privacy/Security approval. Correlation must not become cross-context user profiling.

Audit events support reconstruction, incident response, cost control and accountability—not clinical surveillance or employee performance scoring without review. High-risk actions require human-approval evidence before the effect and a separate verifier after it. Missing audit service, trace ID or redaction validation causes fail-closed behavior.
