# Backup and restore

Take encrypted PostgreSQL custom-format backups at least daily, with encrypted transaction-log/PITR coverage where supported. Upload through a KMS-bound service identity, store a SHA-256 integrity manifest, audit access, and rotate keys by rewrapping under dual control. Suggested tiers: 7 daily, 5 weekly, 12 monthly, subject to privacy/legal approval. Target RPO: 24 hours (1 hour with PITR); target RTO: 8 hours. These are objectives, not guarantees.

Quarterly restore to an isolated disposable environment: verify checksum, decrypt, restore, apply migrations, compare safe row counts, test RLS/authorization, record timings, then destroy it. `backup.mjs --dry-run` and `restore-check.mjs --dry-run` are CI-safe. Deleted accounts age out through normal rotation; instant deletion from backups is not claimed.
