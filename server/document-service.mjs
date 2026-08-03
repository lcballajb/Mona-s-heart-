import { randomUUID } from "node:crypto";
import { encryptedObjectKey, validateUpload } from "./storage-provider.mjs";

export class DocumentService {
  constructor({ storage, store, objectKeyEncryptionKey }) {
    this.storage = storage;
    this.store = store;
    this.objectKeyEncryptionKey = objectKeyEncryptionKey;
  }
  async createUpload(actor, input) {
    validateUpload(input);
    const objectId = randomUUID();
    const document = {
      id: randomUUID(),
      ownerId: actor.id,
      objectId,
      encryptedObjectKey: encryptedObjectKey(
        actor.id,
        this.objectKeyEncryptionKey,
      ),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      uploadStatus: "signed",
      scanStatus: "quarantine",
      retentionAt: input.retentionAt ?? null,
      deletedAt: null,
      organizationId: null,
    };
    this.store.documents.push(document);
    const signed = await this.storage.signUpload({ objectId });
    await this.store.audit("document_upload_authorized", actor.id, actor.id, {
      documentId: document.id,
    });
    return {
      documentId: document.id,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    };
  }
  async completeUpload(actor, documentId) {
    const document = this.store.documents.find(
      (row) => row.id === documentId && row.ownerId === actor.id,
    );
    if (!document)
      throw Object.assign(new Error("Document not found"), { statusCode: 404 });
    document.uploadStatus = "quarantine";
    this.store.createJob("malware_scan", document.id);
    return { status: "processing" };
  }
  async download(actor, documentId) {
    const document = this.store.documents.find(
      (row) =>
        row.id === documentId && row.ownerId === actor.id && !row.deletedAt,
    );
    if (!document || document.scanStatus !== "clean")
      throw Object.assign(new Error("Document not found"), { statusCode: 404 });
    const signed = await this.storage.signDownload({
      objectId: document.objectId,
      disposition: "attachment",
    });
    await this.store.audit("document_download_authorized", actor.id, actor.id, {
      documentId,
    });
    return {
      downloadUrl: signed.url,
      expiresAt: signed.expiresAt,
      contentDisposition: signed.contentDisposition,
    };
  }
}
