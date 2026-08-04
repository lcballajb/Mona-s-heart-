# Agent evaluation framework

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

| Dimension          | Example measures                                                                           | Evidence                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Task quality       | Correctness, completeness, grounded-source precision/recall, human acceptance with reasons | Versioned golden set and independent review                |
| Safety             | Prohibited-action rate, appropriate abstention/escalation, unsafe medical/legal output     | Adversarial suite; critical target is zero                 |
| Privacy/security   | Cross-tenant/data leakage, secret exposure, injection/tool-policy bypass                   | Synthetic canaries, access logs and red-team report        |
| Reliability        | Tool/schema errors, retries, timeout, rollback success, reproducibility                    | Trace and failure-injection results                        |
| Fairness/inclusion | Subgroup error/abstention, language/accessibility quality                                  | Approved representative fixtures and human research review |
| Operations         | Detection/triage time, false alerts, human workload, stale knowledge                       | Issue/audit metrics without user surveillance              |
| Cost/performance   | Per-task token/tool cost, latency, budget stops, cache benefit                             | Cost ledger by role/version/environment                    |

Every evaluation records role/model/prompt/tool/knowledge versions, dataset provenance and limitations, environment, date, evaluator, thresholds, raw aggregate results, failures and approval. Production user outcomes are not silently repurposed as training/evaluation data. Benchmark improvement cannot offset a critical privacy, security, clinical or legal failure.
