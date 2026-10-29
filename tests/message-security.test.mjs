import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  messageKey,
  sealMessage,
  openMessage,
  messageInput,
} from "../server/message-security.mjs";
test("message encryption authenticates ciphertext and its conversation/sender binding", () => {
  const key = messageKey(randomBytes(32).toString("base64"));
  const context = `${randomUUID()}:${randomUUID()}:${randomUUID()}`;
  const body = "Synthetic text <script>alert('x')</script> 🫶";
  const a = sealMessage(key, context, body),
    b = sealMessage(key, context, body);
  assert.notDeepEqual(a, b);
  assert.equal(a.includes(Buffer.from(body)), false);
  assert.equal(openMessage(key, context, a), body);
  assert.throws(() => openMessage(key, context + "other", a));
  a[a.length - 1] ^= 1;
  assert.throws(() => openMessage(key, context, a));
  for (const value of [
    undefined,
    "",
    "placeholder",
    randomBytes(16).toString("base64"),
  ])
    assert.throws(() => messageKey(value));
});
test("message input accepts only bounded plain text and a client send identifier", () => {
  const clientId = randomUUID().toUpperCase();
  assert.equal(
    messageInput({ body: "Synthetic", clientId }).clientId,
    clientId.toLowerCase(),
  );
  assert.equal(
    messageInput({ body: "Hello\nSynthetic", clientId }).body,
    "Hello\nSynthetic",
  );
  assert.equal(
    messageInput({ body: "x".repeat(2000), clientId }).body.length,
    2000,
  );
  for (const body of ["", "  ", "x".repeat(2001), "a\u0000b", "\ud800", 123])
    assert.throws(() => messageInput({ body, clientId }));
  assert.throws(() => messageInput({ body: "hello", clientId: "invalid" }));
  assert.throws(() =>
    messageInput({ body: "hello", clientId, senderId: randomUUID() }),
  );
});
