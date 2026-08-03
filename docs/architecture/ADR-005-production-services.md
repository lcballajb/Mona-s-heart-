# ADR-005: Production service boundaries

Status: accepted for staging architecture; live vendors remain unselected.

Mona’s Heart uses provider-neutral email, encrypted object storage, malware scanning, shared rate-limit/cache, observability, and PostgreSQL job interfaces. Production fails closed when a development provider is selected. PostgreSQL remains the durable queue. No EHR/FHIR connectivity is included. Vendor activation requires legal, privacy, cybersecurity, clinical, pharmacy, accessibility, and hospital-IT review.
