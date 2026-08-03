# Object storage

Objects begin in quarantine under AES-256-GCM-encrypted opaque keys. Providers must use private buckets/containers, server-side encryption and configured KMS references. Only the server issues five-minute signed URLs after owner authorization; names and bucket details are not returned. MIME/extension pairs, 25 MiB size, SHA-256 checksum, attachment disposition, retention, deletion, consented organization scope, and audit events are enforced. S3, Azure Blob, GCS, and compatible adapters remain deployment work. Never put credentials in browsers or offline-cache documents.
