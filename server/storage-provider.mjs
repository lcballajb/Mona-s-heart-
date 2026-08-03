import {
  createCipheriv,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import path from "node:path";

export const ALLOWED_UPLOADS = new Map([
  ["application/pdf", new Set([".pdf"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["text/plain", new Set([".txt"])],
]);
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function validateUpload({ filename, mimeType, sizeBytes, checksum }) {
  const extensions = ALLOWED_UPLOADS.get(mimeType);
  if (!extensions?.has(path.extname(filename).toLowerCase()))
    throw Object.assign(new Error("File type is not allowed"), {
      statusCode: 400,
    });
  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 1 ||
    sizeBytes > MAX_UPLOAD_BYTES
  )
    throw Object.assign(new Error("File size is not allowed"), {
      statusCode: 400,
    });
  if (!/^[a-f\d]{64}$/i.test(checksum))
    throw Object.assign(new Error("SHA-256 checksum is required"), {
      statusCode: 400,
    });
}

export function encryptedObjectKey(
  ownerId,
  key = process.env.OBJECT_KEY_ENCRYPTION_KEY,
) {
  if (!key || Buffer.from(key, "base64").length !== 32)
    throw new Error("A 32-byte object-key encryption key is required");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const encrypted = Buffer.concat([
    cipher.update(`${ownerId}/${randomUUID()}`),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}

export class ObjectStorageProvider {
  constructor({
    name,
    serverSideEncryption = "AES256",
    kmsKeyReference = null,
  } = {}) {
    this.name = name;
    this.serverSideEncryption = serverSideEncryption;
    this.kmsKeyReference = kmsKeyReference;
  }
  async signUpload() {
    throw new Error("Object storage provider not configured");
  }
  async signDownload() {
    throw new Error("Object storage provider not configured");
  }
  async remove() {
    throw new Error("Object storage provider not configured");
  }
  async health() {
    return { status: "unconfigured" };
  }
}

export class DevelopmentObjectStorage extends ObjectStorageProvider {
  constructor({
    clock = () => new Date(),
    signingKey = "fictional-development-signing-key",
  } = {}) {
    super({ name: "development_mock" });
    this.clock = clock;
    this.signingKey = signingKey;
    this.objects = new Map();
  }
  signature(value) {
    return createHmac("sha256", this.signingKey)
      .update(value)
      .digest("base64url");
  }
  signed(operation, objectId, expiresInSeconds) {
    const expiresAt = new Date(
      this.clock().getTime() + Math.min(expiresInSeconds, 300) * 1000,
    ).toISOString();
    const opaque = Buffer.from(
      `${operation}:${objectId}:${expiresAt}`,
    ).toString("base64url");
    return {
      url: `https://storage.example.invalid/v1/${operation}/${opaque}.${this.signature(opaque)}`,
      expiresAt,
    };
  }
  async signUpload({ objectId, expiresInSeconds = 300 }) {
    this.objects.set(objectId, { state: "quarantine" });
    return this.signed("upload", objectId, expiresInSeconds);
  }
  async signDownload({
    objectId,
    expiresInSeconds = 300,
    disposition = "attachment",
  }) {
    const object = this.objects.get(objectId);
    if (object?.state !== "approved")
      throw Object.assign(new Error("File is not available"), {
        statusCode: 404,
      });
    return {
      ...this.signed("download", objectId, expiresInSeconds),
      contentDisposition: disposition === "inline" ? "inline" : "attachment",
    };
  }
  async setState(objectId, state) {
    const object = this.objects.get(objectId);
    if (!object) throw new Error("Object not found");
    object.state = state;
  }
  async remove(objectId) {
    this.objects.delete(objectId);
  }
  async health() {
    return { status: "mock" };
  }
}

export function createObjectStorage(options = {}) {
  const environment = options.environment ?? process.env.NODE_ENV;
  const provider = options.provider ?? process.env.OBJECT_STORAGE_PROVIDER;
  if (
    environment !== "production" &&
    (!provider || provider === "development_mock")
  )
    return new DevelopmentObjectStorage(options);
  // S3, Azure Blob, GCS and S3-compatible SDK adapters implement ObjectStorageProvider.
  throw new Error("A configured production object-storage adapter is required");
}
