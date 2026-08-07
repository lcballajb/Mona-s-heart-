import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([".git", "dist", "node_modules"]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);

async function filesBelow(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(root, path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function repositoryPath(root, path) {
  return relative(root, path).split(sep).join("/");
}

function localMarkdownTargets(markdown) {
  const targets = [];
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget
      .split(/\s+["']/)[0]
      .split("#")[0]
      .split("?")[0];
    if (
      target &&
      !target.startsWith("#") &&
      !target.startsWith("/") &&
      !/^[a-z][a-z\d+.-]*:/i.test(target)
    )
      targets.push(decodeURIComponent(target));
  }
  return targets;
}

export async function auditRepository(rootDirectory) {
  const root = resolve(rootDirectory);
  const files = await filesBelow(root);
  const paths = new Set(files.map((path) => repositoryPath(root, path)));
  const findings = [];
  const hashes = new Map();
  const documentationIndex = paths.has("docs/README.md")
    ? await readFile(resolve(root, "docs/README.md"), "utf8")
    : "";

  for (const path of files) {
    const name = repositoryPath(root, path);
    const extension = extname(path).toLowerCase();
    const content = await readFile(path);

    if (content.length) {
      const digest = createHash("sha256").update(content).digest("hex");
      const duplicate = hashes.get(digest);
      if (duplicate)
        findings.push({ kind: "duplicate", path: name, detail: duplicate });
      else hashes.set(digest, name);
    }

    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const text = content.toString("utf8");
    if (/^(<{7}|={7}|>{7})(?: .*)?$/m.test(text))
      findings.push({ kind: "merge-marker", path: name });

    if (extension === ".md") {
      for (const target of localMarkdownTargets(text)) {
        const resolvedTarget = repositoryPath(
          root,
          resolve(dirname(path), target),
        );
        if (!paths.has(resolvedTarget))
          findings.push({ kind: "broken-link", path: name, detail: target });
      }
    }
  }

  for (const name of [...paths].sort()) {
    if (
      name.startsWith("docs/") &&
      name.endsWith(".md") &&
      name !== "docs/README.md"
    ) {
      const indexTarget = name.slice("docs/".length);
      if (!documentationIndex.includes(`](${indexTarget})`))
        findings.push({ kind: "orphan-document", path: name });
    }
  }

  return { filesScanned: files.length, findings };
}

async function main() {
  const root = process.argv[2] ?? process.cwd();
  const result = await auditRepository(root);
  if (result.findings.length) {
    console.error(
      result.findings
        .map(
          ({ kind, path, detail }) =>
            `${kind}: ${path}${detail ? ` (${detail})` : ""}`,
        )
        .join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Repository audit passed (${result.filesScanned} files scanned).`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
