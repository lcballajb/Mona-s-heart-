import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { parseCookies, readJsonBody } from "../server/http-request.mjs";

test("cookie parsing preserves encoded values and ignores invalid segments", () => {
  assert.deepEqual(parseCookies("session=a%3Db%3D; theme=dark; ignored"), {
    session: "a=b=",
    theme: "dark",
  });
  assert.throws(() => parseCookies("session=%ZZ"), /Malformed cookie header/);
});

test("JSON request bodies reject malformed and oversized payloads as client errors", async () => {
  assert.deepEqual(await readJsonBody(Readable.from(['{"ok":true}'])), {
    ok: true,
  });
  await assert.rejects(
    readJsonBody(Readable.from(["{"])),
    (error) => error.statusCode === 400 && /Malformed JSON/.test(error.message),
  );
  await assert.rejects(
    readJsonBody(Readable.from(["12345"]), 4),
    (error) => error.statusCode === 413,
  );
});
