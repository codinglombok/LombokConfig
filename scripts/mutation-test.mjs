// Mutation check for GP-11: inject a defect into the compiled TypeScript core and require the
// vector runner to fail. Usage (from repo root, after `npm test` built typescript/dist-test):
//   node scripts/mutation-test.mjs
import { cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = join(root, "typescript");
const tmp = join(ts, ".mut");
const TARGET = "config.js";
const MUTATIONS = [
  ['text.startsWith("\\ufeff")', "false", "BOM stripping"],
  ['(at(i + 6) === " " || at(i + 6) === "\\t")', "true", "export needs whitespace"],
  ['n: "\\n", r: "\\r", t: "\\t"', 'n: "n", r: "\\r", t: "\\t"', "newline escape"],
  ['$: "$"', '$: "\\\\$"', "escaped dollar"],
  ['if (at(k) === "#" && (k === vs || at(k - 1) === " " || at(k - 1) === "\\t"))', 'if (at(k) === "#")', "inline comment needs whitespace"],
  ["v === undefined || v === \"\" ? body.slice(sep + 2) : v", "v === undefined ? body.slice(sep + 2) : v", "default on empty"],
  ["(has(out, name) ? out[name] : has(outer, name) ? outer[name] : undefined)", "(has(outer, name) ? outer[name] : has(out, name) ? out[name] : undefined)", "file before env"],
  ["const INT = /^[+-]?[0-9]+$/;", "const INT = /^[+-]?[0-9]+(\\.0)?$/;", "strict int"],
  ["!Number.isSafeInteger(v)", "false", "safe integer range"],
  ['const TRUE = ["true", "1", "yes", "on"];', 'const TRUE = ["true", "1", "yes", "on", "y"];', "bool vocabulary"],
  ["const l = asciiLower(raw);", "const l = raw;", "bool case-insensitive"],
  ['.filter((s) => s !== "")', "", "list drops empty"],
  ["return wellFormed(v, 0) ? v : bad();", "return v;", "json well-formed"],
  ["(leaf.min !== undefined && v < leaf.min)", "(leaf.min !== undefined && v <= leaf.min)", "min inclusive"],
  ["if (leaf.required)", "if (false)", "required fields"],
  ["if (!LEAF_KEYS.includes(k))", "if (false)", "unknown leaf keys"],
  ["leaf.secret && r.value !== null ? \"[secret]\" : r.value", "r.value", "secret masking"],
  ["isObject(av) && isObject(bv) ? mergeInto(av, bv, depth + 1)", "false ? mergeInto(av, bv, depth + 1)", "deep merge"],
  ["const MAX_DEPTH = 64;", "const MAX_DEPTH = 100000;", "depth limit"],
  ["const INDEX = /^(0|[1-9][0-9]*)$/;", "const INDEX = /^[0-9]+$/;", "canonical array index"],
  ["if (fallback.length > 0)", "if (false)", "get fallback"],
  ["(x === 0 ? 0 : x)", "(x)", "negative zero"],
];

const src = readFileSync(join(ts, "dist-test", "src", TARGET), "utf8");
let survived = 0;
for (const [find, repl, label] of MUTATIONS) {
  const count = src.split(find).length - 1;
  if (count === 0) { console.log(`SKIP     ${label}: pattern not found`); survived++; continue; }
  rmSync(tmp, { recursive: true, force: true });
  cpSync(join(ts, "dist-test"), tmp, { recursive: true });
  writeFileSync(join(tmp, "src", TARGET), src.split(find).join(repl));
  const r = spawnSync(process.execPath, ["--test", join(tmp, "test", "vectors.test.js")], { encoding: "utf8" });
  const killed = r.status !== 0;
  if (!killed) survived++;
  console.log(`${killed ? "KILLED  " : "SURVIVED"} ${label}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${MUTATIONS.length - survived}/${MUTATIONS.length} mutants killed`);
process.exit(survived === 0 ? 0 : 1);
