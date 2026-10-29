import { randomBytes } from "node:crypto";
import { Client } from "pg";
// Real Chromium -> same-origin Vite proxy -> API -> restricted PostgreSQL.
// No external delivery, token endpoint, public browser, or real patient fixture.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

if (
  !process.env.TEST_DATABASE_URL ||
  !process.env.DB_ADMIN_URL ||
  /production/i.test(process.env.TEST_DATABASE_URL)
)
  throw new Error(
    "Browser checks require disposable PostgreSQL test credentials",
  );
const base = "http://127.0.0.1:5173";
const outbox = await mkdtemp(join(tmpdir(), "mona-browser-outbox-"));
const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_ADAPTER: "postgres",
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_SSL: "false",
  API_HOST: "127.0.0.1",
  API_PORT: "3001",
  CORS_ALLOWLIST: base,
  PUBLIC_APP_URL: base,
  EMAIL_PROVIDER: "development_file",
  DEVELOPMENT_OUTBOX_DIR: outbox,
  SYNTHETIC_PATIENT_JOURNEY_ENABLED: "true",
  SYNTHETIC_MESSAGING_ENABLED: "true",
  MESSAGE_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};
const children = [];
let browser;
let admin;
let step = "startup";
function start(args) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.resume();
  child.stderr.resume();
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    if (children.some((c) => c.exitCode !== null))
      throw new Error("Child failed");
    try {
      if (
        (await fetch(url, { signal: globalThis.AbortSignal.timeout(1000) }))
          .status === 200
      )
        return;
    } catch {}
    await delay(100);
  }
  throw new Error("Readiness failed");
}
async function delivered(email, kind) {
  for (let i = 0; i < 50; i++) {
    for (const name of await readdir(outbox)) {
      const message = JSON.parse(await readFile(join(outbox, name), "utf8"));
      if (message.to === email && message.template.kind === kind) {
        const link = message.template.text.match(/http:\/\/[^\s]+/)[0];
        assert.equal(new URL(link).origin, base);
        return link;
      }
    }
    await delay(100);
  }
  throw new Error("Synthetic delivery missing");
}
try {
  admin = new Client({
    connectionString: process.env.DB_ADMIN_URL,
    ssl: false,
  });
  await admin.connect();
  start(["server/index.mjs"]);
  start([
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ]);
  await ready("http://127.0.0.1:3001/health/ready");
  await ready(base);
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE_PATH
      ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
      : {}),
  });
  const password = "synthetic matching browser password";
  const survivorAlias = `Shared Synthetic Survivor ${Date.now()}`;
  async function account(role) {
    const email = `peer-browser-${role}-${Date.now()}@example.test`;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    await page.goto(`${base}/signup`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.locator("select[name=role]").selectOption(role);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Create synthetic account" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Account created" })
      .waitFor();
    await page.goto(await delivered(email, "account_verification"));
    await page
      .getByRole("button", { name: "Verify account", exact: true })
      .click();
    await page
      .getByText("Your synthetic account is verified. You can now sign in.")
      .waitFor();
    await page.goto(`${base}/login`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL("**/onboarding");
    await page
      .getByLabel("Display name", { exact: true })
      .fill(`Private ${role}`);
    await page
      .getByLabel("Support preferences (optional)")
      .fill("DO NOT SHARE PRIVATE DETAILS");
    await page.getByLabel("I agree to save these synthetic details").check();
    await page.getByRole("button", { name: "Save profile" }).click();
    await page.waitForURL("**/dashboard");
    await page.getByRole("link", { name: "Manage peer connections" }).click();
    await page
      .getByRole("heading", { name: "Your requests and connections" })
      .waitFor();
    return { page, context };
  }
  step = "register three separate accounts";
  const p = await account("patient"),
    s = await account("survivor"),
    other = await account("caregiver");
  async function publish() {
    await s.page
      .getByLabel("Shared display name", { exact: true })
      .fill(survivorAlias);
    await s.page
      .getByLabel("Introduction (shared)")
      .fill("Explicit shared introduction");
    await s.page.getByLabel("Availability (shared)").fill("Weekends");
    await s.page.getByLabel("I agree to share this card").check();
    await s.page
      .getByRole("button", { name: "Publish discovery card" })
      .click();
    await s.page
      .getByText("Your card is shared with eligible synthetic accounts.", {
        exact: false,
      })
      .waitFor();
  }
  async function requestMatch() {
    await p.page.reload();
    const card = p.page.locator("article").filter({
      has: p.page.getByRole("heading", {
        name: survivorAlias,
        exact: true,
      }),
    });
    await card
      .getByLabel("Your shared display name")
      .fill("Shared Synthetic Requester");
    await card.getByLabel("I agree to share this display name").check();
    await card
      .getByRole("button", { name: "Request connection", exact: true })
      .click();
    await p.page.getByText("pending", { exact: true }).waitFor();
  }
  step = "explicit publication and request";
  await publish();
  await requestMatch();
  assert.doesNotMatch(
    await p.page.locator("body").innerText(),
    /Private survivor|DO NOT SHARE PRIVATE DETAILS/,
  );
  const peers = await (await p.context.request.get(`${base}/v1/peers`)).json();
  const requestId = peers.requests[0].id;
  const otherSession = await (
    await other.context.request.get(`${base}/v1/auth/me`)
  ).json();
  assert.equal(
    (
      await other.context.request.post(`${base}/v1/peers/respond`, {
        headers: { "x-csrf-token": otherSession.csrfToken },
        data: { requestId, action: "accepted" },
      })
    ).status(),
    404,
  );
  step = "recipient acceptance";
  await s.page.reload();
  await s.page
    .getByRole("button", { name: "Accept connection", exact: true })
    .click();
  await s.page.getByText("accepted", { exact: true }).waitFor();
  await p.page.reload();
  await p.page.getByText("accepted", { exact: true }).waitFor();
  step = "two-participant persisted plain-text messaging";
  await p.page
    .getByRole("link", { name: "Open conversation", exact: true })
    .click();
  await s.page
    .getByRole("link", { name: "Open conversation", exact: true })
    .click();
  await p.page.getByText("No messages yet.", { exact: false }).waitFor();
  const text = "Synthetic <img src=x onerror=alert(1)> hello";
  await p.page.getByLabel("Message", { exact: true }).fill(text);
  await p.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await p.page.getByText("Message sent.", { exact: true }).waitFor();
  await s.page.getByText(text, { exact: true }).waitFor();
  assert.equal(await s.page.locator(".message-history img").count(), 0);
  await s.page
    .getByLabel("Message", { exact: true })
    .fill("Synthetic survivor reply");
  await s.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await p.page.getByText("Synthetic survivor reply", { exact: true }).waitFor();
  await p.page.reload();
  await p.page.getByText(text, { exact: true }).waitFor();
  await p.page.getByText("Synthetic survivor reply", { exact: true }).waitFor();
  await p.page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await p.page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.innerWidth,
    ),
    true,
  );
  await other.page.goto(`${base}/messages/${requestId}`);
  await other.page.getByRole("alert").waitFor();
  assert.equal(await other.page.getByText(text, { exact: true }).count(), 0);
  assert.equal(
    (
      await p.context.request.post(`${base}/v1/peer-messages/${requestId}`, {
        data: {
          body: "Missing CSRF",
          clientId: randomBytes(16).toString("hex"),
        },
      })
    ).status(),
    403,
  );
  step = "ambiguous send retry keeps the same identifier";
  let dropReply = true;
  await p.page.route("**/v1/peer-messages/*", async (route) => {
    if (route.request().method() === "POST" && dropReply) {
      dropReply = false;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await p.page
    .getByLabel("Message", { exact: true })
    .fill("Synthetic retry after lost acknowledgement");
  await p.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await p.page.getByRole("alert").waitFor();
  await p.page
    .getByRole("button", { name: "Retry conversation", exact: true })
    .click();
  await p.page.getByLabel("Message", { exact: true }).waitFor();
  assert.equal(
    await p.page.getByLabel("Message", { exact: true }).inputValue(),
    "Synthetic retry after lost acknowledgement",
  );
  await p.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await p.page.getByText("Message sent.", { exact: true }).waitFor();
  assert.equal(
    (
      await admin.query(
        "SELECT count(*) FROM peer_messages WHERE connection_id=$1",
        [requestId],
      )
    ).rows[0].count,
    "3",
  );
  step = "already-open messaging session expires";
  const patientSession = await (
    await p.context.request.get(`${base}/v1/auth/me`)
  ).json();
  await admin.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [patientSession.user.id],
  );
  await p.page.waitForURL("**/login");
  assert.equal(await p.page.locator(".message-history").count(), 0);
  await admin.query(
    "UPDATE sessions SET expires_at=now()+interval '30 minutes' WHERE user_id=$1",
    [patientSession.user.id],
  );
  await p.page.goto(`${base}/messages/${requestId}`);
  await p.page.getByText(text, { exact: true }).waitFor();
  step = "already-open conversation loses eligibility";
  const survivorSession = await (
    await s.context.request.get(`${base}/v1/auth/me`)
  ).json();
  await admin.query("UPDATE users SET status='deactivated' WHERE id=$1", [
    survivorSession.user.id,
  ]);
  await p.page.getByRole("alert").waitFor();
  assert.equal(await p.page.locator(".message-history").count(), 0);
  assert.equal(
    await p.page
      .getByRole("button", { name: "Send message", exact: true })
      .count(),
    0,
  );
  assert.equal(
    (
      await p.context.request.get(`${base}/v1/peer-messages/${requestId}`)
    ).status(),
    404,
  );
  await admin.query("UPDATE users SET status='active' WHERE id=$1", [
    survivorSession.user.id,
  ]);
  await p.page.reload();
  await p.page.getByText(text, { exact: true }).waitFor();
  await s.page.goto(`${base}/matches`);
  await s.page
    .getByRole("button", { name: "Withdraw card and connections" })
    .waitFor();
  step = "withdrawal closes accepted connection";
  await s.page
    .getByRole("button", { name: "Withdraw card and connections" })
    .click();
  await s.page
    .getByText("Your card is not published.", { exact: false })
    .waitFor();
  await p.page.getByRole("alert").waitFor();
  assert.equal(await p.page.locator(".message-history").count(), 0);
  await p.page.goto(`${base}/matches`);
  await p.page.getByText("unavailable", { exact: true }).waitFor();
  assert.equal(
    await p.page
      .getByRole("heading", { name: survivorAlias, exact: true })
      .count(),
    0,
  );
  step =
    "republish does not revive prior connection; blocking prevents new requests";
  await publish();
  await requestMatch();
  await s.page.reload();
  await s.page
    .getByRole("button", { name: "Accept connection", exact: true })
    .click();
  await s.page.getByText("accepted", { exact: true }).waitFor();
  await p.page.reload();
  await p.page
    .getByRole("link", { name: "Open conversation", exact: true })
    .click();
  await p.page.getByText("No messages yet.", { exact: false }).waitFor();
  await s.page.getByRole("button", { name: "Block this connection" }).click();
  await p.page.getByRole("alert").waitFor();
  assert.equal(await p.page.locator(".message-history").count(), 0);
  await p.page.goto(`${base}/matches`);
  await s.page
    .getByRole("heading", { name: "Unavailable connection" })
    .first()
    .waitFor();
  await p.page.reload();
  await p.page
    .getByRole("heading", { name: "Unavailable connection" })
    .first()
    .waitFor();
  assert.equal(
    await p.page
      .getByRole("heading", { name: survivorAlias, exact: true })
      .count(),
    0,
  );
  step =
    "deletion revokes an open conversation and removes both senders' history";
  const caregiverConnection = await other.context.request.post(
    `${base}/v1/peers/requests`,
    {
      headers: { "x-csrf-token": otherSession.csrfToken },
      data: {
        survivorId: survivorSession.user.id,
        alias: "Synthetic caregiver",
        consent: true,
        version: "synthetic-match-request-v1",
      },
    },
  );
  assert.equal(caregiverConnection.status(), 200);
  const { id: caregiverId } = await caregiverConnection.json();
  await s.page.reload();
  await s.page
    .getByRole("button", { name: "Accept connection", exact: true })
    .click();
  await s.page.getByText("accepted", { exact: true }).waitFor();
  await other.page.goto(`${base}/messages/${caregiverId}`);
  await other.page
    .getByLabel("Message", { exact: true })
    .fill("Synthetic before deletion");
  await other.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await other.page.getByText("Message sent.", { exact: true }).waitFor();
  assert.equal(
    (
      await s.context.request.delete(`${base}/v1/account`, {
        headers: { "x-csrf-token": survivorSession.csrfToken },
      })
    ).status(),
    202,
  );
  await other.page.getByRole("alert").waitFor();
  assert.equal(await other.page.locator(".message-history").count(), 0);
  const deletion = (
    await admin.query(
      "UPDATE deletion_requests SET cooling_off_until=now() WHERE user_id=$1 RETURNING id",
      [survivorSession.user.id],
    )
  ).rows[0];
  assert.equal(
    (
      await admin.query("SELECT complete_account_deletion($1) AS ok", [
        deletion.id,
      ])
    ).rows[0].ok,
    true,
  );
  assert.equal(
    (
      await admin.query(
        "SELECT count(*) FROM peer_messages WHERE connection_id=ANY($1::uuid[])",
        [[requestId, caregiverId]],
      )
    ).rows[0].count,
    "0",
  );
  step = "mobile connections";
  await p.page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await p.page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.innerWidth,
    ),
    true,
  );
  await p.page.screenshot({
    path: "/tmp/mona-peer-mobile.png",
    fullPage: true,
  });
  console.log(
    "Browser peer matching PASS: explicit publication, private-field exclusion, request, recipient acceptance, foreign-account denial, encrypted persisted two-way messaging, plain-text rendering, open-page ineligibility/withdrawal/block, republish, mobile",
  );
} catch (error) {
  // Never print token-bearing navigation URLs or private delivery contents.
  console.error(`Browser peer matching FAIL at ${step} (${error.name})`);
  console.error(
    String(error.message).replace(/https?:\/\/[^\s]+/g, "[redacted URL]"),
  );
  process.exitCode = 1;
} finally {
  if (admin) await admin.end();
  if (browser) await browser.close();
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null) return;
      const exit = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      try {
        await exit;
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  await rm(outbox, { recursive: true, force: true });
}
