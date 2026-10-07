import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LombokConfigError, explain, merge, parseDotenv, resolve } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");

test("README quick-start output is exactly what the library produces", () => {
  const env = parseDotenv("DB_HOST=db.example.com\nDB_PORT=6543\n");
  const schema = {
    db: { host: { type: "string", env: "DB_HOST" }, port: { type: "int", env: "DB_PORT", default: 5432, min: 1, max: 65535 } },
    debug: { type: "bool", env: "APP_DEBUG", default: false },
  };
  const out = JSON.stringify(resolve(schema, env));
  assert.equal(out, '{"db":{"host":"db.example.com","port":6543},"debug":false}');
  assert.ok(read("README.md").includes(out));
});

test("guide recipes behave as documented", () => {
  const g = read("docs/guide_how_to_use_LombokConfig_v0.1.0.md");
  assert.throws(() => resolve({ db: { port: { type: "int", env: "DB_PORT" } } }, { DB_PORT: "80a" }), (e: unknown) => e instanceof LombokConfigError && e.code === "invalid_value" && e.path === "db.port");
  const ex = JSON.stringify(explain({ db: { pass: { type: "string", env: "DB_PASS", secret: true } } }, { DB_PASS: "x" }));
  assert.ok(g.includes(ex), ex);
  const m = JSON.stringify(merge({ cache: { ttl: 60, driver: "memory" } }, { cache: { ttl: 5 } }));
  assert.ok(g.includes(m), m);
  const d = parseDotenv("APP_URL=https://example.com\nCALLBACK_URL=${APP_URL}/callback\nLOG_LEVEL=${LOG_LEVEL:-info}\n");
  assert.deepEqual(d, { APP_URL: "https://example.com", CALLBACK_URL: "https://example.com/callback", LOG_LEVEL: "info" });
  assert.deepEqual(parseDotenv("A=a#b"), { A: "a#b" });
});
