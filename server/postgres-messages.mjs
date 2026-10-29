import { peerError } from "./peer-validation.mjs";
import { openMessage, sealMessage } from "./message-security.mjs";
const binding = (r) => `${r.connection_id}:${r.sender_id}:${r.client_id}`;
export async function postgresMessages(
  store,
  actorId,
  sessionId,
  connectionId,
  input,
  before,
  key,
) {
  return store.asUser(actorId, async (tx) => {
    // This first lookup reveals no message data. Recheck after acquiring locks.
    const row = (
      await tx.query(
        "SELECT requester_id,survivor_id FROM peer_match_requests WHERE id=$1",
        [connectionId],
      )
    ).rows[0];
    if (!row) throw peerError();
    await tx.query(
      "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
      [[row.requester_id, row.survivor_id]],
    );
    if (
      !(
        await tx.query(
          "SELECT 1 FROM sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE",
          [sessionId, actorId],
        )
      ).rowCount
    )
      throw peerError(401);
    if (
      !(
        await tx.query("SELECT peer_conversation_available($1) AS ok", [
          connectionId,
        ])
      ).rows[0].ok
    )
      throw peerError();
    if (input) {
      const existing = (
        await tx.query(
          "SELECT * FROM peer_messages WHERE sender_id=$1 AND client_id=$2",
          [actorId, input.clientId],
        )
      ).rows[0];
      if (existing) {
        if (
          existing.connection_id !== connectionId ||
          openMessage(key, binding(existing), existing.body_ciphertext) !==
            input.body
        )
          throw peerError(409);
        return { id: existing.id };
      }
      const context = `${connectionId}:${actorId}:${input.clientId}`;
      try {
        const result = await tx.query(
          "INSERT INTO peer_messages(connection_id,sender_id,client_id,body_ciphertext) VALUES($1,$2,$3,$4) RETURNING id",
          [
            connectionId,
            actorId,
            input.clientId,
            sealMessage(key, context, input.body),
          ],
        );
        return { id: result.rows[0].id };
      } catch (error) {
        if (error.code === "23505") throw peerError(409);
        if (error.code === "P0001") throw peerError(429);
        throw error;
      }
    }
    const result = await tx.query(
      "SELECT * FROM peer_messages WHERE connection_id=$1 AND ($2::bigint IS NULL OR id<$2) ORDER BY id DESC LIMIT 101",
      [connectionId, before],
    );
    const page = result.rows.slice(0, 100);
    return {
      messages: page.reverse().map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        clientId: r.client_id,
        body: openMessage(key, binding(r), r.body_ciphertext),
        sentAt: r.sent_at.toISOString(),
      })),
      before: result.rows.length > 100 ? page[0].id : null,
    };
  });
}
