import fs from "node:fs/promises";
import { createPool } from "../server/database.mjs";

if (!process.env.DB_ADMIN_URL)
  throw new Error("DB_ADMIN_URL is required for seeds");

const pool = createPool({
  ...process.env,
  DATABASE_URL: process.env.DB_ADMIN_URL,
});
try {
  await pool.query(
    await fs.readFile(new URL("../db/seed.sql", import.meta.url), "utf8"),
  );
  process.stdout.write("Fictional seed applied idempotently.\n");
} finally {
  await pool.end();
}
