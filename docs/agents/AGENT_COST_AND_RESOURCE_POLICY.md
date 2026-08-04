# Agent cost and resource policy

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Every role has per-task and period budgets for model tokens, tool/API calls, wall time, concurrency, storage and external-service spend. The gateway enforces hard ceilings before work and records estimated/actual cost by role, version, environment and approved purpose. Budget exhaustion stops/checkpoints safely and escalates; it never triggers a cheaper unapproved model, reduced safety review, broader caching or hidden data reuse.

Cost optimization order: eliminate unnecessary tasks; narrow context; reuse approved non-sensitive deterministic results; select an approved fit-for-purpose model; batch only within tenant/purpose boundaries. Humans approve model/vendor changes and material budget increases. Finance, Product, Security and AI Governance review anomalies monthly. Rate spikes, retry loops and tool recursion activate circuit breakers and queue cancellation.
