# Policy change workflow

> **Draft—requires review by qualified legal, privacy, security, healthcare, and regulatory professionals before production use.**

1. Owner opens an issue with source/date, jurisdictions, data-flow and user impact; no bot draws a legal conclusion.
2. Legal, Privacy, Security, Clinical and Regulatory roles triage applicability; document uncertainty.
3. Draft with semantic policy version; compare data use, rights, risk, notice and consent.
4. Required professionals approve in the legal log. Tests verify UI/code matches approved text.
5. Determine advance notice, accessibility/localization, re-consent and withdrawal path. Never bundle optional consent.
6. Two authorized humans release; automation must not publish legal/medical content. Archive the old immutable version and evidence.
7. Monitor complaints and roll back code/text together when safe. Emergency changes receive retrospective review within 5 business days.

## Document boundary and cross-references

Policy lifecycle only; it does not supply policy text or legal approval. Use the [policy registry](../policies/POLICY_REGISTRY.md), [legal review log](LEGAL_REVIEW_LOG.md), [responsibility matrix](RESPONSIBILITY_MATRIX.md), and [release management](../operations/RELEASE_MANAGEMENT.md).
