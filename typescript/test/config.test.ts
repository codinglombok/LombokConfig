import { test } from "node:test";
import assert from "node:assert/strict";
import { LombokConfigError, explain, get, merge, parseDotenv, resolve } from "../src/index.js";

test("merge and parseDotenv never write to Object.prototype", () => {
  const polluted = merge({}, JSON.parse('{"__proto__":{"polluted":1}}'));
  parseDotenv("__proto__=x\nconstructor=y");
  assert.equal(({} as Record<string, unknown>)["polluted"], undefined);
  assert.equal(Object.getPrototypeOf(polluted), Object.prototype);
  assert.deepEqual(Object.keys(polluted), ["__proto__"]);
});

test("errors carry code, messageId and location", () => {
  try {
    parseDotenv("A=1\nB");
    assert.fail("expected throw");
  } catch (e) {
    assert.ok(e instanceof LombokConfigError);
    assert.equal(e.code, "invalid_dotenv");
    assert.equal(e.messageId, "lombokconfig.error.invalid_dotenv");
    assert.equal(e.line, 2);
  }
  try {
    resolve({ db: { port: { type: "int", env: "P" } } }, { P: "x" });
    assert.fail("expected throw");
  } catch (e) {
    assert.ok(e instanceof LombokConfigError);
    assert.equal(e.path, "db.port");
  }
});

test("error messages never contain the rejected value (secrets stay out of logs)", () => {
  try {
    resolve({ k: { type: "int", env: "K", secret: true } }, { K: "s3cr3t-value" });
    assert.fail("expected throw");
  } catch (e) {
    assert.ok(e instanceof LombokConfigError);
    assert.ok(!e.message.includes("s3cr3t"), e.message);
  }
});

test("resolve returns fresh objects (defaults are not shared)", () => {
  const schema = { l: { type: "list", default: ["a"] } };
  const a = resolve(schema);
  (a["l"] as string[]).push("b");
  assert.deepEqual(resolve(schema), { l: ["a"] });
});

test("explain masks secrets from env and default", () => {
  const e = explain({ k: { type: "string", env: "K", secret: true } }, { K: "v" });
  assert.equal(e[0]!.value, "[secret]");
});

test("get returns the fallback only when the path is missing", () => {
  assert.equal(get({ a: { b: 0 } }, "a.b", 9), 0);
  assert.equal(get({ a: { b: 0 } }, "a.c", 9), 9);
});

// Pseudo-fuzz: random dotenv text never throws anything but LombokConfigError.
test("fuzz: parseDotenv total on arbitrary text", () => {
  let seed = 11;
  const rnd = (): number => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const pieces = ["A", "_b", "=", " ", "\t", "#", "export ", '"', "'", "\\", "$", "{", "}", "${A}", "${A:-x}", "\n", "\r", "\r\n", "\u0000", "\u00e9", "\ufeff"];
  for (let i = 0; i < 5000; i++) {
    const text = Array.from({ length: Math.floor(rnd() * 20) }, () => pieces[Math.floor(rnd() * pieces.length)]).join("");
    try {
      const r = parseDotenv(text, { A: "env" });
      for (const v of Object.values(r)) assert.equal(typeof v, "string");
    } catch (e) {
      assert.ok(e instanceof LombokConfigError, String(e));
      assert.equal(e.code, "invalid_dotenv");
      assert.ok(typeof e.line === "number" && e.line >= 1);
    }
  }
});
