import http from "node:http";
import { createStore } from "./store-factory.mjs";
import { MonaService } from "./service.mjs";
import { RxNormProvider, TerminologyCache } from "./terminology.mjs";
import { createEmailProvider } from "./email-provider.mjs";
import { createRateLimiter, privacyKey } from "./rate-limit.mjs";
import {
  securityHeaders,
  allowedOrigin,
  clientAddress,
} from "./http-security.mjs";
import { HealthService } from "./health.mjs";
import { loadApiConfig } from "./config.mjs";
import { createShutdown } from "./shutdown.mjs";
import { createLogger, Observability } from "./observability.mjs";
import { parseCookies, readJsonBody } from "./http-request.mjs";

const config = loadApiConfig();
const store = await createStore();
const email = createEmailProvider();
const rxnorm = new RxNormProvider({
  enabled: config.rxnorm.enabled,
  timeoutMs: config.rxnorm.timeoutMs,
  cache: new TerminologyCache({
    ttlMs: config.rxnorm.cacheTtlMs,
    negativeTtlMs: config.rxnorm.negativeCacheTtlMs,
  }),
});
const rateLimiter = createRateLimiter();
const service = new MonaService(store, email, rateLimiter);
const production = config.production;
const corsAllowlist = config.corsAllowlist;
const trustedProxies = config.trustedProxies;
const health = new HealthService({
  store,
  email,
  terminology: rxnorm,
  required: production ? ["database", "email"] : ["database"],
});
const logger = createLogger();
const observability = new Observability({ logger });
function reply(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...securityHeaders({ production }),
    ...headers,
  });
  response.end(JSON.stringify(payload));
}
const server = http.createServer(async (request, response) => {
  const requestId = observability.requestId(request.headers["x-request-id"]);
  response.setHeader("x-request-id", requestId);
  let path = "/invalid-request-target";
  try {
    path = new URL(request.url, "http://localhost").pathname;
    const origin = request.headers.origin;
    if (!allowedOrigin(origin, corsAllowlist))
      return reply(response, 403, { error: "Origin not allowed" });
    const limit =
      path === "/v1/auth/sign-in"
        ? 10
        : path === "/v1/terminology/medications"
          ? 30
          : 120;
    const rate = await rateLimiter.consume(
      privacyKey(path, clientAddress(request, { trustedProxies })),
      { limit, windowMs: 60_000 },
    );
    if (!rate.allowed)
      return reply(
        response,
        429,
        { error: "Too many requests", code: "RATE_LIMITED" },
        { "retry-after": String(Math.ceil(rate.retryAfterMs / 1000)) },
      );
    if (production && request.headers["x-forwarded-proto"] !== "https")
      return reply(response, 426, { error: "HTTPS required" });
    if (request.method === "GET" && path === "/health/live")
      return reply(response, 200, health.liveness());
    if (request.method === "GET" && path === "/health/ready") {
      const result = await health.readiness();
      return reply(response, result.status === "ready" ? 200 : 503, result);
    }
    if (request.method === "GET" && path === "/health/dependencies")
      return reply(response, 200, await health.details());
    if (request.method === "GET" && path === "/v1/terminology/health")
      return reply(response, 200, rxnorm.health());
    if (request.method === "GET" && path === "/v1/terminology/medications") {
      const query = new URL(request.url, "http://localhost").searchParams.get(
        "q",
      );
      const result = await rxnorm.search(query);
      return reply(response, 200, result);
    }
    if (request.method === "POST" && path === "/v1/auth/register") {
      await service.register(await readJsonBody(request));
      return reply(response, 202, { status: "verification_pending" });
    }
    if (request.method === "POST" && path === "/v1/auth/verify")
      return reply(
        response,
        204,
        await service.verifyEmail((await readJsonBody(request)).token),
      );
    if (request.method === "POST" && path === "/v1/auth/password-reset/request")
      return reply(
        response,
        202,
        await service.requestPasswordReset(await readJsonBody(request)),
      );
    if (
      request.method === "POST" &&
      path === "/v1/auth/password-reset/complete"
    )
      return reply(
        response,
        200,
        await service.resetPassword(await readJsonBody(request)),
      );
    if (request.method === "POST" && path === "/v1/auth/sign-in") {
      const result = await service.signIn(await readJsonBody(request));
      return reply(
        response,
        200,
        { csrfToken: result.csrfToken, expiresAt: result.expiresAt },
        {
          "set-cookie": `mh_session=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${production ? "; Secure" : ""}`,
        },
      );
    }
    const sessionToken = parseCookies(request.headers.cookie).mh_session;
    const actor = await service.actor(sessionToken);
    if (!actor)
      return reply(response, 401, { error: "Authentication required" });
    const session = await store.session(sessionToken);
    if (
      !["GET", "HEAD"].includes(request.method) &&
      !(await store.validateCsrf(session, request.headers["x-csrf-token"]))
    )
      return reply(response, 403, { error: "CSRF validation failed" });
    if (request.method === "POST" && path === "/v1/auth/sign-out") {
      await service.signOut(sessionToken);
      return reply(
        response,
        204,
        {},
        {
          "set-cookie":
            "mh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        },
      );
    }
    if (request.method === "GET" && path === "/v1/auth/sessions")
      return reply(response, 200, { sessions: await service.sessions(actor) });
    if (request.method === "DELETE" && path.startsWith("/v1/auth/sessions/")) {
      await service.revokeSession(actor, path.split("/").at(-1));
      return reply(response, 204, {});
    }
    if (request.method === "POST" && path === "/v1/auth/password/change")
      return reply(
        response,
        200,
        await service.changePassword(actor, await readJsonBody(request)),
      );
    if (request.method === "POST" && path === "/v1/account/export")
      return reply(response, 202, await service.exportData(actor));
    if (request.method === "DELETE" && path === "/v1/account") {
      await service.deleteAccount(actor);
      return reply(response, 202, { status: "deletion_pending" });
    }
    return reply(response, 404, { error: "Not found" });
  } catch (error) {
    logger.error("http_request_failed", {
      requestId,
      method: request.method,
      path,
      statusCode: error.statusCode ?? 500,
      errorType: error.name,
    });
    reply(response, error.statusCode ?? 500, {
      error: error.statusCode ? error.message : "Internal server error",
    });
  }
});

server.listen(config.port, config.host, () =>
  process.stdout.write(`Mona's Heart API listening on ${config.port}\n`),
);

const shutdown = createShutdown({ server, resources: [store], logger });
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, async () => {
    const result = await shutdown(signal);
    process.exitCode = result.ok ? 0 : 1;
  });
