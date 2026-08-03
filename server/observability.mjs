import { createHash, randomUUID } from "node:crypto";

const FORBIDDEN_KEYS =
  /password|token|secret|connection|string|diagnosis|medication|symptom|lab|document|message|prompt|content/i;
export function redact(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => !FORBIDDEN_KEYS.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" && value.length > 200
          ? `${value.slice(0, 200)}…`
          : value,
      ]),
  );
}
export function pseudonymousId(
  value,
  key = process.env.LOG_HASH_KEY ?? "development-only",
) {
  return createHash("sha256")
    .update(`${key}:${value}`)
    .digest("hex")
    .slice(0, 20);
}
export function createLogger(
  write = (line) => process.stdout.write(`${line}\n`),
) {
  const emit = (level, event, fields) =>
    write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        ...redact(fields),
      }),
    );
  return {
    info: (event, fields = {}) => emit("info", event, fields),
    error: (event, fields = {}) => emit("error", event, fields),
  };
}
export class Metrics {
  constructor() {
    this.values = new Map();
  }
  increment(name, labels = {}) {
    const safeLabels = redact(labels);
    const key = `${name}:${JSON.stringify(safeLabels)}`;
    this.values.set(key, (this.values.get(key) ?? 0) + 1);
  }
  observe(name, value, labels = {}) {
    if (Number.isFinite(value))
      this.values.set(`${name}:${JSON.stringify(redact(labels))}`, value);
  }
}
export class Observability {
  constructor({
    logger = createLogger(),
    metrics = new Metrics(),
    traces = null,
    errors = null,
    alerts = null,
  } = {}) {
    this.logger = logger;
    this.metrics = metrics;
    this.traces = traces;
    this.errors = errors;
    this.alerts = alerts;
  }
  requestId(header) {
    return /^[A-Za-z0-9_-]{8,100}$/.test(header ?? "") ? header : randomUUID();
  }
}
// OpenTelemetry, Sentry, Datadog, Azure Monitor, CloudWatch and Google Cloud adapters
// are deployment-injected sinks; health data never enters this provider-neutral API.
