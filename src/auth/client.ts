export type MessagePageDTO = {
  messages: {
    id: string;
    senderId: string;
    clientId: string;
    body: string;
    sentAt: string;
  }[];
  before: string | null;
};
export type SurvivorCardDTO = {
  userId: string;
  alias: string;
  introduction: string;
  availability: string;
  published: boolean;
  version: string;
};
export type PeersDTO = {
  card: SurvivorCardDTO | null;
  cards: SurvivorCardDTO[];
  requests: {
    id: string;
    direction: "incoming" | "outgoing";
    counterpartId: string | null;
    alias: string;
    status: "pending" | "accepted" | "unavailable";
  }[];
};
export type ConsentEventDTO = {
  id: string;
  purpose:
    | "synthetic_onboarding"
    | "synthetic_matching"
    | "synthetic_discovery";
  version: string;
  granted: boolean;
  recordedAt: string;
};
export type OnboardingDTO = {
  accountType?: string;
  completedAt?: string;
  diagnosis?: string;
  symptoms?: string;
  medications?: string;
  livedExperience?: string;
  availability?: string;
  caregiverInformation?: string;
  supportPreferences: string;
  willingToMentor?: boolean;
  matchingConsent?: boolean;
  privacy: "private";
  consentVersion: "synthetic-onboarding-v1";
  consent?: boolean;
};
export type ProfileDTO = {
  onboarding?: OnboardingDTO;
  displayName: string;
  pronouns: string;
  locale: string;
};
export type SessionDTO = {
  user: { id: string; roles: string[] };
  csrfToken: string;
  expiresAt: string;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Credentials and profile data live in memory only. Same-origin requests never
// send a session cookie or CSRF token to an arbitrary remote URL.
export class PatientClient {
  private csrfToken = "";
  private generation = 0;
  constructor(private onExpired: () => void) {}
  clear() {
    this.csrfToken = "";
    this.generation++;
  }
  private async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    publicRequest = false,
  ): Promise<T> {
    const requestGeneration = this.generation;
    let response: Response;
    try {
      response = await fetch(`/v1${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: {
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...(method === "GET" || publicRequest
            ? {}
            : { "x-csrf-token": this.csrfToken }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "Connection unavailable. Please try again.");
    }
    if (!response.ok) {
      if (
        response.status === 401 &&
        !publicRequest &&
        requestGeneration === this.generation
      ) {
        this.clear();
        this.onExpired();
      }
      const messages: Record<number, string> = {
        400: "Check your entries and try again.",
        401: "Sign in with a verified account to continue.",
        403: "This action is unavailable. Check verification or sign in again.",
        429: "Too many attempts. Please wait before trying again.",
        503: "The local synthetic API is unavailable or disabled.",
      };
      throw new ApiError(
        response.status,
        messages[response.status] ??
          "Unable to complete this request. Please try again.",
      );
    }
    return response.status === 204 ? (undefined as T) : response.json();
  }
  async me() {
    const version = this.generation;
    const session = await this.request<SessionDTO>("/auth/me");
    if (version === this.generation) this.csrfToken = session.csrfToken;
    return session;
  }
  async signIn(email: string, password: string) {
    this.clear();
    const version = this.generation;
    const result = await this.request<{ csrfToken: string }>(
      "/auth/sign-in",
      "POST",
      { email, password },
      true,
    );
    if (version === this.generation) this.csrfToken = result.csrfToken;
    return this.me();
  }
  register(email: string, password: string, role: string) {
    return this.request(
      "/auth/register",
      "POST",
      { email, password, role },
      true,
    );
  }
  verify(token: string) {
    return this.request("/auth/verify", "POST", { token }, true);
  }
  requestReset(email: string) {
    return this.request(
      "/auth/password-reset/request",
      "POST",
      { email },
      true,
    );
  }
  reset(token: string, password: string) {
    return this.request(
      "/auth/password-reset/complete",
      "POST",
      { token, password },
      true,
    );
  }
  messages(connectionId: string, before?: string) {
    return this.request<MessagePageDTO>(
      `/peer-messages/${encodeURIComponent(connectionId)}${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    );
  }
  sendMessage(connectionId: string, input: { body: string; clientId: string }) {
    return this.request<{ id: string }>(
      `/peer-messages/${encodeURIComponent(connectionId)}`,
      "POST",
      input,
    );
  }
  peers() {
    return this.request<PeersDTO>("/peers");
  }
  peerAction(operation: string, input: unknown) {
    if (!["card", "requests", "respond", "block"].includes(operation))
      throw new Error("Unknown connection action");
    return this.request(`/peers/${operation}`, "POST", input);
  }
  consentHistory() {
    return this.request<{ events: ConsentEventDTO[] }>("/consent-history");
  }
  profile() {
    return this.request<{ profile: ProfileDTO }>("/profile");
  }
  saveProfile(profile: ProfileDTO) {
    return this.request<{ profile: ProfileDTO }>("/profile", "PUT", profile);
  }
  async signOut() {
    await this.request("/auth/sign-out", "POST");
    this.clear();
  }
}
