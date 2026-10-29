// Local-only synthetic preview. Never imports production credentials or starts a tunnel.
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, ".local-preview");
const statePath = path.join(directory, "state.json");
const base = "http://127.0.0.1:5173";
const children = [];
let stage = "prerequisites";
let state,
  vite,
  frontend,
  lock,
  closing = false,
  ownsContainer = false;
async function command(executable, args, env = process.env) {
  const child = spawn(executable, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output = (output + chunk).slice(-65536);
  });
  child.stderr.resume();
  const result = await Promise.race([
    once(child, "exit").then(([code]) => code),
    once(child, "error").then(() => -1),
  ]);
  if (result !== 0)
    throw new Error(
      `${path.basename(executable)} command failed. Check that Node.js 24 and local Docker are installed and running. Credentials and command output were withheld.`,
    );
  return output.trim();
}
async function freePort(port) {
  const server = net.createServer();
  server.listen(port, "127.0.0.1");
  try {
    await once(server, "listening");
  } catch {
    throw new Error(
      `Port ${port} is already in use. Close the other local app before starting this preview.`,
    );
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    if (children.some((c) => c.exitCode !== null))
      throw new Error("The local API exited before becoming ready.");
    try {
      if (
        (await fetch(url, { signal: globalThis.AbortSignal.timeout(1000) }))
          .status === 200
      )
        return;
    } catch {}
    await delay(200);
  }
  throw new Error(
    "Local startup timed out. Your database and encryption key were preserved; retry after checking Docker.",
  );
}
async function stop() {
  if (closing) return;
  closing = true;
  if (frontend) {
    const closed = new Promise((resolve) => frontend.close(resolve));
    frontend.closeAllConnections();
    await closed;
  }
  if (vite) await vite.close();
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const done = once(child, "exit");
      child.kill("SIGTERM");
      const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
      try {
        await done;
      } finally {
        clearTimeout(timeout);
      }
    }),
  );
  if (state && ownsContainer) {
    try {
      await command("docker", ["stop", state.container]);
    } catch {}
  }
  if (lock) {
    await lock.close();
    await fs.unlink(path.join(directory, "running.lock")).catch(() => {});
  }
}
async function start() {
  if (process.env.NODE_ENV === "production")
    throw new Error("The local preview cannot run in production.");
  if (Number(process.versions.node.split(".")[0]) !== 24)
    throw new Error(
      "Install Node.js 24 LTS, then run npm ci and npm run preview:local.",
    );
  await Promise.all([freePort(3001), freePort(5173)]);
  const endpoint =
    process.env.DOCKER_HOST ||
    (await command("docker", [
      "context",
      "inspect",
      "--format",
      '{{(index .Endpoints "docker").Host}}',
    ]));
  if (!endpoint.startsWith("unix://") && !endpoint.startsWith("npipe://"))
    throw new Error(
      "Select a local Docker context. Remote Docker engines are not supported by this preview.",
    );
  await command("docker", ["info", "--format", "{{.ServerVersion}}"]);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    lock = await fs.open(path.join(directory, "running.lock"), "wx", 0o600);
    await lock.writeFile(String(process.pid));
  } catch {
    throw new Error(
      "A preview lock exists. Stop the existing preview first. If it crashed, remove only .local-preview/running.lock, then retry; keep state.json and the Docker volume.",
    );
  }
  try {
    state = JSON.parse(await fs.readFile(statePath, "utf8"));
    if (
      state.version !== 1 ||
      !/^mona-local-[a-f0-9]{12}$/.test(state.container) ||
      state.volume !== `${state.container}-data` ||
      !Array.isArray(state.accounts) ||
      state.accounts.length !== 3 ||
      !state.accounts.every(
        (a, i) =>
          a.role === ["patient", "survivor", "caregiver"][i] &&
          a.email === `${a.role}@monas-heart.test` &&
          /^[A-Za-z0-9_-]{24}$/.test(a.password),
      ) ||
      !/^[A-Za-z0-9+/]{43}=$/.test(state.key) ||
      !/^[a-f0-9]{64}$/.test(state.sessionPepper) ||
      !/^[a-f0-9]{48}$/.test(state.adminPassword) ||
      !/^[a-f0-9]{48}$/.test(state.runtimePassword)
    )
      throw new Error(
        "Invalid local preview state. Preserve state.json and its database volume; do not replace the encryption key.",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const name = `mona-local-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    state = {
      version: 1,
      container: name,
      volume: `${name}-data`,
      adminPassword: randomBytes(24).toString("hex"),
      runtimePassword: randomBytes(24).toString("hex"),
      key: randomBytes(32).toString("base64"),
      sessionPepper: randomBytes(32).toString("hex"),
      accounts: ["patient", "survivor", "caregiver"].map((role) => ({
        role,
        email: `${role}@monas-heart.test`,
        password: randomBytes(18).toString("base64url"),
      })),
    };
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
  }
  const envFile = path.join(directory, "postgres.env");
  await fs.writeFile(
    envFile,
    `POSTGRES_DB=mona_local\nPOSTGRES_USER=mona_local_admin\nPOSTGRES_PASSWORD=${state.adminPassword}\n`,
    { mode: 0o600 },
  );
  let exists = false;
  try {
    const label = await command("docker", [
      "container",
      "inspect",
      "--format",
      '{{index .Config.Labels "com.monas-heart.synthetic-preview"}}',
      state.container,
    ]);
    if (label !== "true")
      throw new Error("Refusing an unrelated Docker container");
    exists = true;
  } catch {}
  if (exists) await command("docker", ["start", state.container]);
  else {
    process.stdout.write(
      "Preparing local PostgreSQL (the first download may take a few minutes)…\n",
    );
    await command("docker", [
      "run",
      "--detach",
      "--name",
      state.container,
      "--label",
      "com.monas-heart.synthetic-preview=true",
      "--env-file",
      envFile,
      "--publish",
      "127.0.0.1::5432",
      "--volume",
      `${state.volume}:/var/lib/postgresql/data`,
      "postgres:16-alpine",
    ]);
  }
  ownsContainer = true;
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try {
      await command("docker", [
        "exec",
        state.container,
        "pg_isready",
        "-U",
        "mona_local_admin",
        "-d",
        "mona_local",
      ]);
      healthy = true;
      break;
    } catch {}
    await delay(200);
  }
  if (!healthy)
    throw new Error(
      "Local PostgreSQL did not become ready; database files were preserved.",
    );
  const mapping = await command("docker", [
    "port",
    state.container,
    "5432/tcp",
  ]);
  const port = /^127\.0\.0\.1:([0-9]+)$/.exec(mapping)?.[1];
  if (!port)
    throw new Error(
      "Refusing a database port that is not bound only to loopback.",
    );
  // Construct an allowlisted environment; production URLs and delivery settings
  // from the caller are never inherited by the API or migration commands.
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/^(DATABASE_|DB_|TEST_DATABASE_|NODE_ENV$|EMAIL_|PUBLIC_APP_URL$|SYNTHETIC_|API_|SESSION_PEPPER$|CSRF_SECRET$|RATE_LIMIT_|RXNORM_|OBJECT_|MALWARE_|LOG_HASH_KEY$|MESSAGE_ENCRYPTION_KEY$|CACHE_PROVIDER$|CORS_ALLOWLIST$|TRUSTED_PROXIES$)/.test(
          key,
        ),
    ),
  );
  const env = {
    ...inherited,
    NODE_ENV: "test",
    DATABASE_ADAPTER: "postgres",
    DATABASE_SSL: "false",
    DB_ADMIN_URL: `postgresql://mona_local_admin:${state.adminPassword}@127.0.0.1:${port}/mona_local`,
    DATABASE_URL: `postgresql://mona_local_runtime:${state.runtimePassword}@127.0.0.1:${port}/mona_local`,
    DB_RUNTIME_USER: "mona_local_runtime",
    DB_RUNTIME_PASSWORD: state.runtimePassword,
    API_HOST: "127.0.0.1",
    API_PORT: "3001",
    PUBLIC_APP_URL: base,
    CORS_ALLOWLIST: `${base},http://localhost:5173`,
    TRUSTED_PROXIES: "",
    SYNTHETIC_PATIENT_JOURNEY_ENABLED: "true",
    SYNTHETIC_MESSAGING_ENABLED: "true",
    MESSAGE_ENCRYPTION_KEY: state.key,
    SESSION_PEPPER: state.sessionPepper,
    RATE_LIMIT_PROVIDER: "memory",
    RATE_LIMIT_HASH_KEY: state.sessionPepper,
    EMAIL_PROVIDER: "test",
    DEVELOPMENT_OUTBOX_DIR: "",
  };
  stage = "database migrations and provisioning";
  for (const script of [
    "migrate.mjs",
    "seed.mjs",
    "provision-runtime-role.mjs",
  ])
    await command(process.execPath, [`scripts/${script}`], env);
  const [{ createStore }, { MonaService }] = await Promise.all([
    import("../server/store-factory.mjs"),
    import("../server/service.mjs"),
  ]);
  stage = "restricted database connection";
  const store = await createStore(env);
  try {
    stage = "synthetic accounts";
    const service = new MonaService(store);
    for (const account of state.accounts) {
      let actor = await store.findUserByEmail(account.email);
      if (!actor) {
        const result = await service.register(account);
        await service.verifyEmail(result.verificationToken);
        actor = await store.findUserById(result.userId);
      }
      if (actor.status !== "active" || !actor.verifiedAt)
        throw new Error(
          "A synthetic account is unavailable; its status was preserved.",
        );
      const profile = await store.getOwnProfile(actor.id);
      if (profile?.onboarding?.completedAt) continue;
      await service.saveOwnProfile(actor, {
        displayName: `Synthetic ${account.role}`,
        onboarding: {
          consent: true,
          consentVersion: "synthetic-onboarding-v1",
          privacy: "private",
        },
      });
    }
  } finally {
    await store.close();
  }
  await fs.writeFile(
    path.join(directory, "TEST-ACCOUNTS.txt"),
    `LOCAL SYNTHETIC ACCOUNTS ONLY\n${base}/login\n\n${state.accounts.map((a) => `${a.role}: ${a.email}\nPassword: ${a.password}`).join("\n\n")}\n\nUse different browser profiles/private windows for patient and survivor. No discovery card, connection request or conversation is pre-created.\n`,
    { mode: 0o600 },
  );
  stage = "local API";
  const apiEnv = { ...env };
  delete apiEnv.DB_ADMIN_URL;
  delete apiEnv.DB_RUNTIME_PASSWORD;
  const api = spawn(process.execPath, ["server/index.mjs"], {
    cwd: root,
    env: apiEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  api.stdout.resume();
  api.stderr.resume();
  children.push(api);
  await ready("http://127.0.0.1:3001/health/ready");
  stage = "browser frontend";
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    configFile: path.join(root, "vite.config.ts"),
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      middlewareMode: true,
      hmr: false,
      fs: {
        deny: [
          ".env",
          ".env.*",
          "*.{crt,pem}",
          "**/.git/**",
          "**/.local-preview/**",
        ],
      },
    },
    plugins: [
      {
        name: "local-only-registration-disabled",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (
              new URL(req.url, "http://localhost").pathname ===
              "/v1/auth/register"
            ) {
              res.writeHead(503, {
                "content-type": "application/json",
                "cache-control": "no-store",
              });
              res.end(
                JSON.stringify({
                  error:
                    "Registration is disabled in this local preview; use the prepared synthetic accounts",
                }),
              );
              return;
            }
            next();
          });
        },
      },
    ],
  });
  frontend = http.createServer(vite.middlewares);
  frontend.listen(5173, "127.0.0.1");
  await once(frontend, "listening");
  process.stdout.write(
    `\nMona's Heart is ready: ${base}/login\nOpen .local-preview/TEST-ACCOUNTS.txt for the three synthetic logins.\nOnly your computer can connect. Registration is disabled at the preview entrypoint.\nPress Ctrl+C to stop. Accounts, history and the encryption key are preserved for next time.\n`,
  );
  if (process.argv.includes("--setup-only")) {
    await stop();
    return;
  }
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
    api.once("exit", resolve);
  });
}
try {
  await start();
} catch (error) {
  console.error(
    `Local preview stopped at ${stage} (${error.code ?? error.name}).`,
  );
  console.error(
    error.message.startsWith("Invalid local") ||
      error.message.includes("Port ") ||
      error.message.includes("preview") ||
      error.message.includes("Docker") ||
      error.message.includes("Node.js")
      ? error.message
      : "Local preview setup failed. Private state was preserved; no credentials were printed. Check Docker and rerun npm ci before retrying.",
  );
  process.exitCode = 1;
} finally {
  await stop();
}
