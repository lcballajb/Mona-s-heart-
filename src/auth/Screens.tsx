import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "./Session";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to complete this request.";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const session = useSession();
  const navigate = useNavigate();
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email"));
    const password = String(data.get("password") ?? "");
    try {
      if (forgot) {
        await session.api.requestReset(email);
        setNotice(
          "If this account is eligible, reset instructions have been delivered to the private development outbox.",
        );
      } else if (signup) {
        await session.api.register(email, password, String(data.get("role")));
        form.reset();
        setNotice(
          "Account created. Open your verification link from the private development outbox, then sign in. You are not signed in yet.",
        );
      } else {
        const profile = await session.login(email, password);
        if (profile)
          navigate(profile.displayName ? "/dashboard" : "/onboarding");
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth">
      <div>
        <span className="eyebrow">A SAFE PLACE TO BEGIN</span>
        <h1>
          {forgot
            ? "Reset your password"
            : signup
              ? "Create your account"
              : "Welcome back"}
        </h1>
        <p>
          Synthetic accounts only. Use a fictional .test email address. No real
          personal or health information.
        </p>
        <p>
          Verification and reset links are delivered privately on the
          developer’s computer. No email is sent to a real person.
        </p>
      </div>
      <form onSubmit={submit}>
        <h2>{forgot ? "Password help" : signup ? "Sign up" : "Log in"}</h2>
        <label>
          Email address
          <input
            required
            name="email"
            type="email"
            autoComplete="username"
            placeholder="alice@example.test"
          />
        </label>
        {!forgot && (
          <label>
            Password
            <input
              required
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={12}
              maxLength={200}
              placeholder="At least 12 characters"
            />
          </label>
        )}
        {signup && (
          <>
            <label>
              I am a
              <select name="role">
                <option value="patient">Patient</option>
                <option value="survivor">Survivor</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </label>
            <p>Survivor registration does not grant an approved mentor role.</p>
            <label className="check">
              <input required type="checkbox" /> I will use synthetic
              information only.
            </label>
          </>
        )}
        {session.state.status === "unavailable" && (
          <p role="alert">
            The local synthetic API is unavailable or disabled.{" "}
            <button
              type="button"
              className="textbutton"
              onClick={() => void session.refresh()}
            >
              Retry connection
            </button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button
          className="button wide"
          disabled={
            busy ||
            session.state.status === "loading" ||
            session.state.status === "unavailable"
          }
        >
          {busy
            ? "Please wait…"
            : forgot
              ? "Send reset instructions"
              : signup
                ? "Create synthetic account"
                : "Log in"}
        </button>
        {!signup && (
          <button
            type="button"
            className="textbutton"
            onClick={() => {
              setForgot(!forgot);
              setError("");
              setNotice("");
            }}
          >
            {forgot ? "Back to log in" : "Forgot password?"}
          </button>
        )}
        <div className="or">or</div>
        <button
          type="button"
          className="button ghost wide"
          disabled={busy}
          onClick={async () => {
            try {
              await session.enterDemo();
              navigate("/dashboard");
            } catch (e) {
              setError(message(e));
            }
          }}
        >
          Enter with demo account
        </button>
        <p className="formfoot">
          {signup ? "Already have an account?" : "New to Mona’s Heart?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </form>
    </section>
  );
}

export function TokenForm({ reset = false }: { reset?: boolean }) {
  const { api } = useSession();
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (!token)
        throw new Error(
          "This link is missing its token. Open the original private development link.",
        );
      if (reset) {
        if (data.get("password") !== data.get("confirm"))
          throw new Error("Passwords must match.");
        await api.reset(token, String(data.get("password")));
      } else await api.verify(token);
      setDone(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow">
      <h1>{reset ? "Choose a new password" : "Verify your account"}</h1>
      {done ? (
        <>
          <p role="status">
            {reset
              ? "Password updated. Sign in again."
              : "Your synthetic account is verified. You can now sign in."}
          </p>
          <Link className="button" to="/login">
            Log in
          </Link>
        </>
      ) : (
        <form className="onboard" onSubmit={submit}>
          {!token && (
            <p role="alert">
              Open the complete verification or reset link from the private
              development outbox.
            </p>
          )}
          {reset && (
            <>
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={200}
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  name="confirm"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={200}
                />
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <button className="button" disabled={!token || busy}>
            {busy
              ? "Please wait…"
              : reset
                ? "Update password"
                : "Verify account"}
          </button>
        </form>
      )}
    </section>
  );
}

export function PatientProfileForm() {
  const { state, save } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await save({
        displayName: String(data.get("displayName")),
        pronouns: String(data.get("pronouns")),
        locale: String(data.get("locale")),
      });
      navigate("/dashboard");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow">
      <span className="eyebrow">YOUR SYNTHETIC PROFILE</span>
      <h1>Let’s get to know you</h1>
      <p>
        Use a fictional display name. This profile is private to your account.
        Health details and discovery preferences will be connected in the next
        increment.
      </p>
      <form className="onboard" onSubmit={submit}>
        <label>
          Display name
          <input
            required
            name="displayName"
            maxLength={80}
            defaultValue={state.profile?.displayName ?? ""}
            autoComplete="off"
          />
        </label>
        <label>
          Pronouns (optional)
          <input
            name="pronouns"
            maxLength={40}
            defaultValue={state.profile?.pronouns ?? ""}
            autoComplete="off"
          />
        </label>
        <label>
          Language
          <select name="locale" defaultValue={state.profile?.locale ?? "en"}>
            {state.profile?.locale &&
              !["en", "es", "fr"].includes(state.profile.locale) && (
                <option value={state.profile.locale}>
                  {state.profile.locale}
                </option>
              )}
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
