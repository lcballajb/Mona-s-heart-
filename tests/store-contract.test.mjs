import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../server/store.mjs";
import { PostgresStore } from "../server/postgres-store.mjs";
import {
  assertStoreContract,
  STORE_OPERATIONS,
} from "../server/store-contract.mjs";

test("memory and PostgreSQL adapters implement the application store contract", () => {
  for (const Adapter of [MemoryStore, PostgresStore]) {
    const adapter = Object.create(Adapter.prototype);
    assert.equal(assertStoreContract(adapter), adapter);
    assert.deepEqual(
      STORE_OPERATIONS.filter(
        (operation) => typeof adapter[operation] !== "function",
      ),
      [],
    );
  }
});

test("store contract reports every missing operation without exposing values", () => {
  assert.throws(
    () => assertStoreContract({ createUser() {} }),
    (error) => {
      assert.equal(error instanceof TypeError, true);
      assert.match(error.message, /audit/);
      assert.match(error.message, /verifyUser/);
      return true;
    },
  );
});

test("memory adapter enforces ownership for contract-backed documents", () => {
  const store = new MemoryStore();
  const document = store.createDocumentMetadata("owner", {
    objectId: "opaque-object",
    storageProvider: "development_mock",
    encryptedObjectKey: "encrypted-key",
    encryptedDataKey: "encrypted-data-key",
    mimeType: "application/pdf",
    sizeBytes: 10,
    checksum: "a".repeat(64),
  });

  assert.equal(store.getOwnDocument("owner", document.id), document);
  assert.equal(store.getOwnDocument("other", document.id), null);
});

test("imported metadata cannot reference another owner's deleted or inaccessible document", () => {
  const store = new MemoryStore();
  const document = store.createDocumentMetadata("user-b", {
    objectId: "object-b",
  });

  assert.throws(
    () =>
      store.createImportedRecordMetadata("user-a", {
        documentId: document.id,
        source: "upload",
        payloadCiphertext: Buffer.from("encrypted"),
        userId: "user-b",
        ownerId: "user-b",
      }),
    /unavailable/,
  );
  assert.equal(store.importedRecords.length, 0);

  const own = store.createDocumentMetadata("user-a", { objectId: "object-a" });
  const imported = store.createImportedRecordMetadata("user-a", {
    documentId: own.id,
    source: "upload",
    payloadCiphertext: Buffer.from("encrypted"),
    userId: "user-b",
    ownerId: "user-b",
  });
  assert.equal(imported.userId, "user-a");
  assert.equal(imported.ownerId, undefined);

  own.deletedAt = new Date().toISOString();
  assert.throws(
    () =>
      store.createImportedRecordMetadata("user-a", {
        documentId: own.id,
        source: "upload",
        payloadCiphertext: Buffer.from("encrypted"),
      }),
    /unavailable/,
  );
  assert.equal(store.importedRecords.length, 1);
});
