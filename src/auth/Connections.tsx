import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSession } from "./Session";
import type { PeersDTO } from "./client";
export function Connections() {
  const { state, api } = useSession();
  const [data, setData] = useState<PeersDTO | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api
      .peers()
      .then((v) => {
        if (active) setData(v);
      })
      .catch(() => {
        if (active)
          setError("Connections could not load. Complete onboarding or retry.");
      });
    return () => {
      active = false;
    };
  }, [api, state.user?.id, attempt]);
  async function act(operation: string, input: unknown) {
    setBusy(true);
    setError("");
    try {
      await api.peerAction(operation, input);
      setAttempt((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void act("card", {
      alias: String(f.get("alias")),
      introduction: String(f.get("introduction")),
      availability: String(f.get("availability")),
      published: true,
      consent: f.get("consent") === "on",
      version: "synthetic-discovery-v1",
    });
  }
  function request(e: FormEvent<HTMLFormElement>, survivorId: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void act("requests", {
      survivorId,
      alias: String(f.get("alias")),
      consent: f.get("consent") === "on",
      version: "synthetic-match-request-v1",
    });
  }
  return (
    <section className="narrow connections">
      <h1>Peer connections</h1>
      <button
        type="button"
        disabled={busy}
        onClick={() => setAttempt((n) => n + 1)}
      >
        Refresh connections
      </button>
      <p>
        Synthetic accounts only. Share only fictional information you want
        another account to see. These are peer connections, not verified
        clinical or approved mentor relationships. Messaging is not connected
        yet.
      </p>
      <Link to="/onboarding">Edit your private onboarding profile</Link>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)} disabled={busy}>
            Retry connections
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Loading connections…</p>}
      {data && (
        <>
          {state.user?.roles.includes("survivor") && (
            <section>
              <h2>Your discovery card</h2>
              <p>
                {data.card?.published
                  ? "Your card is shared with eligible synthetic accounts."
                  : "Your card is not published."}{" "}
                Your private onboarding details are never copied into this card.
              </p>
              <form className="onboard" onSubmit={publish}>
                <label>
                  Shared display name
                  <input
                    name="alias"
                    required
                    maxLength={80}
                    defaultValue={data.card?.alias ?? ""}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Availability (shared)
                  <input
                    name="availability"
                    maxLength={160}
                    defaultValue={data.card?.availability ?? ""}
                    autoComplete="off"
                  />
                </label>
                <label className="full">
                  Introduction (shared)
                  <textarea
                    name="introduction"
                    rows={3}
                    maxLength={600}
                    defaultValue={data.card?.introduction ?? ""}
                    autoComplete="off"
                  />
                </label>
                <label className="full">
                  <input type="checkbox" name="consent" required /> I agree to
                  share this card with eligible synthetic accounts for peer
                  discovery (notice synthetic-discovery-v1).
                </label>
                <button className="button" disabled={busy}>
                  Publish discovery card
                </button>
              </form>
              {data.card?.published && (
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() =>
                    void act("card", {
                      published: false,
                      version: "synthetic-discovery-v1",
                    })
                  }
                >
                  Withdraw card and connections
                </button>
              )}
              <p>
                Withdrawing removes your card and ends pending and accepted
                connections. Publishing again will not restore those
                connections.
              </p>
            </section>
          )}
          <section>
            <h2>Discover survivors</h2>
            <p>
              Up to 50 explicitly shared cards. There are no clinical
              suitability scores.
            </p>
            {data.cards.length === 0 && (
              <p>No survivor cards are available yet.</p>
            )}
            {data.cards.map((card) => (
              <article className="peer-card" key={card.userId}>
                <h3>{card.alias}</h3>
                <p>{card.introduction}</p>
                <p>Availability: {card.availability || "Not specified"}</p>
                {state.user?.roles.some((r) =>
                  ["patient", "caregiver"].includes(r),
                ) && (
                  <form onSubmit={(e) => request(e, card.userId)}>
                    <label>
                      Your shared display name
                      <input
                        name="alias"
                        maxLength={80}
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      <input type="checkbox" name="consent" required /> I agree
                      to share this display name and my request with this
                      survivor (notice synthetic-match-request-v1).
                    </label>
                    <button className="button" disabled={busy}>
                      Request connection
                    </button>
                  </form>
                )}
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() => void act("block", { targetId: card.userId })}
                >
                  Block this account
                </button>
              </article>
            ))}
          </section>
          <section>
            <h2>Your requests and connections</h2>
            <p>
              Latest 100 requests. A block prevents requests in either direction
              and ends the connection. Unblocking is not available in this
              increment.
            </p>
            {data.requests.length === 0 && <p>No connection requests yet.</p>}
            {data.requests.map((r) => (
              <article className="peer-card" key={r.id}>
                <h3>{r.alias}</h3>
                <p>
                  {r.direction === "incoming" ? "Incoming" : "Outgoing"} ·{" "}
                  <strong>{r.status}</strong>
                </p>
                {r.status === "pending" && r.direction === "incoming" && (
                  <>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        void act("respond", {
                          requestId: r.id,
                          action: "accepted",
                        })
                      }
                    >
                      Accept connection
                    </button>
                    <button
                      className="button ghost"
                      disabled={busy}
                      onClick={() =>
                        void act("respond", {
                          requestId: r.id,
                          action: "declined",
                        })
                      }
                    >
                      Decline request
                    </button>
                  </>
                )}
                {["pending", "accepted"].includes(r.status) && (
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() =>
                      void act("respond", {
                        requestId: r.id,
                        action: "withdrawn",
                      })
                    }
                  >
                    Withdraw connection
                  </button>
                )}
                {r.counterpartId && (
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() =>
                      void act("block", { targetId: r.counterpartId })
                    }
                  >
                    Block this connection
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
