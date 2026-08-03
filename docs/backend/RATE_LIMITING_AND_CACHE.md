# Rate limiting and cache

Development has bounded in-memory adapters. Production must explicitly inject PostgreSQL or Redis-compatible shared adapters and otherwise startup fails. Keys are HMAC-pseudonymized and scoped for login, verification/reset resend, exports, uploads and invitations; expired keys are deleted. Terminology cache labels never contain query terms. Capacity exhaustion fails closed. Trusted proxies are explicit; untrusted forwarding headers are ignored.
