# Agent memory and knowledge policy

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

## Memory classes

| Class                           | Permitted content                                                        | Retention / use                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Ephemeral task context          | Minimum task inputs and approved references                              | Delete at task close or documented short timeout                                                           |
| Governed operational record     | Task metadata, evidence, approvals, result, cost, trace IDs              | Approved audit schedule; access controlled                                                                 |
| Curated knowledge               | Human-approved, versioned internal docs and authoritative public sources | Review/expiry by domain owner; provenance required                                                         |
| Production user data            | Not memory or training material                                          | No retention beyond authorized product workflow; no agent learning without explicit governance and consent |
| Secrets/authentication material | Never in prompts, memory, vector stores or logs                          | Use brokered tool identity only                                                                            |

Retrieval must enforce tenant/user/purpose/region and document-level access before ranking. Embeddings, caches, traces and backups inherit the source classification and deletion/hold requirements. Do not claim anonymization from tokenization or embeddings. Personalization memory is off by default and requires accessible user controls, explicit approved purpose, correction/export/deletion, and privacy review.

Knowledge updates use authoritative-source allowlists, source/retrieval dates, content hash, license, region, reviewer, validation suite, effective/expiry date, and rollback snapshot. Legal, medical, wellness, policy and security conclusions never update automatically. Poisoning, staleness, conflicting sources or missing provenance suppresses the item and triggers human review.
