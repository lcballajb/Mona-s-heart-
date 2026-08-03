# Branch protection recommendations

Protect `main` with a repository ruleset. These are administrator actions, not
controls that application code can enforce.

- Require a pull request and require the branch to be current before merge.
- Require the `verify` and `dependency-review` CI jobs. Require every review
  conversation to be resolved.
- Block force pushes and branch deletion. Do not permit bypass except for a
  documented, audited emergency procedure.
- Consider one approval; require specialist or CODEOWNER review for security,
  privacy, medical-safety, accessibility, and deployment changes.
- Enable GitHub secret scanning and push protection. Dependency review also
  requires the GitHub dependency graph to be enabled.

## Expected workflow

1. Create a focused branch from current `main`.
2. Make focused changes without real health data or credentials.
3. Run the commands documented in `REPOSITORY_HEALTH_AUDIT.md`.
4. Open a pull request.
5. Resolve all review conversations.
6. Require green, current CI.
7. Merge through the protected pull-request path.
8. Delete the merged feature branch.
