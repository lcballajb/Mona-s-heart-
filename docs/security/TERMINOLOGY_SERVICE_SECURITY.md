# Terminology service security

The proxy applies Unicode normalization, a 2–80 character allowlist, URL encoding, response-shape validation, a 3-second timeout, one retry, bounded hashed-key cache, per-IP/path throttling (30/minute), and a three-failure/30-second circuit breaker. Global request bodies remain limited to 32 KiB. Upstream uses Node TLS validation and a fixed HTTPS origin. Errors expose safe messages without stacks; logs contain no raw query. Health reports only provider state.

Secrets are server-only placeholders in `.env.example`; never use `VITE_*`. Production must use a secret manager, TLS at the edge, trusted proxy configuration, distributed rate limiting/cache where horizontally scaled, dependency and secret scanning, monitoring, and incident review. The in-memory controls are reference-service limitations, not a compliance claim.
