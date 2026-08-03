const dryRun = process.argv.includes("--dry-run");
if (!dryRun)
  throw new Error(
    "Restore must target an explicitly approved disposable environment",
  );
process.stdout.write(
  "DRY RUN: verify disposable target, checksum, decryption access, pg_restore, migrations, row counts, RLS, and cleanup\n",
);
