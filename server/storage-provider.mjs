export class StorageProvider {
  async put() {
    throw new Error("Storage provider not configured");
  }
  async remove() {
    throw new Error("Storage provider not configured");
  }
  async signedDownload() {
    throw new Error("Storage provider not configured");
  }
}
export class DevelopmentMockStorage extends StorageProvider {
  constructor(clock = () => new Date()) {
    super();
    this.clock = clock;
    this.objects = new Map();
  }
  async put({ objectId, bytes }) {
    this.objects.set(objectId, Buffer.from(bytes));
    return {
      objectId,
      provider: "development_mock",
      createdAt: this.clock().toISOString(),
    };
  }
  async remove(objectId) {
    this.objects.delete(objectId);
  }
  async signedDownload(objectId) {
    if (!this.objects.has(objectId)) throw new Error("Object not found");
    return {
      objectId,
      expiresAt: new Date(this.clock().getTime() + 300_000).toISOString(),
    };
  }
}
