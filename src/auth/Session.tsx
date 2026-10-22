import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate } from "react-router-dom";
import {
  ApiError,
  PatientClient,
  type ProfileDTO,
  type SessionDTO,
} from "./client";

type State = {
  status: "loading" | "anonymous" | "authenticated" | "unavailable" | "demo";
  user: SessionDTO["user"] | null;
  profile: ProfileDTO | null;
  expiresAt: string | null;
};
const empty = { user: null, profile: null, expiresAt: null };
const Context = createContext<{
  state: State;
  api: PatientClient;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<ProfileDTO | null>;
  logout: () => Promise<void>;
  enterDemo: () => Promise<void>;
  save: (profile: ProfileDTO) => Promise<void>;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading", ...empty });
  const epoch = useRef(0);
  const api = useMemo(
    () =>
      new PatientClient(() => {
        epoch.current++;
        setState({ status: "anonymous", ...empty });
      }),
    [],
  );
  async function refresh() {
    const version = ++epoch.current;
    setState({ status: "loading", ...empty });
    try {
      const session = await api.me();
      const { profile } = await api.profile();
      if (epoch.current === version)
        setState({
          status: "authenticated",
          user: session.user,
          profile,
          expiresAt: session.expiresAt,
        });
    } catch (error) {
      // Expiry callback increments the epoch; no late response may restore a user.
      if (epoch.current === version)
        setState({
          status:
            error instanceof ApiError && error.status === 401
              ? "anonymous"
              : "unavailable",
          ...empty,
        });
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      epoch.current++;
    };
  }, [api]);
  useEffect(() => {
    if (state.status !== "authenticated" || !state.expiresAt) return;
    const deadline = Date.parse(state.expiresAt);
    const expire = () => {
      if (Date.now() >= deadline) {
        epoch.current++;
        api.clear();
        setState({ status: "anonymous", ...empty });
      }
    };
    const timer = window.setTimeout(expire, Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", expire);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [state.status, state.expiresAt, api]);
  async function login(email: string, password: string) {
    const version = ++epoch.current;
    const session = await api.signIn(email, password);
    const { profile } = await api.profile();
    if (epoch.current !== version) return null;
    setState({
      status: "authenticated",
      user: session.user,
      profile,
      expiresAt: session.expiresAt,
    });
    return profile;
  }
  async function logout() {
    // Hide cached private data immediately; retry remains available on failure.
    epoch.current++;
    setState({ status: "loading", ...empty });
    try {
      await api.signOut();
      setState({ status: "anonymous", ...empty });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        setState({ status: "anonymous", ...empty });
      else {
        setState({ status: "unavailable", ...empty });
        throw error;
      }
    }
  }
  async function enterDemo() {
    if (state.status === "authenticated") await logout();
    epoch.current++;
    api.clear();
    setState({ status: "demo", ...empty });
  }
  async function save(input: ProfileDTO) {
    const version = epoch.current;
    const { profile } = await api.saveProfile(input);
    if (epoch.current === version)
      setState((current) => ({ ...current, profile }));
  }
  return (
    <Context.Provider
      value={{ state, api, refresh, login, logout, enterDemo, save }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
export function Protected({ children }: { children: React.ReactNode }) {
  const { state, refresh } = useSession();
  if (state.status === "loading")
    return (
      <main className="narrow" role="status">
        Checking your session…
      </main>
    );
  if (state.status === "unavailable")
    return (
      <main className="narrow">
        <h1>Connection unavailable</h1>
        <p>
          Your profile has been cleared from this screen. Retry to restore your
          session.
        </p>
        <button className="button" onClick={() => void refresh()}>
          Retry connection
        </button>
        <a href="/login">Return to login</a>
      </main>
    );
  if (state.status !== "authenticated" && state.status !== "demo")
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}
