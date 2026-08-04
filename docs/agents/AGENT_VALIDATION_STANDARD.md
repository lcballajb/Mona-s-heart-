# Agent validation standard

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

## Lifecycle gates

1. **Design:** documented use case/non-goals, data flow, threat/abuse model, role profile, sources/tools, permission and human-approval map.
2. **Offline evaluation:** version-pinned model/prompt/tool/knowledge on synthetic and approved representative fixtures; no production user data.
3. **Adversarial evaluation:** prompt injection, tool misuse, data exfiltration, cross-tenant access, hallucinated citations, unsafe medical/legal advice, bias, denial-of-service and cost runaway.
4. **Sandbox/shadow:** read-only or no-effect execution; compare to human baseline; no user-visible output or production mutation.
5. **Limited pilot:** explicitly approved cohort, flags off by default, human review before effect, monitoring/kill switch and rollback rehearsal.
6. **Ongoing validation:** drift, source/model/tool changes, incidents, false-positive/negative analysis, permissions and cost.

## Release criteria

The role owner defines measurable thresholds for task correctness, grounded citations, uncertainty/calibration, abstention, privacy/security violations (target zero), medical/legal prohibited output (target zero), accessibility, latency, cost and human override. Independent domain reviewers validate high-risk cases. Any critical violation, missing evidence, unapproved version, expired knowledge or failed rollback is a release blocker. Tests must verify prohibited actions, not merely happy paths.
