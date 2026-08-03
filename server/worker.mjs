export const JOB_KINDS = new Set([
  "email_delivery",
  "data_export",
  "account_deletion",
  "malware_scan",
  "document_retention_cleanup",
  "expired_export_cleanup",
  "expired_token_cleanup",
  "audit_archival",
  "notification_delivery",
  "document_processing",
]);

export class Worker {
  constructor({
    store,
    handlers = {},
    concurrency = 2,
    leaseMs = 60_000,
    maxAttempts = 5,
    pollMs = 1000,
    logger = { info() {}, error() {} },
  }) {
    this.store = store;
    this.handlers = handlers;
    this.concurrency = Math.max(1, Math.min(Number(concurrency), 20));
    this.leaseMs = leaseMs;
    this.maxAttempts = maxAttempts;
    this.pollMs = pollMs;
    this.logger = logger;
    this.running = false;
    this.inFlight = new Set();
    this.lastPollAt = null;
  }
  health() {
    return {
      status: this.running ? "live" : "stopped",
      inFlight: this.inFlight.size,
      lastPollAt: this.lastPollAt,
    };
  }
  async tick() {
    this.lastPollAt = new Date().toISOString();
    const capacity = this.concurrency - this.inFlight.size;
    if (capacity <= 0) return;
    const jobs = await this.store.claimJobs({
      limit: capacity,
      leaseMs: this.leaseMs,
    });
    await Promise.all(jobs.map((job) => this.process(job)));
  }
  async process(job) {
    this.inFlight.add(job.id);
    try {
      if (!JOB_KINDS.has(job.kind) || !this.handlers[job.kind])
        throw new Error("No handler is configured for this job kind");
      await this.handlers[job.kind]({
        reference: job.payloadReference,
        correlationId: job.correlationId,
        idempotencyKey: job.idempotencyKey,
      });
      await this.store.completeJob(job.id);
      this.logger.info("job_completed", {
        kind: job.kind,
        correlationId: job.correlationId,
      });
    } catch (error) {
      await this.store.failJob(job.id, error.message, {
        maxAttempts: this.maxAttempts,
      });
      this.logger.error("job_failed", {
        kind: job.kind,
        correlationId: job.correlationId,
      });
    } finally {
      this.inFlight.delete(job.id);
    }
  }
  async start() {
    this.running = true;
    while (this.running) {
      await this.tick();
      await new Promise((resolve) => {
        this.timer = setTimeout(resolve, this.pollMs);
      });
    }
  }
  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    await Promise.allSettled([...this.inFlight].map(() => Promise.resolve()));
  }
}
