import fs from "node:fs/promises";
import { createPool } from "../server/database.mjs";
const pool = createPool();
try {
  await pool.query(
    await fs.readFile(new URL("../db/seed.sql", import.meta.url), "utf8"),
  );
  process.stdout.write("Fictional seed applied idempotently.\n");
} finally {
  await pool.end();
}
