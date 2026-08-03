export const EMAIL_KINDS = Object.freeze([
  "account_verification",
  "password_reset",
  "security_alert",
  "account_change",
  "export_ready",
  "deletion_status",
  "organization_invitation",
  "reviewer_invitation",
  "consent_policy_update",
]);

const subjects = {
  account_verification: "Verify your Mona’s Heart account",
  password_reset: "Reset your Mona’s Heart password",
  security_alert: "Security alert for your Mona’s Heart account",
  account_change: "Your Mona’s Heart account was changed",
  export_ready: "Your Mona’s Heart export is ready",
  deletion_status: "Your Mona’s Heart deletion request was updated",
  organization_invitation: "You have an organization invitation",
  reviewer_invitation: "You have a reviewer invitation",
  consent_policy_update: "Mona’s Heart consent policy update",
};

export function renderEmail({
  kind,
  actionUrl,
  locale = "en",
  region = "global",
  templateVersion = "1",
}) {
  if (!EMAIL_KINDS.includes(kind)) throw new Error("Unsupported email kind");
  const action = actionUrl
    ? `\nUse this secure, time-limited link: ${actionUrl}`
    : "";
  const text = `${subjects[kind]}.${action}\nIf you did not request this, contact support.\nProminent Life Investments`;
  return {
    kind,
    locale,
    region,
    templateVersion,
    subject: subjects[kind],
    text,
    html: `<main lang="${locale}"><h1>${subjects[kind]}</h1>${actionUrl ? `<p><a href="${actionUrl}">Continue securely</a></p>` : ""}<p>If you did not request this, contact support.</p><footer>Prominent Life Investments</footer></main>`,
  };
}

export class EmailProvider {
  constructor(name = "unconfigured") {
    this.name = name;
  }
  async send() {
    throw new Error("Email provider not configured");
  }
  async health() {
    return { status: "unconfigured" };
  }
  // Provider adapters must normalize bounce/complaint webhooks after signature verification.
  async parseWebhook() {
    throw new Error("Webhook adapter not configured");
  }
}

export class DevelopmentConsoleEmailProvider extends EmailProvider {
  constructor(write = (message) => process.stdout.write(message)) {
    super("development_console");
    this.write = write;
  }
  async send(message) {
    if (
      !message.to.endsWith(".test") &&
      !message.to.endsWith("@example.invalid")
    )
      throw new Error(
        "Development email provider accepts fictional addresses only",
      );
    this.write(
      `Development ${message.template.kind} email queued; recipient and token intentionally omitted\n`,
    );
    return { providerMessageId: `dev-${Date.now()}`, accepted: true };
  }
  async health() {
    return { status: "mock" };
  }
}

export class TestEmailProvider extends EmailProvider {
  constructor() {
    super("test");
    this.messages = [];
  }
  async send(message) {
    this.messages.push(structuredClone(message));
    return {
      providerMessageId: `test-${this.messages.length}`,
      accepted: true,
    };
  }
  async health() {
    return { status: "mock" };
  }
}

export class ProductionEmailAdapter extends EmailProvider {
  constructor({ name, send, health, parseWebhook }) {
    super(name);
    this.sendAdapter = send;
    this.healthAdapter = health;
    this.webhookAdapter = parseWebhook;
  }
  async send(message) {
    return this.sendAdapter(message);
  }
  async health() {
    return this.healthAdapter();
  }
  async parseWebhook(input) {
    return this.webhookAdapter(input);
  }
}

export function createEmailProvider({
  environment = process.env.NODE_ENV,
  provider = process.env.EMAIL_PROVIDER,
} = {}) {
  if (environment === "test") return new TestEmailProvider();
  if (environment !== "production" && (!provider || provider === "console"))
    return new DevelopmentConsoleEmailProvider();
  // SES, SendGrid, Postmark, Mailgun and ACS integrations are injected here by deployment packages.
  throw new Error("A configured production email adapter is required");
}
