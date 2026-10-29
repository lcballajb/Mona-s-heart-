import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useSession } from "./Session";
import { ApiError, type MessagePageDTO } from "./client";
export function Conversation() {
  const { connectionId = "" } = useParams();
  const { api, state } = useSession();
  const [data, setData] = useState<MessagePageDTO | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const epoch = useRef(0);
  const sending = useRef(false);
  const pending = useRef<{ body: string; clientId: string } | null>(null);
  useEffect(() => {
    setDraft("");
    pending.current = null;
  }, [connectionId, state.user?.id]);
  const fail = (reason?: unknown) => {
    epoch.current++;
    setData(null);
    if (!(reason instanceof ApiError) || reason.status !== 0) {
      setDraft("");
      pending.current = null;
    }
    setError(
      "Conversation unavailable. Access may have ended or your connection may be offline. Retry to check current access.",
    );
  };
  useEffect(() => {
    const version = ++epoch.current;
    let timer: number | undefined;
    let stopped = false;
    setData(null);
    setError("");
    async function poll() {
      try {
        const value = await api.messages(connectionId);
        if (!stopped && version === epoch.current) {
          setData((old) => {
            // Preserve previously loaded older pages without duplicating rows.
            const older =
              old?.messages.filter(
                (m) =>
                  value.messages.length &&
                  BigInt(m.id) < BigInt(value.messages[0].id),
              ) ?? [];
            return {
              messages: [...older, ...value.messages],
              before: older.length ? old!.before : value.before,
            };
          });
        }
      } catch (reason) {
        if (!stopped && version === epoch.current) fail(reason);
      } finally {
        if (!stopped && version === epoch.current)
          timer = window.setTimeout(() => void poll(), 2000);
      }
    }
    void poll();
    function visibility() {
      // Clear private history when leaving the tab; re-authorize on return.
      if (document.hidden) {
        stopped = true;
        epoch.current++;
        window.clearTimeout(timer);
        setData(null);
        setDraft("");
        pending.current = null;
      } else setAttempt((n) => n + 1);
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      epoch.current++;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [api, connectionId, state.user?.id, attempt]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (sending.current || loadingOlder || !data || !draft.trim()) return;
    sending.current = true;
    setBusy(true);
    setNotice("");
    const version = epoch.current;
    const value =
      pending.current?.body === draft
        ? pending.current
        : { body: draft, clientId: crypto.randomUUID() };
    pending.current = value;
    try {
      await api.sendMessage(connectionId, value);
      const fresh = await api.messages(connectionId);
      if (version === epoch.current) {
        setData(fresh);
        setDraft("");
        pending.current = null;
        setNotice("Message sent.");
      }
    } catch (reason) {
      // Clear history and disable sending until fresh authorization succeeds.
      // Keep the idempotency identifier for an ambiguous send retry.
      if (version === epoch.current) {
        fail(reason);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function older() {
    if (!data?.before || busy || loadingOlder) return;
    const version = epoch.current;
    setLoadingOlder(true);
    try {
      const value = await api.messages(connectionId, data.before);
      if (version === epoch.current)
        setData(
          (old) =>
            old && {
              messages: [
                ...value.messages,
                ...old.messages.filter(
                  (m) => !value.messages.some((v) => v.id === m.id),
                ),
              ],
              before: value.before,
            },
        );
    } catch {
      if (version === epoch.current) fail();
    } finally {
      setLoadingOlder(false);
    }
  }
  return (
    <section className="narrow connections conversation">
      <h1>Connection conversation</h1>
      <Link to="/matches">Back to peer connections</Link>
      <p>
        Synthetic plain text only, up to 2,000 characters. Access requires an
        accepted connection and current eligibility. Withdrawal or blocking ends
        access. This is not an emergency service.
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={busy} onClick={() => setAttempt((n) => n + 1)}>
            Retry conversation
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Loading conversation…</p>}
      {data && (
        <>
          {data.before && (
            <button
              disabled={busy || loadingOlder}
              onClick={() => void older()}
            >
              {loadingOlder ? "Loading older messages…" : "Load older messages"}
            </button>
          )}
          <h2>Messages</h2>
          {data.messages.length === 0 && (
            <p>
              No messages yet. Either participant can send the first message.
            </p>
          )}
          <ol aria-label="Conversation history" className="message-history">
            {data.messages.map((m) => (
              <li className="peer-card" key={m.id}>
                <strong>
                  {m.senderId === state.user?.id
                    ? "You"
                    : "Connection participant"}
                </strong>
                <p>{m.body}</p>
                <time dateTime={m.sentAt}>
                  {new Date(m.sentAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
          <form onSubmit={(e) => void send(e)}>
            <label htmlFor="message-body">Message</label>
            <textarea
              id="message-body"
              value={draft}
              maxLength={2000}
              required
              rows={4}
              onChange={(e) => setDraft(e.target.value)}
              aria-describedby="message-count"
              disabled={busy}
            />
            <p id="message-count">{draft.length} / 2,000 characters</p>
            <button
              className="button"
              disabled={busy || loadingOlder || !draft.trim()}
            >
              {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        </>
      )}
      <p role="status">
        {notice || (data ? `${data.messages.length} messages loaded.` : "")}
      </p>
    </section>
  );
}
