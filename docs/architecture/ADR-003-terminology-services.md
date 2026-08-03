# ADR-003: Terminology services

**Status:** Accepted for reference implementation; high-risk providers disabled by default.

## Decision

Use server-side provider abstractions. RxNorm calls a fixed official NLM origin through a validating proxy. Diagnosis, observations, medication education, and condition–medication associations carry source/version/review provenance. Browser code receives normalized minimum data and has no upstream secrets.

The cache is bounded/in-memory with hashed shared keys, separate positive/negative TTLs, no stale-live serving, and restart/manual invalidation. Rate limiting, timeout, retry, and circuit breaking bound upstream failure. Unavailability preserves wording, allows retry/free text, and never upgrades verification.

## Consequences and limitations

The reference cache/rate limiter is per-process, and RxNorm partial candidates may lack complete ingredient/form metadata. Production needs distributed controls, monitoring, legal/privacy/cybersecurity/medical/pharmacist review, and contract tests against current upstream schemas. SNOMED requires jurisdiction-specific licensing; ICD-10-CM versioning must be maintained; LOINC/UCUM and medication-information adapters are readiness interfaces, not live clinical interpretation. No HIPAA, FDA, hospital, or clinical-validation claim is made.
