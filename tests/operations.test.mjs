import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { URL } from "node:url";
import {
  TestEmailProvider,
  renderEmail,
  createEmailProvider,
} from "../server/email-provider.mjs";
import {
  DevelopmentObjectStorage,
  createObjectStorage,
} from "../server/storage-provider.mjs";
import { DocumentService } from "../server/document-service.mjs";
import {
  TestMalwareScanner,
  applyScanResult,
} from "../server/malware-scanner.mjs";
import { MemoryStore } from "../server/store.mjs";
import { Worker } from "../server/worker.mjs";
import { InMemoryRateLimiter } from "../server/rate-limit.mjs";
import {
  InMemorySharedCache,
  createSharedCache,
} from "../server/shared-cache.mjs";
import { HealthService } from "../server/health.mjs";
import {
  allowedOrigin,
  clientAddress,
  securityHeaders,
} from "../server/http-security.mjs";
import { redact } from "../server/observability.mjs";

const owner = { id: "11111111-1111-4111-8111-111111111111" };
const checksum = "a".repeat(64);
const objectKeyEncryptionKey = randomBytes(32).toString("base64");

test("email templates are accessible, versioned, content-neutral, and production fails closed", async () => {
  const provider = new TestEmailProvider();
  const template = renderEmail({
    kind: "password_reset",
    actionUrl: "https://app.example.invalid/reset?token=opaque",
  });
  await provider.send({ to: "person@example.test", template });
  assert.match(template.html, /<main lang="en">/);
  assert.equal(template.templateVersion, "1");
  assert.doesNotMatch(
    template.subject,
    /diagnosis|medication|document|message/i,
  );
  assert.throws(
    () => createEmailProvider({ environment: "production" }),
    /configured production/,
  );
});

test("signed upload/download remain owner scoped and quarantined until clean", async () => {
  const store = new MemoryStore();
  const storage = new DevelopmentObjectStorage();
  const documents = new DocumentService({
    storage,
    store,
    objectKeyEncryptionKey,
  });
  const upload = await documents.createUpload(owner, {
    filename: "record.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
    checksum,
  });
  assert.match(upload.uploadUrl, /^https:\/\/storage\.example\.invalid/);
  await assert.rejects(
    documents.download(owner, upload.documentId),
    /not found/i,
  );
  await assert.rejects(
    documents.completeUpload({ id: "other" }, upload.documentId),
    /not found/i,
  );
  await documents.completeUpload(owner, upload.documentId);
  const document = store.documents[0];
  await applyScanResult({
    scanner: new TestMalwareScanner("clean"),
    storage,
    document,
    audit: store.audit.bind(store),
  });
  assert.equal(document.scanStatus, "clean");
  assert.match(
    (await documents.download(owner, upload.documentId)).downloadUrl,
    /download/,
  );
  await assert.rejects(
    documents.download({ id: "other" }, upload.documentId),
    /not found/i,
  );
  assert.throws(
    () => createObjectStorage({ environment: "production" }),
    /configured production/,
  );
});

test("infected uploads never become available and are scheduled for deletion", async () => {
  const storage = new DevelopmentObjectStorage();
  const document = {
    objectId: "opaque",
    ownerId: owner.id,
    scanStatus: "quarantine",
  };
  await storage.signUpload({ objectId: document.objectId });
  await applyScanResult({
    scanner: new TestMalwareScanner("infected"),
    storage,
    document,
  });
  assert.equal(document.uploadStatus, "quarantine");
  assert.ok(document.deletionScheduledAt);
  await assert.rejects(
    storage.signDownload({ objectId: document.objectId }),
    /not available/,
  );
});

test("worker retries with backoff, is idempotent after completion, and dead letters", async () => {
  let now = new Date("2026-01-01T00:00:00Z");
  const store = new MemoryStore(() => now);
  const job = store.createJob(
    "email_delivery",
    "22222222-2222-4222-8222-222222222222",
  );
  let calls = 0;
  const worker = new Worker({
    store,
    maxAttempts: 2,
    handlers: {
      email_delivery: async () => {
        calls += 1;
        throw new Error("safe failure");
      },
    },
  });
  await worker.tick();
  assert.equal(job.status, "queued");
  now = new Date("2026-01-01T00:00:02Z");
  await worker.tick();
  assert.equal(job.deadLettered, true);
  await worker.tick();
  assert.equal(calls, 2);
});

test("bounded rate limits and shared cache expire safely", async () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({ clock: () => now, maxKeys: 1 });
  assert.equal(
    (await limiter.consume("one", { limit: 1, windowMs: 10 })).allowed,
    true,
  );
  assert.equal(
    (await limiter.consume("two", { limit: 1, windowMs: 10 })).allowed,
    false,
  );
  now = 11;
  assert.equal(
    (await limiter.consume("two", { limit: 1, windowMs: 10 })).allowed,
    true,
  );
  const cache = new InMemorySharedCache({ clock: () => now });
  await cache.set("opaque", { verified: false }, 5);
  assert.deepEqual(await cache.get("opaque"), { verified: false });
  now = 20;
  assert.equal(await cache.get("opaque"), null);
  assert.throws(
    () => createSharedCache({ environment: "production" }),
    /shared PostgreSQL/,
  );
});

test("liveness is independent, readiness fails, and details/logs are redacted", async () => {
  const health = new HealthService({
    store: {
      health: async () => {
        throw new Error("secret hostname");
      },
    },
    required: ["database"],
  });
  assert.deepEqual(health.liveness(), { status: "live" });
  assert.deepEqual(await health.readiness(), { status: "not_ready" });
  assert.doesNotMatch(
    JSON.stringify(await health.details()),
    /secret|hostname/,
  );
  assert.deepEqual(
    redact({ requestId: "safe", diagnosis: "private", rawToken: "private" }),
    { requestId: "safe" },
  );
});

test("security headers, CORS and trusted proxy handling are explicit", () => {
  const headers = securityHeaders({ production: true });
  assert.match(headers["strict-transport-security"], /31536000/);
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(allowedOrigin("https://good.test", ["https://good.test"]), true);
  assert.equal(allowedOrigin("https://bad.test", ["https://good.test"]), false);
  const request = {
    socket: { remoteAddress: "10.0.0.1" },
    headers: { "x-forwarded-for": "192.0.2.10" },
  };
  assert.equal(clientAddress(request, { trustedProxies: [] }), "10.0.0.1");
  assert.equal(
    clientAddress(request, { trustedProxies: ["10.0.0.1"] }),
    "192.0.2.10",
  );
});

test("password reset is enumeration resistant, throttled, single use, and digest-only", async () => {
  const { MonaService } = await import("../server/service.mjs");
  const store = new MemoryStore();
  const email = new TestEmailProvider();
  const limiter = new InMemoryRateLimiter();
  const service = new MonaService(store, email, limiter);
  const registration = await service.register({
    email: "reset@example.test",
    password: "correct horse battery staple",
  });
  await service.verifyEmail(registration.verificationToken);
  const known = await service.requestPasswordReset({
    email: "reset@example.test",
  });
  const unknown = await service.requestPasswordReset({
    email: "missing@example.test",
  });
  assert.deepEqual(known, unknown);
  const url = new URL(
    email.messages.at(-1).template.text.match(/https:\/\/\S+/)[0],
  );
  const token = url.searchParams.get("token");
  assert.ok(token);
  assert.equal(JSON.stringify(store.accountTokens).includes(token), false);
  await service.resetPassword({
    token,
    password: "new correct horse battery staple",
  });
  await assert.rejects(
    service.resetPassword({
      token,
      password: "another correct horse battery staple",
    }),
    /expired reset token/,
  );
  await service.requestPasswordReset({ email: "reset@example.test" });
  await service.requestPasswordReset({ email: "reset@example.test" });
  await service.requestPasswordReset({ email: "reset@example.test" });
  assert.equal(
    email.messages.filter(
      (message) => message.template.kind === "password_reset",
    ).length,
    3,
  );
});

test("completing a password reset invalidates every older reset token", async () => {
  const { MonaService } = await import("../server/service.mjs");
  const store = new MemoryStore();
  const email = new TestEmailProvider();
  const service = new MonaService(store, email);
  const registration = await service.register({
    email: "reset-replay@example.test",
    password: "correct horse battery staple",
  });
  await service.verifyEmail(registration.verificationToken);
  await service.requestPasswordReset({ email: "reset-replay@example.test" });
  await service.requestPasswordReset({ email: "reset-replay@example.test" });
  const [older, newer] = email.messages
    .filter((message) => message.template.kind === "password_reset")
    .map((message) =>
      new URL(message.template.text.match(/https:\/\/\S+/)[0]).searchParams.get(
        "token",
      ),
    );

  await service.resetPassword({
    token: newer,
    password: "replacement password is sufficiently long",
  });
  await assert.rejects(
    service.resetPassword({
      token: older,
      password: "attacker controlled password is long",
    }),
    /Invalid or expired reset token/,
  );
});
