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
import pg from "pg";

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
const role = process.env.ONBOARDING_TEST_ROLE ?? "patient";
const detailLabel =
  role === "patient"
    ? "Diagnosis (optional)"
    : role === "survivor"
      ? "Lived experience (optional)"
      : "Caregiver information (optional)";
const email = `browser-${Date.now()}@example.test`;
const password = "synthetic correct horse battery staple";
async function delivered(kind) {
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.name));
  step = "anonymous protection";
  await page.goto(`${base}/dashboard`);
  await page.waitForURL("**/login");
  step = "register";
  await page.goto(`${base}/signup`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator("select[name=role]").selectOption(role);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create synthetic account" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Account created" })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/signup");
  step = "unverified login";
  await page.goto(`${base}/login`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "verification" }).waitFor();
  step = "verify";
  const verifyLink = await delivered("account_verification");
  await page.goto(verifyLink);
  await page
    .getByRole("button", { name: "Verify account", exact: true })
    .click();
  await page
    .getByText("Your synthetic account is verified. You can now sign in.")
    .waitFor();
  assert.equal(new URL(page.url()).search, "");
  step = "login";
  await page.goto(`${base}/login`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/onboarding");
  step = "onboarding save";
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Synthetic Alice");
  await page.getByLabel("Pronouns (optional)").fill("they/them");
  await page.getByLabel(detailLabel).fill("Fictional onboarding detail Alpha");
  await page
    .getByLabel("Support preferences (optional)")
    .fill("Synthetic peer support");
  if (role === "patient") {
    await page.getByLabel("Symptoms (optional)").fill("Fictional symptom Beta");
    await page
      .getByLabel("Medications (optional)")
      .fill("Fictional medication Gamma");
  }
  if (role === "survivor") {
    await page.getByLabel("I am willing to mentor").check();
    await page.getByLabel("I consent to future synthetic matching").check();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: `/tmp/mona-onboarding-${role}-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel("I agree to save these synthetic details").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("heading", { name: /Welcome, Synthetic Alice/ })
    .waitFor();
  step = "reload and concurrent tab";
  await page.reload();
  await page
    .getByRole("heading", { name: /Welcome, Synthetic Alice/ })
    .waitFor();
  await page
    .getByText("Onboarding complete. Your details are saved privately.")
    .waitFor();
  await page
    .getByText("Fictional onboarding detail Alpha", { exact: true })
    .waitFor();
  const tab = await context.newPage();
  await tab.goto(`${base}/onboarding`);
  await tab.getByLabel("Display name", { exact: true }).waitFor();
  assert.equal(
    await tab.getByLabel("Display name", { exact: true }).inputValue(),
    "Synthetic Alice",
  );
  assert.equal(
    await tab.getByLabel(detailLabel).inputValue(),
    "Fictional onboarding detail Alpha",
  );
  await tab.getByRole("heading", { name: "Your consent history" }).waitFor();
  await tab.getByText("Private onboarding: Granted", { exact: true }).waitFor();
  if (role === "survivor")
    await tab
      .getByText("Matching preference: Granted", { exact: true })
      .waitFor();
  await tab.close();
  const me = await page.evaluate(async () => {
    const r = await fetch("/v1/auth/me");
    return r.json();
  });
  assert.deepEqual(Object.keys(me.user).sort(), ["id", "roles"]);
  const csrfDenied = await page.evaluate(async () => {
    const r = await fetch("/v1/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Spoof" }),
    });
    return r.status;
  });
  assert.equal(csrfDenied, 403);
  const own = await page.evaluate(
    async () => (await (await fetch("/v1/profile")).json()).profile,
  );
  assert.equal(own.onboarding.accountType, role);
  assert.equal(own.onboarding.privacy, "private");
  assert.equal(own.onboarding.supportPreferences, "Synthetic peer support");
  if (role === "survivor") assert.equal(own.onboarding.matchingConsent, true);
  step = "edit after other tab";
  await page.getByRole("link", { name: "Edit profile" }).click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Synthetic Alice Updated");
  if (role === "survivor")
    await page.getByLabel("I consent to future synthetic matching").uncheck();
  await page.getByLabel("I agree to save these synthetic details").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByText("Fictional onboarding detail Alpha", { exact: true })
    .waitFor();
  if (role === "survivor") {
    const withdrawn = await page.evaluate(
      async () =>
        (await (await fetch("/v1/profile")).json()).profile.onboarding
          .matchingConsent,
    );
    assert.equal(withdrawn, false);
    await page.getByRole("link", { name: "Edit profile" }).click();
    await page
      .getByText("Matching preference: Not granted / withdrawn", {
        exact: true,
      })
      .waitFor();
    await page
      .getByText("Matching preference: Granted", { exact: true })
      .waitFor();
    await page.goto(`${base}/dashboard`);
    await page
      .getByRole("heading", { name: /Welcome, Synthetic Alice Updated/ })
      .waitFor();
  }
  step = "no browser persistence";
  const stored = await page.evaluate(() => ({
    local: Object.keys(globalThis.localStorage),
    session: Object.keys(globalThis.sessionStorage),
    cookie: globalThis.document.cookie,
  }));
  assert.deepEqual(stored.local, []);
  assert.deepEqual(stored.session, []);
  assert.doesNotMatch(stored.cookie, /mh_session/);
  step = "mobile and visual QA";
  await page.screenshot({ path: "/tmp/mona-auth-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      globalThis.document.querySelector("aside").getBoundingClientRect()
        .right <= 1,
  );
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.waitForFunction(
    () =>
      globalThis.document.querySelector("aside").getBoundingClientRect()
        .right <= 1,
  );
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.innerWidth,
    ),
    true,
  );
  for (const selector of [".page", ".welcome", ".page > .narrow"])
    assert.equal(
      await page
        .locator(selector)
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
      true,
      `${selector} must fit the mobile viewport`,
    );
  await page.screenshot({ path: "/tmp/mona-auth-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  step = "authenticated routes never imply demo ownership";
  await page.goto(`${base}/messages`);
  await page
    .getByRole("heading", { name: "This part of your journey is coming next" })
    .waitFor();
  step = "logout";
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL("**/login");
  assert.equal((await context.request.get(`${base}/v1/profile`)).status(), 401);
  await page.goto(`${base}/dashboard`);
  await page.waitForURL("**/login");
  step = "password reset";
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "If this account is eligible" })
    .waitFor();
  await page.goto(await delivered("password_reset"));
  await page
    .getByLabel("New password", { exact: true })
    .fill(password + " changed");
  await page.getByLabel("Confirm password").fill(password + " changed");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await page.getByText("Password updated. Sign in again.").waitFor();
  step = "returning account";
  await page.goto(`${base}/login`);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(password + " changed");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("heading", { name: /Welcome, Synthetic Alice Updated/ })
    .waitFor();
  step = "client expiry timer clears data";
  const expiryTab = await context.newPage();
  await expiryTab.clock.install();
  await expiryTab.goto(`${base}/dashboard`);
  await expiryTab
    .getByRole("heading", { name: /Welcome, Synthetic Alice Updated/ })
    .waitFor();
  await expiryTab.clock.fastForward(31 * 60 * 1000);
  await expiryTab.waitForURL("**/login");
  assert.doesNotMatch(
    await expiryTab.locator("body").innerText(),
    /Synthetic Alice Updated/,
  );
  await expiryTab.close();
  step = "session expiry clears data";
  admin = new pg.Client({ connectionString: process.env.DB_ADMIN_URL });
  await admin.connect();
  await page.getByRole("link", { name: "Edit profile" }).click();
  await page
    .getByText("Private onboarding: Granted", { exact: true })
    .first()
    .waitFor();
  // Expire after the form/history read completes so this specifically tests a
  // write receiving 401; the history GET also correctly detects expired sessions.
  await admin.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [me.user.id],
  );
  await page.getByLabel("Display name", { exact: true }).fill("Must not save");
  await page.getByLabel("I agree to save these synthetic details").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForURL("**/login");
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /Synthetic Alice Updated/,
  );
  step = "API failure is recoverable";
  await context.route("**/v1/auth/me", (route) => route.abort());
  await page.reload();
  await page
    .getByRole("alert")
    .filter({ hasText: "unavailable or disabled" })
    .waitFor();
  await context.unroute("**/v1/auth/me");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await page
    .getByRole("button", { name: "Log in", exact: true })
    .waitFor({ state: "visible" });
  step = "explicit demo preserved";
  await page.getByRole("button", { name: "Enter with demo account" }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByText(
      "Demonstration — fictional examples; changes are not saved to an account.",
    )
    .waitFor();
  await page.getByRole("heading", { name: /Good morning, Elena/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Browser onboarding PASS (${role}): register, verify, login, save, reload, two tabs, edit, CSRF, logout, reset, expiry, API failure, mobile and explicit demo`,
  );
} catch (error) {
  // Never print token-bearing navigation URLs or private delivery contents.
  console.error(`Browser onboarding FAIL at ${step} (${error.name})`);
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
