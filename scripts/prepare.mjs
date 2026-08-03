import { chmod } from "node:fs/promises";
try {
  await chmod(".husky/pre-commit", 0o755);
} catch {
  /* Hook is optional in archives. */
}
