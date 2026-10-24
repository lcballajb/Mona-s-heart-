import { objectInput } from "./validation.mjs";
export const peerError = (statusCode = 404) =>
  Object.assign(new Error("Connection unavailable"), { statusCode });
export function peerText(value, max, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    !value.isWellFormed() ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) ||
    (required && !value.trim())
  )
    throw peerError(400);
  return value.trim();
}
export function peerId(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw peerError(400);
  return value;
}
export function survivorCardInput(input) {
  const v = objectInput(input, [
    "alias",
    "introduction",
    "availability",
    "published",
    "consent",
    "version",
  ]);
  if (
    typeof v.published !== "boolean" ||
    v.version !== "synthetic-discovery-v1" ||
    (v.published && v.consent !== true)
  )
    throw peerError(400);
  return {
    alias: peerText(v.alias ?? "", 80, v.published),
    introduction: peerText(v.introduction ?? "", 600),
    availability: peerText(v.availability ?? "", 160),
    published: v.published,
    version: v.version,
  };
}
export function peerRequestInput(input) {
  const v = objectInput(input, ["survivorId", "alias", "consent", "version"]);
  if (v.consent !== true || v.version !== "synthetic-match-request-v1")
    throw peerError(400);
  return {
    survivorId: peerId(v.survivorId),
    alias: peerText(v.alias, 80, true),
    version: v.version,
  };
}
