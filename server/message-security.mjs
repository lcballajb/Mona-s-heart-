import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { objectInput } from "./validation.mjs";
import { peerId, peerText, peerError } from "./peer-validation.mjs";
export function messageKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY must be a base64 encoded 32-byte secret",
    );
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error("Invalid message encryption key");
  return key;
}
export function messageInput(input) {
  const v = objectInput(input, ["body", "clientId"]);
  return {
    body: peerText(v.body, 2000, true),
    clientId: peerId(v.clientId).toLowerCase(),
  };
}
export function messageCursor(value) {
  if (value === null || value === undefined) return null;
  if (!/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n)
    throw peerError(400);
  return value;
}
// Version byte | random 96-bit nonce | 128-bit authentication tag | ciphertext.
// AAD binds every ciphertext to its connection, sender and idempotency identifier.
export function sealMessage(key, context, body) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(body, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([
    Buffer.from([1]),
    nonce,
    cipher.getAuthTag(),
    encrypted,
  ]);
}
export function openMessage(key, context, ciphertext) {
  if (ciphertext[0] !== 1 || ciphertext.length < 30)
    throw new Error("Invalid encrypted message");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key,
    ciphertext.subarray(1, 13),
  );
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(ciphertext.subarray(13, 29));
  return Buffer.concat([
    cipher.update(ciphertext.subarray(29)),
    cipher.final(),
  ]).toString("utf8");
}
