# Known limitations

Mona's Heart remains a fictional-data prototype. A Node API, PostgreSQL persistence,
forced row-level security, runtime-role checks, authentication/session controls,
terminology proxy and automated tests exist. These foundations do not establish a
fully integrated or operated patient platform.

The React authentication/onboarding, profile, medication, messaging, call, group,
document and notification screens are principally demonstrations. Most are not
connected to authenticated backend workflows. Video and other high-risk features
default off. Document storage/scanning uses development abstractions; production
email, object storage, malware scanning and shared rate limiting need approved
adapters. Default worker handlers are unconfigured. Health encryption/KMS,
end-to-end authorization, browser journeys, accessibility, monitoring, and actual
backup/restore operation remain incomplete or unverified.

See the [Phase 2 assessment](engineering/PHASE_2_BETA_READINESS.md) for current
findings, verified changes, existing PR dependencies and release blockers, and the
[Go/No-Go checklist](governance/PRODUCTION_GO_NO_GO.md) for approval gates.

Use synthetic information only. Do not invite real patients or use real personal
or health data until blocking safeguards are resolved and independently verified.
No HIPAA compliance, legal compliance, FDA approval, clinical validation or hospital
approval is claimed. Qualified privacy, security, legal, clinical and accessibility
review and operated safeguards remain required.
