# Responsibility matrix

R=research/recommend, A=approve, I=implement, V=verify, C=communicate. One person may not approve and verify a high-risk change.

| Change                        | R/recommend                  | A                               | I                   | V                                           | C                          |
| ----------------------------- | ---------------------------- | ------------------------------- | ------------------- | ------------------------------------------- | -------------------------- |
| Product/release               | Product+Engineering          | Product owner                   | Engineering/Ops     | QA+Security                                 | Support                    |
| Security/incident             | Security                     | Security lead                   | Engineering/Ops     | Independent security                        | Legal+Support              |
| Privacy/data rights/retention | Privacy+Data Governance      | Legal/Privacy                   | Engineering+Support | Privacy                                     | Support                    |
| Legal policy/jurisdiction     | Legal+Privacy                | Qualified Legal                 | Product/Engineering | Legal+QA                                    | Support                    |
| Clinical/medical              | Clinical                     | Clinical lead                   | Content/Product     | Independent clinician                       | Support                    |
| Medication                    | Pharmacy+Clinical            | Pharmacy lead                   | Content             | Independent pharmacy reviewer               | Support                    |
| Integrative health            | Integrative+Clinical         | Clinical lead                   | Content             | Independent specialist                      | Support                    |
| AI/model                      | AI+Engineering               | AI, Security, Privacy, Clinical | Engineering         | Independent evaluation                      | Product/Support            |
| Accessibility                 | Accessibility                | Product owner                   | Design/Engineering  | Disabled-user testing/independent evaluator | Support                    |
| Community safety              | Trust & Safety               | T&S lead                        | T&S/Engineering     | QA+Privacy                                  | Support                    |
| Hospital integration          | Interop+Hospital IT          | Hospital IT + Mona owners       | Engineering         | Partner security/clinical                   | Account owner              |
| Vendor                        | Procurement/Security/Privacy | Legal+business owner            | Operations          | Security/Privacy                            | Affected users if required |

## Document boundary and cross-references

Role-accountability model only; named people and release-specific approvals must be recorded elsewhere. Use the [policy workflow](POLICY_CHANGE_WORKFLOW.md), [90-day plan](90_DAY_ACTION_PLAN.md), [Go/No-Go checklist](PRODUCTION_GO_NO_GO.md), and [release management](../operations/RELEASE_MANAGEMENT.md).
