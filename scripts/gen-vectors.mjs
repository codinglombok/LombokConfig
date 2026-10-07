// Generates vectors/lombokconfig-vectors-v1.json.
// Group "golden": expectations are WRITTEN BY HAND (and checked against the TypeScript port at
// generation time; a disagreement aborts generation so that either the code or the expectation is
// fixed deliberately).
// Group "generated-regression": seeded pseudo-random dotenv texts and environments whose
// expectations come from the TypeScript port and are cross-checked by the independent Rust port.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import * as lib from "../typescript/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FNS = ["parseDotenv", "resolve", "validateSchema", "explain", "merge", "get"];

function run(fn, args) {
  try {
    return { result: JSON.parse(JSON.stringify(lib[fn](...args))) };
  } catch (err) {
    if (!(err instanceof lib.LombokConfigError)) throw err;
    const e = { error: err.code };
    if (err.path !== undefined) e.path = err.path;
    if (err.line !== undefined) e.line = err.line;
    return e;
  }
}

const golden = [];
function g(name, fn, args, expect) {
  if (!FNS.includes(fn)) throw new Error(fn);
  const got = run(fn, args);
  if (!isDeepStrictEqual(got, expect)) {
    throw new Error(`golden mismatch in "${name}"\n  expected ${JSON.stringify(expect)}\n  got      ${JSON.stringify(got)}`);
  }
  golden.push({ name, fn, args, expect });
}
const ok = (result) => ({ result });
const err = (error, where = {}) => ({ error, ...where });

// ---------------------------------------------------------------- dotenv
const D = (name, text, result, env) => g(`dotenv ${name}`, "parseDotenv", env === undefined ? [text] : [text, env], ok(result));
const DE = (name, text, line, env) => g(`dotenv ${name}`, "parseDotenv", env === undefined ? [text] : [text, env], err("invalid_dotenv", { line }));
D("empty", "", {});
D("simple", "A=1\nB=two", { A: "1", B: "two" });
D("CRLF", "A=1\r\nB=2\r\n", { A: "1", B: "2" });
D("CR only", "A=1\rB=2", { A: "1", B: "2" });
D("BOM stripped", "\ufeffA=1", { A: "1" });
D("blank lines and comments", "\n# comment\n  \nA=1 # trailing\n#B=2\n", { A: "1" });
D("spaces around equals", "A = 1\nB\t=\t2", { A: "1", B: "2" });
D("leading indentation", "   A=1", { A: "1" });
D("export prefix", "export A=1\nexport\tB=2", { A: "1", B: "2" });
D("export as key", "export=1", { export: "1" });
D("exported key name", "exportA=1", { exportA: "1" });
D("empty value", "A=\nB=", { A: "", B: "" });
D("empty value with comment", "A= # nothing", { A: "" });
D("hash without space is value", "A=a#b\nB=#x", { A: "a#b", B: "" });
D("hash at value start after equals", "A=#x", { A: "" });
D("trailing spaces trimmed", "A=a b  \t", { A: "a b" });
D("inner spaces kept", "A=a   b", { A: "a   b" });
D("equals in value", "A=x=y=z", { A: "x=y=z" });
D("later duplicate wins", "A=1\nB=2\nA=3", { A: "3", B: "2" });
D("double quoted", 'A="hello world"', { A: "hello world" });
D("double quoted escapes", 'A="l1\\nl2\\tt\\r\\\\\\"q\\$"', { A: 'l1\nl2\tt\r\\"q$' });
D("double quoted unknown escape kept", 'A="\\x\\a"', { A: "\\x\\a" });
D("double quoted hash kept", 'A="a # b" # c', { A: "a # b" });
D("double quoted multiline", 'A="l1\nl2"\nB=2', { A: "l1\nl2", B: "2" });
D("double quoted CRLF inside", 'A="l1\r\nl2"', { A: "l1\r\nl2" });
D("single quoted literal", "A='a\\n ${B} \"x\"'", { A: 'a\\n ${B} "x"' });
D("single quoted multiline", "A='l1\nl2'", { A: "l1\nl2" });
D("quote inside unquoted kept", "A=it's \"ok\"", { A: "it's \"ok\"" });
D("empty quotes", "A=\"\"\nB=''", { A: "", B: "" });
D("expand earlier key", "A=1\nB=${A}2", { A: "1", B: "12" });
D("expand in double quotes", 'A=x\nB="<${A}>"', { A: "x", B: "<x>" });
D("expand escaped dollar", 'A=x\nB="\\${A}"', { A: "x", B: "${A}" });
D("expand unknown is empty", "B=[${NOPE}]", { B: "[]" });
D("expand default when unset", "B=${NOPE:-dflt}", { B: "dflt" });
D("expand default when empty", "A=\nB=${A:-dflt}", { A: "", B: "dflt" });
D("expand default not used when set", "A=v\nB=${A:-dflt}", { A: "v", B: "v" });
D("expand default literal", "B=${N:-a:-b ${x}", { B: "a:-b ${x" });
D("expand from env", "B=${HOME}/x", { B: "/home/u/x" }, { HOME: "/home/u" });
D("file wins over env", "HOME=/f\nB=${HOME}", { HOME: "/f", B: "/f" }, { HOME: "/e" });
D("later key not visible earlier", "B=${A}\nA=1", { B: "", A: "1" });
D("self reference uses previous", "P=a\nP=${P}:b", { P: "a:b" });
D("dollar alone kept", "A=$5 and $ and $A", { A: "$5 and $ and $A" });
D("expanded value not re-expanded", "A='${B}'\nB=x\nC=${A}", { A: "${B}", B: "x", C: "${B}" });
D("unicode value", "A=caf\u00e9 \u{1F600}", { A: "caf\u00e9 \u{1F600}" });
D("underscore key", "_A_1=x", { _A_1: "x" });
D("proto key is data", "__proto__=x", { ["__proto__"]: "x" });
DE("missing equals", "A 1", 1);
DE("missing equals on line 3", "A=1\n\nB", 3);
DE("key starts with digit", "1A=x", 1);
DE("key with dash", "A-B=1", 1);
DE("key with dot", "a.b=1", 1);
DE("only equals", "=1", 1);
DE("unterminated double quote", 'A=1\nB="abc', 2);
DE("unterminated single quote", "A='abc\nB=1", 1);
DE("text after quote", 'A="x" y', 1);
DE("unterminated expansion", "A=${B", 1);
DE("unterminated expansion in quotes", 'A="${B"', 1);
DE("invalid expansion name", "A=${B-C}", 1);
DE("empty expansion name", "A=${}", 1);
DE("line counted through multiline value", 'A="1\n2\n3"\nB', 4);
g("dotenv non-string text", "parseDotenv", [1], err("invalid_input"));
g("dotenv env not object", "parseDotenv", ["A=1", []], err("invalid_input"));
g("dotenv env non-string value", "parseDotenv", ["A=1", { X: 1 }], err("invalid_input"));

// ---------------------------------------------------------------- resolve
const S = {
  app: { name: { type: "string", env: "APP_NAME", default: "demo" }, debug: { type: "bool", env: "APP_DEBUG", default: false } },
  db: { host: { type: "string", env: "DB_HOST" }, port: { type: "int", env: "DB_PORT", default: 5432, min: 1, max: 65535 } },
};
const R = (name, schema, env, result) => g(`resolve ${name}`, "resolve", [schema, env], ok(result));
const RE = (name, schema, env, code, path) => g(`resolve ${name}`, "resolve", [schema, env], err(code, path === undefined ? {} : { path }));
R("defaults and env", S, { DB_HOST: "db.example.com" }, { app: { name: "demo", debug: false }, db: { host: "db.example.com", port: 5432 } });
R("env overrides default", S, { DB_HOST: "h", DB_PORT: "6543", APP_DEBUG: "yes", APP_NAME: "x" }, { app: { name: "x", debug: true }, db: { host: "h", port: 6543 } });
RE("missing required", S, {}, "missing_value", "db.host");
R("empty schema", {}, {}, {});
R("empty group", { a: {} }, {}, { a: {} });
R("env absent arg", { a: { type: "string", default: "x" } }, null, { a: "x" });
R("leaf without env uses default", { a: { type: "int", default: 3 } }, { a: "9" }, { a: 3 });
R("optional without default is null", { a: { type: "string", env: "A", required: false } }, {}, { a: null });
R("required false still uses env", { a: { type: "string", env: "A", required: false } }, { A: "v" }, { a: "v" });
R("empty string is a value", { a: { type: "string", env: "A", default: "d" } }, { A: "" }, { a: "" });
for (const [raw, v] of [["0", 0], ["42", 42], ["-7", -7], ["+5", 5], ["007", 7], ["-0", 0], ["9007199254740991", 9007199254740991], ["-9007199254740991", -9007199254740991]]) {
  R(`int ${JSON.stringify(raw)}`, { n: { type: "int", env: "N" } }, { N: raw }, { n: v });
}
for (const raw of ["", " 1", "1 ", "1.0", "1e3", "0x10", "abc", "9007199254740992", "--1", "+"]) {
  RE(`int rejects ${JSON.stringify(raw)}`, { n: { type: "int", env: "N" } }, { N: raw }, "invalid_value", "n");
}
for (const [raw, v] of [["1.5", 1.5], ["-0.25", -0.25], ["3", 3], [".5", 0.5], ["5.", 5], ["1e3", 1000], ["2.5E-3", 0.0025], ["+1.25", 1.25], ["-0.0", 0], ["1e21", 1e21]]) {
  R(`float ${JSON.stringify(raw)}`, { f: { type: "float", env: "F" } }, { F: raw }, { f: v });
}
for (const raw of ["", "1,5", "NaN", "Infinity", "inf", "1e400", "0x1", ".", "1e", " 2"]) {
  RE(`float rejects ${JSON.stringify(raw)}`, { f: { type: "float", env: "F" } }, { F: raw }, "invalid_value", "f");
}
for (const [raw, v] of [["true", true], ["TRUE", true], ["1", true], ["yes", true], ["On", true], ["false", false], ["0", false], ["no", false], ["OFF", false]]) {
  R(`bool ${JSON.stringify(raw)}`, { b: { type: "bool", env: "B" } }, { B: raw }, { b: v });
}
for (const raw of ["", "y", "n", "2", "enabled", " true"]) RE(`bool rejects ${JSON.stringify(raw)}`, { b: { type: "bool", env: "B" } }, { B: raw }, "invalid_value", "b");
R("list split and trim", { l: { type: "list", env: "L" } }, { L: " a, b ,c\t" }, { l: ["a", "b", "c"] });
R("list drops empty items", { l: { type: "list", env: "L" } }, { L: "a,,b," }, { l: ["a", "b"] });
R("list empty string", { l: { type: "list", env: "L" } }, { L: "" }, { l: [] });
R("list default", { l: { type: "list", env: "L", default: ["x"] } }, {}, { l: ["x"] });
R("json object", { j: { type: "json", env: "J" } }, { J: '{"a":[1,true,null]}' }, { j: { a: [1, true, null] } });
R("json scalar", { j: { type: "json", env: "J" } }, { J: ' "s" ' }, { j: "s" });
R("json default any", { j: { type: "json", default: { k: [1] } } }, {}, { j: { k: [1] } });
RE("json invalid", { j: { type: "json", env: "J" } }, { J: "{a:1}" }, "invalid_value", "j");
RE("json trailing", { j: { type: "json", env: "J" } }, { J: "[1] x" }, "invalid_value", "j");
RE("json non-finite", { j: { type: "json", env: "J" } }, { J: "[1e400]" }, "invalid_value", "j");
RE("json lone surrogate", { j: { type: "json", env: "J" } }, { J: '"\\ud800"' }, "invalid_value", "j");
R("enum ok", { e: { type: "enum", env: "E", values: ["dev", "prod"] } }, { E: "prod" }, { e: "prod" });
RE("enum case-sensitive", { e: { type: "enum", env: "E", values: ["dev", "prod"] } }, { E: "PROD" }, "invalid_value", "e");
R("enum default", { e: { type: "enum", values: ["a"], default: "a" } }, {}, { e: "a" });
RE("min violated by env", S, { DB_HOST: "h", DB_PORT: "0" }, "out_of_range", "db.port");
RE("max violated by env", S, { DB_HOST: "h", DB_PORT: "65536" }, "out_of_range", "db.port");
R("min and max inclusive", { p: { type: "int", env: "P", min: 1, max: 2 } }, { P: "2" }, { p: 2 });
R("min inclusive", { p: { type: "int", env: "P", min: 1, max: 2 } }, { P: "1" }, { p: 1 });
R("float min inclusive", { f: { type: "float", env: "F", min: 0.5 } }, { F: "0.5" }, { f: 0.5 });
RE("min violated by default", { p: { type: "int", default: 0, min: 1 } }, {}, "out_of_range", "p");
R("float bounds", { f: { type: "float", env: "F", min: 0, max: 1 } }, { F: "0.75" }, { f: 0.75 });
RE("float bounds violated", { f: { type: "float", env: "F", min: 0, max: 1 } }, { F: "1.5" }, "out_of_range", "f");
RE("first error in schema order", { a: { type: "int", env: "A" }, b: { type: "int", env: "B" } }, { A: "x" }, "invalid_value", "a");
RE("first error nested order", { z: { y: { type: "string", env: "Y" } }, a: { type: "string", env: "A" } }, {}, "missing_value", "z.y");
R("alphanumeric key", { a1: { type: "string", default: "x" } }, {}, { a1: "x" });
R("secret does not change resolve", { k: { type: "string", env: "K", secret: true } }, { K: "s3" }, { k: "s3" });
R("description allowed", { k: { type: "string", default: "x", description: "doc" } }, {}, { k: "x" });
R("group may contain key named type", { type: { kind: { type: "string", default: "x" } } }, {}, { type: { kind: "x" } });
RE("schema checked before env", { a: { type: "nope" } }, [], "invalid_schema", "a");
RE("env must be object", { a: { type: "string", default: "x" } }, [], "invalid_input");
RE("env values strings", { a: { type: "string", default: "x" } }, { A: 1 }, "invalid_input");
// schema errors
const SE = (name, schema, path) => g(`schema ${name}`, "validateSchema", [schema], err("invalid_schema", path === undefined ? {} : { path }));
g("schema valid", "validateSchema", [S], ok(true));
SE("not object", [], "");
SE("node not object", { a: 1 }, "a");
SE("node array", { a: [] }, "a");
SE("invalid key", { "a-b": { type: "string" } }, "a-b");
SE("key with dot", { "a.b": { type: "string" } }, "a.b");
SE("unknown type", { a: { type: "integer" } }, "a");
SE("unknown leaf key", { a: { type: "string", defualt: "x" } }, "a");
SE("env not name", { a: { type: "string", env: "A-B" } }, "a");
SE("env not string", { a: { type: "string", env: 1 } }, "a");
SE("required not bool", { a: { type: "string", required: "no" } }, "a");
SE("secret not bool", { a: { type: "string", secret: 1 } }, "a");
SE("description not string", { a: { type: "string", description: 1 } }, "a");
SE("enum without values", { a: { type: "enum" } }, "a");
SE("enum empty values", { a: { type: "enum", values: [] } }, "a");
SE("enum non-string values", { a: { type: "enum", values: [1] } }, "a");
SE("values on non-enum", { a: { type: "string", values: ["x"] } }, "a");
SE("min on string", { a: { type: "string", min: 1 } }, "a");
SE("min not number", { a: { type: "int", min: "1" } }, "a");
SE("min greater than max", { a: { type: "int", min: 2, max: 1 } }, "a");
SE("default wrong type string", { a: { type: "string", default: 1 } }, "a");
SE("default wrong type int fraction", { a: { type: "int", default: 1.5 } }, "a");
SE("default wrong type int unsafe", { a: { type: "int", default: 9007199254740992 } }, "a");
SE("default wrong type float", { a: { type: "float", default: "1" } }, "a");
SE("default wrong type bool", { a: { type: "bool", default: "true" } }, "a");
SE("default wrong type list", { a: { type: "list", default: [1] } }, "a");
SE("default not in enum", { a: { type: "enum", values: ["x"], default: "y" } }, "a");
SE("nested error path", { a: { b: { c: { type: "x" } } } }, "a.b.c");
SE("schema error found even after valid fields", { a: { type: "string", env: "A" }, b: { type: "bad" } }, "b");
SE("type not string makes a group", { a: { type: 1 } }, "a.type");
let deep = { type: "string", default: "x" };
for (let i = 0; i < 70; i++) deep = { n: deep };
g("schema too deep", "validateSchema", [deep], err("too_deep", { path: Array(65).fill("n").join(".") }));

// ---------------------------------------------------------------- explain
g("explain mixed", "explain", [
  { db: { host: { type: "string", env: "DB_HOST" }, port: { type: "int", env: "DB_PORT", default: 5432 }, pass: { type: "string", env: "DB_PASS", secret: true }, opt: { type: "string", required: false } } },
  { DB_PORT: "x", DB_PASS: "hunter2" },
], ok([
  { path: "db.host", type: "string", env: "DB_HOST", source: "none", value: null, error: "missing_value" },
  { path: "db.port", type: "int", env: "DB_PORT", source: "env", value: null, error: "invalid_value" },
  { path: "db.pass", type: "string", env: "DB_PASS", source: "env", value: "[secret]", error: null },
  { path: "db.opt", type: "string", env: null, source: "none", value: null, error: null },
]));
g("explain default source", "explain", [{ a: { type: "bool", env: "A", default: true } }, {}], ok([{ path: "a", type: "bool", env: "A", source: "default", value: true, error: null }]));
g("explain secret default masked", "explain", [{ a: { type: "string", default: "d", secret: true } }], ok([{ path: "a", type: "string", env: null, source: "default", value: "[secret]", error: null }]));
g("explain schema error throws", "explain", [{ a: { type: "x" } }, {}], err("invalid_schema", { path: "a" }));
g("explain empty", "explain", [{}, {}], ok([]));

// ---------------------------------------------------------------- merge
const M = (name, a, b, r) => g(`merge ${name}`, "merge", [a, b], ok(r));
M("disjoint", { a: 1 }, { b: 2 }, { a: 1, b: 2 });
M("override scalar", { a: 1 }, { a: 2 }, { a: 2 });
M("deep", { db: { host: "a", port: 1 } }, { db: { port: 2 } }, { db: { host: "a", port: 2 } });
M("arrays replace", { l: [1, 2] }, { l: [3] }, { l: [3] });
M("null replaces", { a: { b: 1 } }, { a: null }, { a: null });
M("object replaces scalar", { a: 1 }, { a: { b: 1 } }, { a: { b: 1 } });
M("scalar replaces object", { a: { b: 1 } }, { a: "x" }, { a: "x" });
M("key order base first", { b: 1, a: 1 }, { c: 1, a: 2 }, { b: 1, a: 2, c: 1 });
M("empty override", { a: 1 }, {}, { a: 1 });
M("empty base", {}, { a: { b: 1 } }, { a: { b: 1 } });
M("three levels", { a: { b: { c: 1, d: 1 } } }, { a: { b: { d: 2 } } }, { a: { b: { c: 1, d: 2 } } });
M("proto key is data", { a: 1 }, JSON.parse('{"__proto__":{"x":1}}'), JSON.parse('{"a":1,"__proto__":{"x":1}}'));
g("merge base not object", "merge", [[], {}], err("invalid_input"));
g("merge override not object", "merge", [{}, null], err("invalid_input"));
let d1 = {}, d2 = {};
for (let i = 0; i < 70; i++) { d1 = { n: d1 }; d2 = { n: d2 }; }
g("merge too deep", "merge", [d1, d2], err("too_deep"));

// ---------------------------------------------------------------- get
const C = { db: { host: "h", ports: [10, 20], opts: { ssl: false, n: null } }, "a.b": 1 };
const G = (name, args, r) => g(`get ${name}`, "get", args, ok(r));
G("top", [C, "db"], C.db);
G("nested", [C, "db.host"], "h");
G("array index", [C, "db.ports.1"], 20);
G("false value", [C, "db.opts.ssl"], false);
G("null value", [C, "db.opts.n"], null);
G("fallback used", [C, "db.user", "root"], "root");
G("fallback null", [C, "x.y", null], null);
G("fallback not used when present", [C, "db.host", "z"], "h");
g("get missing", "get", [C, "db.user"], err("missing_value", { path: "db.user" }));
g("get index out of range", "get", [C, "db.ports.2"], err("missing_value", { path: "db.ports.2" }));
g("get non-canonical index", "get", [C, "db.ports.01"], err("missing_value", { path: "db.ports.01" }));
g("get through scalar", "get", [C, "db.host.x"], err("missing_value", { path: "db.host.x" }));
g("get dotted key unreachable", "get", [C, "a.b"], err("missing_value", { path: "a.b" }));
g("get empty path", "get", [C, ""], err("invalid_path"));
g("get empty segment", "get", [C, "db..host"], err("invalid_path", { path: "db..host" }));
g("get trailing dot", "get", [C, "db."], err("invalid_path", { path: "db." }));
g("get path not string", "get", [C, 1], err("invalid_path"));
G("get on array root", [[{ a: 1 }], "0.a"], 1);

// ---------------------------------------------------------------- generated regression
let seed = 0x5eed1234;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const PIECES = ["A", "B_2", "export ", "=", " ", "\t", "#", "x", "${A}", "${B_2:-d}", "${Z}", '"', "'", "\\n", "\\", "$", "\n", "\r\n", "1", "caf\u00e9", "{", "}"];
const generated = [];
for (let i = 0; i < 120; i++) {
  let lines = [];
  const n = 1 + Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) {
    if (rnd() < 0.7) lines.push(`${pick(["A", "B_2", "C", "export D", " E"])}${pick(["=", " = ", "="])}${Array.from({ length: Math.floor(rnd() * 5) }, () => pick(PIECES)).join("")}`);
    else lines.push(Array.from({ length: Math.floor(rnd() * 6) }, () => pick(PIECES)).join(""));
  }
  const text = lines.join(pick(["\n", "\r\n"]));
  const args = rnd() < 0.5 ? [text] : [text, { Z: "zz", A: "env-a" }];
  generated.push({ name: `generated ${String(i + 1).padStart(3, "0")} dotenv`, fn: "parseDotenv", args, expect: run("parseDotenv", args) });
}

const doc = {
  format: "lombokconfig-vectors-v1",
  specVersion: "0.1.0",
  note: "Normative cross-language vectors. Each case calls `fn` with `args`; `expect` is {result} or {error: code, path?, line?}.",
  groups: [
    { name: "golden", cases: golden },
    { name: "generated-regression", cases: generated },
  ],
};
// ASCII-only file: non-ASCII characters are written as JSON \u escapes (UTF-16 code units).
const ascii = JSON.stringify(doc, null, 1).replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
writeFileSync(join(root, "vectors", "lombokconfig-vectors-v1.json"), ascii + "\n");
const sha = createHash("sha256").update(readFileSync(join(root, "vectors", "lombokconfig-vectors-v1.json"))).digest("hex");
console.log(`golden=${golden.length} generated=${generated.length} total=${golden.length + generated.length} sha256=${sha}`);
