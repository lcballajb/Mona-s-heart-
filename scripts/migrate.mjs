import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool } from "../server/database.mjs";

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../db/migrations",
);
const pool = createPool();
try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  if (process.argv.includes("--version")) {
    const { rows } = await pool.query(
      "SELECT version, applied_at FROM schema_migrations ORDER BY version",
    );
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  } else {
    const files = (await fs.readdir(directory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();
    for (const file of files) {
      const sql = await fs.readFile(path.join(directory, file), "utf8");
      const checksum = (await import("node:crypto"))
        .createHash("sha256")
        .update(sql)
        .digest("hex");
      const existing = await pool.query(
        "SELECT checksum FROM schema_migrations WHERE version=$1",
        [file],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${file}`);
        continue;
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Existing migration planning contains its own BEGIN/COMMIT; strip only boundary statements.
        await client.query(
          sql.replace(/^BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, ""),
        );
        await client.query(
          "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
          [file, checksum],
        );
        await client.query("COMMIT");
        process.stdout.write(`Applied ${file}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  }
} finally {
  await pool.end();
}
