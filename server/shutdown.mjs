const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Create an idempotent shutdown boundary for the API process. New connections
 * stop immediately, existing requests receive a bounded drain window, and
 * owned resources close before the process is allowed to exit.
 */
export function createShutdown({
  server,
  resources = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
}) {
  let pending;

  return function shutdown(signal = "shutdown") {
    if (pending) return pending;

    pending = new Promise((resolve) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        server.closeAllConnections?.();
      }, timeoutMs);
      timer.unref?.();

      server.close(async (serverError) => {
        const failures = serverError ? [serverError] : [];
        for (const resource of resources) {
          if (typeof resource?.close !== "function") continue;
          try {
            await resource.close();
          } catch (error) {
            failures.push(error);
          }
        }
        clearTimeout(timer);
        const ok = failures.length === 0 && !timedOut;
        logger[ok ? "info" : "error"]?.("api_shutdown", {
          signal,
          status: ok ? "complete" : timedOut ? "timed_out" : "failed",
          failureCount: failures.length,
        });
        resolve({ ok, timedOut, failures });
      });
    });

    return pending;
  };
}
