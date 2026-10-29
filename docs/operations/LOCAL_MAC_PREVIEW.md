# Test Mona’s Heart on your Mac — free local setup

This runs the real React/API/PostgreSQL app on your computer, with encrypted
message persistence. It does not use Replit, paid hosting, or a public deployment.
Use fictional information only. The launcher is in the `feat/local-synthetic-preview`
branch and the downloadable local-preview source bundle; it is not yet merged.

## First-time setup

Allow roughly 15–30 minutes if you need to install the tools, depending on your
connection. With the tools already installed, allow roughly 5–10 minutes for the
first dependency/database download. These are estimates, not a hosted availability
promise. Subsequent starts normally take less time.

1. Install [Homebrew](https://brew.sh/) if you do not already have it. Follow its
   displayed instructions to add `brew` to your Terminal path.
2. In Terminal, install the free tools:

   ```sh
   brew install node@24 colima docker
   export PATH="$(brew --prefix node@24)/bin:$PATH"
   colima start --cpu 2 --memory 4
   ```

   Colima supplies a local Docker engine without Docker Desktop or a hosting
   subscription. Keep Colima running while using the app. Node 24 is required.

3. Download the [local preview ZIP](https://github.com/lcballajb/Mona-s-heart-/archive/refs/heads/feat/local-synthetic-preview.zip) while signed into GitHub.
   Unzip it, rename the extracted folder **Mona-Heart-Local**, and move that folder
   into Downloads. Then run:

   ```sh
   cd ~/Downloads/Mona-Heart-Local
   npm ci
   npm run preview:local
   ```

4. Wait until Terminal says “Mona’s Heart is ready,” then open
   **http://127.0.0.1:5173/login** in Safari or Chrome. Keep that Terminal open.
5. Open a second Terminal tab (Command+T) and display the local test logins:

   ```sh
   open ~/Downloads/Mona-Heart-Local/.local-preview/TEST-ACCOUNTS.txt
   ```

   The launcher generates unique passwords for the patient, survivor and caregiver
   accounts. You do not need an email account or verification email. No discovery
   card, connection request, conversation, or messages are pre-created.

If you clone the repository instead of downloading the bundle, check out
`feat/local-synthetic-preview` and run the same npm commands from that repository.

## Try the full journey

1. In a normal browser window, sign in as the **survivor** using the test-login
   file. Select **Manage peer connections**, enter a fictional shared display
   name/introduction, check the sharing consent and publish the discovery card.
2. In a **private/incognito window**, sign in as the **patient**. Use the normal
   window for the survivor and private window for the patient throughout this
   test; two ordinary tabs share a login and will not represent separate people.
3. As the patient, find the survivor card, enter a fictional shared display name,
   accept the request-sharing consent and select **Request connection**.
4. In the survivor window, refresh connections and select **Accept connection**.
5. In both windows, open the accepted conversation. Send a fictional message
   from each side. Refresh: both messages should remain.
6. Withdraw the connection or block the counterpart from Peer connections. The
   already-open conversation should become unavailable on its next recheck;
   the server rejects further access/sending immediately after revocation commits.
7. Optional: use another browser for the caregiver account. It should not be able
   to open the patient/survivor conversation, even using its copied URL.

## Stop and return later

Press **Control+C** in the original app Terminal. This stops the frontend, API and
this preview’s database container, preserving its volume, accounts, messages and
key. To return later:

```sh
export PATH="$(brew --prefix node@24)/bin:$PATH"
colima start --cpu 2 --memory 4
cd ~/Downloads/Mona-Heart-Local
npm run preview:local
```

You can run `colima stop` after stopping the app if you want to free the VM’s
resources. Keep `.local-preview/state.json` and the preview’s Docker volume:
losing the encryption key makes existing messages unreadable. Do not share
`.local-preview`, the login file or database files. To move the app folder, stop
it first. Reusing the same folder preserves its local state.

## What this preview does and does not enable

- Only loopback addresses are bound; no tunnel or public listener is started.
- Startup rejects a production environment and remote Docker engines. It uses an
  isolated database/volume and generates local secrets; it does not use caller
  production database or email settings.
- The API uses the restricted runtime role after migrations. Administrator
  credentials are not passed to the API child process.
- Registration is blocked at the preview web entrypoint. The API stays bound to
  loopback, and its existing synthetic `.test` account gate remains in place.
- Secret files are denied by the frontend file server and ignored by Git,
  formatting and repository-reporting tools. No generated secret is in the bundle.
- Email delivery/password-reset email is disabled in this preview. Use the
  generated test-login file. Existing demo screens remain an explicitly selected
  demo; authenticated messaging uses the real local database.
- No worker, production deployment, attachments, group chat or notifications are
  enabled. This is a synthetic evaluation build, not a real-patient release.

If a port is busy, stop the other app using 3001/5173 before retrying. If a crash
left `.local-preview/running.lock`, first confirm the old preview has stopped,
then remove only that lock. Preserve `state.json` and the database volume.

## Verification

The launcher is exercised on an isolated local Docker/PostgreSQL instance through
Chromium: three synthetic logins, explicit publication/request/acceptance,
two-way messages, foreign-account denial, secret-file denial, registration denial,
mobile layout, graceful shutdown/restart and retained encrypted history. These
checks run on the available Linux execution environment; a native Mac/Colima
run is not claimed. Colima/Docker and Node use the same local CLI/protocol seams.

Fresh verification on 2026-10-29: 82 automated tests passed with zero skips,
including real PostgreSQL suites; lint/typecheck, formatting, repository audit,
build and the independent Chromium launcher/restart journey passed. Restart
verification caught and corrected Vite's process-exit handler racing API/database
cleanup; the launcher now owns the HTTP server in middleware mode. Browser
requests for private state, login files and database environment files returned
403; registration through the preview returned 503. The download is built only
from tracked source files and contains no generated local credentials or data.
