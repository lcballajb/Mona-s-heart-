# Agent organization chart

> **Planned future architecture—requires security, privacy, AI-governance, clinical-safety, legal, and operational review before implementation.**

Agents assist accountable humans; they do not form a legal management structure and cannot hold fiduciary, clinical, privacy, security, or regulatory accountability.

```text
Human Executive Sponsor / Governance Council
└── Chief Orchestrator (coordination only; no universal permissions)
    ├── Product Coordinator
    ├── Engineering Coordinator
    │   ├── Backend, Frontend, Database, DevOps
    │   └── QA, Incident Response, FHIR, Accessibility
    ├── Security Agent ── Privacy Agent ── Engineering Coordinator (AI-governance coordination)
    ├── Medical Safety Agent
    │   ├── Clinical Evidence, Pharmacy, Integrative Health
    │   └── Research Governance
    ├── Technology Watch ── Regulatory Watch
    ├── Documentation Agent ── Analytics Agent ── Cost Optimization Agent
    └── Customer Support
        ├── Trust & Safety / Community Moderation; Product coordinates Community Success
        └── Hospital Implementation / Partnerships / Localization / Global Expansion
```

## Division coverage

| Division                               | Primary proposed role(s)                                       | Accountable human approver               |
| -------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| Executive and strategy                 | Chief Orchestrator                                             | Executive sponsor/governance council     |
| Product and program management         | Product Coordinator                                            | Product owner                            |
| Engineering and architecture           | Engineering Coordinator, Backend, Frontend, Database           | Engineering/architecture lead            |
| IT and technical support               | Customer Support, Incident Response                            | Operations/support lead                  |
| DevOps and infrastructure              | DevOps                                                         | Platform lead                            |
| Cybersecurity                          | Security, Incident Response                                    | Security lead                            |
| Privacy and data governance            | Privacy                                                        | Privacy/Data Governance leads            |
| Clinical safety and evidence           | Medical Safety, Clinical Evidence                              | Clinical lead                            |
| Pharmacy knowledge                     | Pharmacy                                                       | Pharmacist reviewer                      |
| Integrative wellness research          | Integrative Health                                             | Clinical + Integrative Health reviewers  |
| AI governance and model operations     | Engineering Coordinator with Security, Privacy, Medical Safety | AI Governance council                    |
| FHIR and healthcare interoperability   | FHIR                                                           | Interoperability + Hospital IT leads     |
| Quality assurance                      | QA                                                             | QA lead and affected domain verifier     |
| Accessibility                          | Accessibility                                                  | Accessibility lead/independent evaluator |
| Trust and safety                       | Trust & Safety, Community Moderation                           | Trust & Safety lead                      |
| Customer service                       | Customer Support                                               | Customer Support lead                    |
| Community success                      | Product Coordinator with Customer Support                      | Product + Trust & Safety leads           |
| Hospital and enterprise success        | Hospital Implementation                                        | Hospital IT/account owner                |
| Legal and regulatory watch             | Regulatory Watch                                               | Qualified Legal/Regulatory reviewer      |
| Technology and innovation watch        | Technology Watch                                               | Architecture/Security/Product leads      |
| Documentation and knowledge management | Documentation                                                  | Documentation owner + domain owner       |
| Analytics and cost management          | Analytics, Cost Optimization                                   | Data Governance/Finance                  |
| Partnerships and global expansion      | Partnerships, Localization, Global Expansion                   | Legal/Privacy/Executive                  |

No agent may supervise away a required human approval. The Chief Orchestrator routes work but cannot grant permissions, approve its own plan, override a specialist hold, or combine data access inherited from subordinate roles.
