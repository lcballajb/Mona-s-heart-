import { spawnSync } from "node:child_process";
for (const role of ["patient", "survivor", "caregiver"]) {
  const result = spawnSync(process.execPath, ["tests/browser-onboarding.mjs"], {
    env: { ...process.env, ONBOARDING_TEST_ROLE: role },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const peers = spawnSync(process.execPath, ["tests/browser-peers.mjs"], {
  env: process.env,
  stdio: "inherit",
});
if (peers.status !== 0) process.exit(peers.status ?? 1);
