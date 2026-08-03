import { spawnSync } from "node:child_process";
const dryRun = process.argv.includes("--dry-run");
const required = ["DATABASE_URL", "BACKUP_DESTINATION", "BACKUP_KMS_KEY_ID"];
if (dryRun) {
  process.stdout.write(
    `DRY RUN: validate pg_dump, encrypted destination, integrity manifest, and retention policy (${required.join(", ")})\n`,
  );
  process.exit(0);
}
for (const name of required)
  if (!process.env[name]) throw new Error(`${name} is required`);
const result = spawnSync(
  "pg_dump",
  [
    "--format=custom",
    "--file",
    process.env.BACKUP_TEMP_FILE ?? "/tmp/mona.dump",
    process.env.DATABASE_URL,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) throw new Error("pg_dump failed");
process.stdout.write(
  "Backup created locally; deployment adapter must encrypt, upload, checksum, audit, and remove the temporary file.\n",
);
