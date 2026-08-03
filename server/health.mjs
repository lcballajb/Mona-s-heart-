export class HealthService {
  constructor({
    store,
    email,
    storage,
    scanner,
    terminology,
    migrationVersion = async () => "unknown",
    required = ["database"],
  }) {
    this.dependencies = {
      database: store,
      email,
      storage,
      scanner,
      terminology,
    };
    this.migrationVersion = migrationVersion;
    this.required = new Set(required);
  }
  liveness() {
    return { status: "live" };
  }
  async dependencyHealth() {
    const checks = {};
    for (const [name, provider] of Object.entries(this.dependencies)) {
      try {
        const result = provider?.health
          ? await provider.health()
          : provider?.ready
            ? { status: (await provider.ready()) ? "available" : "unavailable" }
            : provider
              ? { status: "available" }
              : { status: "unconfigured" };
        checks[name] = {
          status:
            result.status === "healthy" ||
            result.status === "available" ||
            result.status === "mock"
              ? result.status
              : "unavailable",
        };
      } catch {
        checks[name] = { status: "unavailable" };
      }
    }
    return checks;
  }
  async readiness() {
    const dependencies = await this.dependencyHealth();
    const ready = [...this.required].every((name) =>
      ["healthy", "available", "mock"].includes(dependencies[name]?.status),
    );
    return { status: ready ? "ready" : "not_ready" };
  }
  async details() {
    return {
      status: "reported",
      dependencies: await this.dependencyHealth(),
      migrationVersion: await this.migrationVersion(),
    };
  }
}
