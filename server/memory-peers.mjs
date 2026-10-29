import { randomUUID } from "node:crypto";
import { peerError } from "./peer-validation.mjs";
const active = (s, id, role) => {
  const u = s.users.get(id);
  return (
    u?.status === "active" &&
    u.verifiedAt &&
    !u.deletedAt &&
    u.email.endsWith(".test") &&
    u.roles.some((r) => ["patient", "survivor", "caregiver"].includes(r)) &&
    (!role || u.roles.includes(role))
  );
};
const blocked = (s, a, b) =>
  s.blocks.some(
    (r) =>
      (r.blockerId === a && r.blockedId === b) ||
      (r.blockerId === b && r.blockedId === a),
  );
const available = (s, a, b) =>
  active(s, a) &&
  active(s, b, "survivor") &&
  s.survivorCards.get(b)?.published &&
  !blocked(s, a, b);
export function memoryPeers(s, id, op, v = {}) {
  if (!active(s, id) || !s.profiles.get(id)?.onboarding?.completedAt)
    throw peerError(403);
  if (op === "state") {
    const cards = [...s.survivorCards.values()]
      .filter((c) => c.userId !== id && available(s, id, c.userId))
      .slice(0, 50);
    const requests = [...s.peerRequests]
      .reverse()
      .filter((r) => [r.requesterId, r.survivorId].includes(id))
      .slice(0, 100)
      .map((r) => {
        const ok =
          available(s, r.requesterId, r.survivorId) &&
          ["pending", "accepted"].includes(r.status);
        const incoming = r.survivorId === id;
        return {
          id: r.id,
          direction: incoming ? "incoming" : "outgoing",
          counterpartId: ok ? (incoming ? r.requesterId : r.survivorId) : null,
          alias: ok
            ? incoming
              ? r.alias
              : s.survivorCards.get(r.survivorId).alias
            : "Unavailable connection",
          status: ok ? r.status : "unavailable",
        };
      });
    return { card: s.survivorCards.get(id) ?? null, cards, requests };
  }
  if (op === "card") {
    if (!active(s, id, "survivor")) throw peerError(403);
    const card = {
      userId: id,
      alias: v.published ? v.alias : "",
      introduction: v.published ? v.introduction : "",
      availability: v.published ? v.availability : "",
      published: v.published,
      version: v.version,
    };
    s.survivorCards.set(id, card);
    if (!v.published)
      for (const r of s.peerRequests)
        if (r.survivorId === id && ["pending", "accepted"].includes(r.status))
          r.status = "withdrawn";
    s.recordConsent(id, {
      purpose: "synthetic_discovery",
      version: v.version,
      granted: v.published,
      withdrawnAt: v.published ? null : s.now(),
      sourceInterface: "synthetic_discovery",
      region: "unspecified",
      language: "en",
      organizationId: null,
    });
    return { ok: true };
  }
  if (op === "request") {
    if (!(active(s, id, "patient") || active(s, id, "caregiver")))
      throw peerError(403);
    if (id === v.survivorId || !available(s, id, v.survivorId))
      throw peerError();
    const existing = s.peerRequests.find(
      (r) =>
        r.requesterId === id &&
        r.survivorId === v.survivorId &&
        ["pending", "accepted"].includes(r.status),
    );
    if (existing) return { id: existing.id };
    if (
      s.peerRequests.filter(
        (r) =>
          r.requesterId === id && ["pending", "accepted"].includes(r.status),
      ).length >= 20
    )
      throw peerError(429);
    const row = {
      id: randomUUID(),
      requesterId: id,
      survivorId: v.survivorId,
      alias: v.alias,
      version: v.version,
      status: "pending",
    };
    s.peerRequests.push(row);
    return { id: row.id };
  }
  if (op === "respond") {
    const row = s.peerRequests.find(
      (r) => r.id === v.requestId && [r.requesterId, r.survivorId].includes(id),
    );
    if (!row) throw peerError();
    if (!["pending", "accepted"].includes(row.status)) throw peerError(409);
    if (
      v.action !== "withdrawn" &&
      (row.survivorId !== id || row.status !== "pending")
    )
      throw peerError(403);
    if (
      v.action === "accepted" &&
      !available(s, row.requesterId, row.survivorId)
    )
      throw peerError();
    row.status = v.action;
    return { ok: true };
  }
  if (op === "block") {
    if (id === v.targetId || !s.users.has(v.targetId)) throw peerError();
    if (!blocked(s, id, v.targetId)) s.createBlock(id, v.targetId);
    for (const r of s.peerRequests)
      if (
        [r.requesterId, r.survivorId].includes(id) &&
        [r.requesterId, r.survivorId].includes(v.targetId) &&
        ["pending", "accepted"].includes(r.status)
      )
        r.status = "blocked";
    return { ok: true };
  }
  throw peerError();
}
