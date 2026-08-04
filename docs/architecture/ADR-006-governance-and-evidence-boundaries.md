# ADR-006: Canonical governance and evidence boundaries

- **Status:** Accepted for repository documentation
- **Date:** 2026-08-04

## Context

The repository accumulated architecture, operational, policy and review artifacts across multiple phases. Many subjects legitimately require separate registers or approval histories, but additional narrative files can drift or appear to prove operational/legal status that source control cannot establish.

## Decision

1. `docs/README.md` names one canonical narrative per topic. Update it before adding documentation.
2. Registers/checklists remain separate only when they have distinct owners, cadence, evidence rows or immutable version history.
3. Every audit statement uses Verified, Assumed, Requires Human Review, or Future Recommendation and cites repository evidence.
4. Repository configuration is not evidence that external GitHub/cloud/vendor controls operate. Legal compliance, clinical validation and regulatory approval require qualified external decisions.
5. Scheduled governance automation creates human-review issues/artifacts only; it never changes medical/legal content, policies, production or merge decisions.
6. Maturity scores use a published rubric and must link to dated scope/evidence.

## Consequences

Maintainers gain a stable entry point, fewer competing narratives and explicit evidence limits. Existing ADRs and independently versioned policy/register files remain intact. Consolidation is incremental: remove or merge a supporting file only after links and independent history requirements are checked. This ADR does not approve production.
