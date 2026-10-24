import { peerError } from "./peer-validation.mjs";
const pairBlock = `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1))`;
async function lock(tx, ids) {
  await tx.query(
    "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
    [ids],
  );
}
async function eligible(tx, id, role = null) {
  return (
    await tx.query("SELECT synthetic_peer_eligible($1,$2) AS ok", [id, role])
  ).rows[0].ok;
}
async function available(tx, a, b) {
  return (
    (
      await tx.query(
        `SELECT 1 FROM survivor_cards c WHERE c.user_id=$2 AND c.published AND synthetic_peer_eligible($1) AND synthetic_peer_eligible($2,'survivor') AND ${pairBlock}`,
        [a, b],
      )
    ).rowCount > 0
  );
}
export async function postgresPeers(s, id, op, v = {}) {
  return s.asUser(id, async (tx) => {
    let row;
    if (op === "respond") {
      row = (
        await tx.query(
          "SELECT * FROM peer_match_requests WHERE id=$1 AND $2 IN (requester_id,survivor_id)",
          [v.requestId, id],
        )
      ).rows[0];
      if (!row) throw peerError();
    }
    if (op !== "state")
      await lock(
        tx,
        row
          ? [row.requester_id, row.survivor_id]
          : [
              id,
              ...(v.survivorId
                ? [v.survivorId]
                : v.targetId
                  ? [v.targetId]
                  : []),
            ],
      );
    if (
      !(await eligible(tx, id)) ||
      !(
        await tx.query(
          "SELECT 1 FROM profiles WHERE user_id=$1 AND onboarding->>'completedAt' IS NOT NULL",
          [id],
        )
      ).rowCount
    )
      throw peerError(403);
    if (op === "state") {
      const card =
        (
          await tx.query(
            'SELECT user_id AS "userId",alias,introduction,availability,published,consent_version AS version FROM survivor_cards WHERE user_id=$1',
            [id],
          )
        ).rows[0] ?? null;
      const cards = (
        await tx.query(
          'SELECT user_id AS "userId",alias,introduction,availability,published,consent_version AS version FROM survivor_cards WHERE user_id<>$1 AND published ORDER BY user_id LIMIT 50',
          [id],
        )
      ).rows;
      const rows = (
        await tx.query(
          `SELECT r.*, c.alias AS survivor_alias,c.published,
        synthetic_peer_eligible(r.requester_id) AND synthetic_peer_eligible(r.survivor_id,'survivor')
        AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=r.requester_id AND b.blocked_id=r.survivor_id) OR (b.blocker_id=r.survivor_id AND b.blocked_id=r.requester_id)) AS eligible
        FROM peer_match_requests r LEFT JOIN survivor_cards c ON c.user_id=r.survivor_id
        WHERE $1 IN (r.requester_id,r.survivor_id) ORDER BY r.created_at DESC,r.id LIMIT 100`,
          [id],
        )
      ).rows;
      const requests = rows.map((r) => {
        const ok =
          r.eligible &&
          r.published &&
          ["pending", "accepted"].includes(r.status);
        const incoming = r.survivor_id === id;
        return {
          id: r.id,
          direction: incoming ? "incoming" : "outgoing",
          counterpartId: ok
            ? incoming
              ? r.requester_id
              : r.survivor_id
            : null,
          alias: ok
            ? incoming
              ? r.requester_alias
              : r.survivor_alias
            : "Unavailable connection",
          status: ok ? r.status : "unavailable",
        };
      });
      return { card, cards, requests };
    }
    if (op === "card") {
      if (!(await eligible(tx, id, "survivor"))) throw peerError(403);
      await tx.query(
        `INSERT INTO survivor_cards(user_id,alias,introduction,availability,published,consent_version) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(user_id) DO UPDATE SET alias=EXCLUDED.alias,introduction=EXCLUDED.introduction,availability=EXCLUDED.availability,published=EXCLUDED.published,consent_version=EXCLUDED.consent_version,updated_at=now()`,
        [
          id,
          v.published ? v.alias : "",
          v.published ? v.introduction : "",
          v.published ? v.availability : "",
          v.published,
          v.version,
        ],
      );
      if (!v.published)
        await tx.query(
          "UPDATE peer_match_requests SET status='withdrawn',updated_at=now() WHERE survivor_id=$1 AND status IN ('pending','accepted')",
          [id],
        );
      await tx.recordConsent(id, {
        purpose: "synthetic_discovery",
        version: v.version,
        granted: v.published,
        withdrawnAt: v.published ? null : tx.now(),
        sourceInterface: "synthetic_discovery",
        region: "unspecified",
        language: "en",
        organizationId: null,
      });
      return { ok: true };
    }
    if (op === "request") {
      if (
        !(
          (await eligible(tx, id, "patient")) ||
          (await eligible(tx, id, "caregiver"))
        )
      )
        throw peerError(403);
      if (id === v.survivorId || !(await available(tx, id, v.survivorId)))
        throw peerError();
      const existing = (
        await tx.query(
          "SELECT id FROM peer_match_requests WHERE requester_id=$1 AND survivor_id=$2 AND status IN ('pending','accepted')",
          [id, v.survivorId],
        )
      ).rows[0];
      if (existing) return existing;
      if (
        Number(
          (
            await tx.query(
              "SELECT count(*) FROM peer_match_requests WHERE requester_id=$1 AND status IN ('pending','accepted')",
              [id],
            )
          ).rows[0].count,
        ) >= 20
      )
        throw peerError(429);
      return (
        await tx.query(
          "INSERT INTO peer_match_requests(requester_id,survivor_id,requester_alias,consent_version) VALUES($1,$2,$3,$4) RETURNING id",
          [id, v.survivorId, v.alias, v.version],
        )
      ).rows[0];
    }
    if (op === "respond") {
      row = (
        await tx.query(
          "SELECT * FROM peer_match_requests WHERE id=$1 FOR UPDATE",
          [v.requestId],
        )
      ).rows[0];
      if (!row) throw peerError();
      if (!["pending", "accepted"].includes(row.status)) throw peerError(409);
      if (
        v.action !== "withdrawn" &&
        (row.survivor_id !== id || row.status !== "pending")
      )
        throw peerError(403);
      if (
        v.action === "accepted" &&
        !(await available(tx, row.requester_id, row.survivor_id))
      )
        throw peerError();
      await tx.query(
        "UPDATE peer_match_requests SET status=$2,updated_at=now() WHERE id=$1",
        [row.id, v.action],
      );
      return { ok: true };
    }
    if (op === "block") {
      if (
        id === v.targetId ||
        !(await tx.query("SELECT 1 FROM users WHERE id=$1", [v.targetId]))
          .rowCount
      )
        throw peerError();
      await tx.createBlock(id, v.targetId);
      await tx.query(
        "UPDATE peer_match_requests SET status='blocked',updated_at=now() WHERE $1 IN (requester_id,survivor_id) AND $2 IN (requester_id,survivor_id) AND status IN ('pending','accepted')",
        [id, v.targetId],
      );
      return { ok: true };
    }
    throw peerError();
  });
}
