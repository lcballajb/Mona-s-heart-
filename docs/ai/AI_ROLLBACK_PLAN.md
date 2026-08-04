# AI rollback plan

Triggers: safety event, privacy/contract change, degraded evaluation, injection exploit, region failure or deprecation. Incident commander disables `AI_ENABLED`, stops queued calls, preserves privacy-safe evidence, assesses notices, restores last approved pinned model only if still authorized, and verifies no medical content was auto-published. Clinical, Privacy and Security approve re-enable; document event and user communication. No mock response may silently serve production.
