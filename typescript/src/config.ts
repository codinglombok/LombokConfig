// LombokConfig core (TypeScript port). Normative behaviour: docs/SPEC_LombokConfig_v0.1.0.md.
// Every function is pure: the environment is passed in, nothing is read from the process.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };
export type Env = { [name: string]: string };

export type ErrorCode =
  | "invalid_dotenv"
  | "invalid_schema"
  | "invalid_value"
  | "missing_value"
  | "out_of_range"
  | "invalid_input"
  | "invalid_path"
  | "too_deep";

export class LombokConfigError extends Error {
  readonly code: ErrorCode;
  readonly messageId: string;
  /** Dotted schema or config path, when the error belongs to one. */
  readonly path?: string;
  /** 1-based line of the dotenv entry, for `invalid_dotenv`. */
  readonly line?: number;
  constructor(code: ErrorCode, message: string, where: { path?: string; line?: number } = {}) {
    super(message);
    this.name = "LombokConfigError";
    this.code = code;
    this.messageId = `lombokconfig.error.${code}`;
    if (where.path !== undefined) this.path = where.path;
    if (where.line !== undefined) this.line = where.line;
  }
}

const fail = (code: ErrorCode, message: string, where: { path?: string; line?: number } = {}): never => {
  throw new LombokConfigError(code, message, where);
};

const isObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);
const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
/** Own-property assignment that is safe for keys such as `__proto__`. */
const put = <T>(o: { [k: string]: T }, k: string, v: T): void => {
  Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true });
};
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_DEPTH = 64;

function checkEnv(env: unknown): Env {
  if (env === undefined || env === null) return {};
  if (!isObject(env)) return fail("invalid_input", "env must be an object of strings");
  for (const k of Object.keys(env)) if (typeof env[k] !== "string") fail("invalid_input", "env values must be strings");
  return env as Env;
}

// ---------------------------------------------------------------- dotenv

/**
 * Parse dotenv text into an object of strings. `${NAME}` and `${NAME:-default}` refer to keys
 * defined earlier in the same text, then to `env`.
 */
export function parseDotenv(text: unknown, env?: unknown): Env {
  if (typeof text !== "string") return fail("invalid_input", "text must be a string");
  const outer = checkEnv(env);
  const cps = Array.from(text.startsWith("\ufeff") ? text.slice(1) : text);
  const out: Env = {};
  let i = 0;
  let line = 1;
  const n = cps.length;
  const at = (k: number): string => (k < n ? (cps[k] as string) : "");
  const isNl = (c: string): boolean => c === "\n" || c === "\r";
  const skipBlank = (): void => {
    while (at(i) === " " || at(i) === "\t") i++;
  };
  const eatNewline = (): void => {
    if (at(i) === "\r" && at(i + 1) === "\n") i += 2;
    else i++;
    line++;
  };
  const lookup = (name: string): string | undefined => (has(out, name) ? out[name] : has(outer, name) ? outer[name] : undefined);

  // Expand `${...}` starting at cps[k] === "$" && cps[k+1] === "{"; returns [text, next index].
  const expand = (k: number, end: number, entryLine: number): [string, number] => {
    let j = k + 2;
    while (j < end && at(j) !== "}") j++;
    if (j >= end) return fail("invalid_dotenv", "unterminated ${", { line: entryLine });
    const body = cps.slice(k + 2, j).join("");
    const sep = body.indexOf(":-");
    const name = sep >= 0 ? body.slice(0, sep) : body;
    if (!NAME.test(name)) return fail("invalid_dotenv", "invalid variable name in ${...}", { line: entryLine });
    const v = lookup(name);
    if (sep >= 0) return [v === undefined || v === "" ? body.slice(sep + 2) : v, j + 1];
    return [v ?? "", j + 1];
  };

  while (i < n) {
    skipBlank();
    if (i >= n) break;
    const c = at(i);
    if (isNl(c)) {
      eatNewline();
      continue;
    }
    if (c === "#") {
      while (i < n && !isNl(at(i))) i++;
      continue;
    }
    const entryLine = line;
    if (cps.slice(i, i + 6).join("") === "export" && (at(i + 6) === " " || at(i + 6) === "\t")) {
      i += 6;
      skipBlank();
    }
    const ks = i;
    while (i < n && /[A-Za-z0-9_]/.test(at(i))) i++;
    const key = cps.slice(ks, i).join("");
    if (!NAME.test(key)) return fail("invalid_dotenv", "expected a variable name", { line: entryLine });
    skipBlank();
    if (at(i) !== "=") return fail("invalid_dotenv", "expected '='", { line: entryLine });
    i++;
    skipBlank();
    let value = "";
    const q = at(i);
    if (q === '"' || q === "'") {
      i++;
      let closed = false;
      while (i < n) {
        const ch = at(i);
        if (ch === q) {
          closed = true;
          i++;
          break;
        }
        if (q === '"' && ch === "\\" && i + 1 < n) {
          const e = at(i + 1);
          const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', $: "$" };
          if (has(map, e)) value += map[e];
          else value += "\\" + e;
          if (isNl(e)) {
            // a backslash before a line break keeps both; count the line
            if (e === "\r" && at(i + 2) === "\n") {
              value += "\n";
              i++;
            }
            line++;
          }
          i += 2;
          continue;
        }
        if (q === '"' && ch === "$" && at(i + 1) === "{") {
          const [t, next] = expand(i, n, entryLine);
          value += t;
          i = next;
          continue;
        }
        if (ch === "\r" && at(i + 1) === "\n") {
          value += "\r\n";
          i += 2;
          line++;
          continue;
        }
        if (isNl(ch)) line++;
        value += ch;
        i++;
      }
      if (!closed) return fail("invalid_dotenv", "unterminated quoted value", { line: entryLine });
      skipBlank();
      if (i < n && !isNl(at(i)) && at(i) !== "#") return fail("invalid_dotenv", "unexpected text after quoted value", { line: entryLine });
      while (i < n && !isNl(at(i))) i++;
    } else {
      const vs = i;
      while (i < n && !isNl(at(i))) i++;
      let ve = i;
      for (let k = vs; k < i; k++) {
        if (at(k) === "#" && (k === vs || at(k - 1) === " " || at(k - 1) === "\t")) {
          ve = k;
          break;
        }
      }
      while (ve > vs && (at(ve - 1) === " " || at(ve - 1) === "\t")) ve--;
      let k = vs;
      while (k < ve) {
        if (at(k) === "$" && at(k + 1) === "{") {
          const [t, next] = expand(k, ve, entryLine);
          value += t;
          k = next;
        } else {
          value += at(k);
          k++;
        }
      }
    }
    put(out, key, value);
  }
  return out;
}

// ---------------------------------------------------------------- schema resolution

export const TYPES = ["string", "int", "float", "bool", "list", "json", "enum"] as const;
export type FieldType = (typeof TYPES)[number];
const LEAF_KEYS = ["type", "env", "default", "required", "values", "min", "max", "description", "secret"];
const MAX_SAFE = 9007199254740991;

interface Leaf {
  type: FieldType;
  env?: string;
  hasDefault: boolean;
  def: Json;
  required: boolean;
  values?: string[];
  min?: number;
  max?: number;
  secret: boolean;
}

const isLeaf = (node: JsonObject): boolean => typeof node["type"] === "string";

function leafOf(node: JsonObject, path: string): Leaf {
  for (const k of Object.keys(node)) if (!LEAF_KEYS.includes(k)) fail("invalid_schema", `unknown field key: ${k}`, { path });
  const type = node["type"] as string;
  if (!(TYPES as readonly string[]).includes(type)) fail("invalid_schema", `unknown type: ${type}`, { path });
  const leaf: Leaf = { type: type as FieldType, hasDefault: has(node, "default"), def: node["default"] ?? null, required: true, secret: false };
  if (has(node, "env")) {
    const e = node["env"];
    if (typeof e !== "string" || !NAME.test(e)) fail("invalid_schema", "env must be a variable name", { path });
    leaf.env = e as string;
  }
  if (has(node, "required")) {
    if (typeof node["required"] !== "boolean") fail("invalid_schema", "required must be a boolean", { path });
    leaf.required = node["required"] as boolean;
  }
  if (has(node, "secret")) {
    if (typeof node["secret"] !== "boolean") fail("invalid_schema", "secret must be a boolean", { path });
    leaf.secret = node["secret"] as boolean;
  }
  if (has(node, "description") && typeof node["description"] !== "string") fail("invalid_schema", "description must be a string", { path });
  if (type === "enum") {
    const vs = node["values"];
    if (!Array.isArray(vs) || vs.length === 0 || vs.some((v) => typeof v !== "string")) fail("invalid_schema", "enum needs a non-empty values array of strings", { path });
    leaf.values = vs as string[];
  } else if (has(node, "values")) fail("invalid_schema", "values is only allowed for enum", { path });
  for (const b of ["min", "max"] as const) {
    if (!has(node, b)) continue;
    if (type !== "int" && type !== "float") fail("invalid_schema", `${b} is only allowed for int and float`, { path });
    const v = node[b];
    if (typeof v !== "number") fail("invalid_schema", `${b} must be a number`, { path });
    leaf[b] = v as number;
  }
  if (leaf.min !== undefined && leaf.max !== undefined && leaf.min > leaf.max) fail("invalid_schema", "min is greater than max", { path });
  if (leaf.hasDefault) checkDefault(leaf, path);
  return leaf;
}

function checkDefault(leaf: Leaf, path: string): void {
  const d = leaf.def;
  const bad = (): never => fail("invalid_schema", `default does not match type ${leaf.type}`, { path });
  switch (leaf.type) {
    case "string": if (typeof d !== "string") bad(); break;
    case "int": if (typeof d !== "number" || !Number.isInteger(d) || Math.abs(d) > MAX_SAFE) bad(); break;
    case "float": if (typeof d !== "number") bad(); break;
    case "bool": if (typeof d !== "boolean") bad(); break;
    case "list": if (!Array.isArray(d) || d.some((x) => typeof x !== "string")) bad(); break;
    case "enum": if (typeof d !== "string" || !leaf.values!.includes(d)) bad(); break;
    case "json": break;
  }
}

const INT = /^[+-]?[0-9]+$/;
const FLOAT = /^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$/;
const TRUE = ["true", "1", "yes", "on"];
const FALSE = ["false", "0", "no", "off"];
const asciiLower = (s: string): string => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
const noNegZero = (x: number): number => (x === 0 ? 0 : x);

/** Strict conversion of one environment string to a field type. */
function cast(leaf: Leaf, raw: string, path: string): Json {
  const bad = (): never => fail("invalid_value", `value is not a valid ${leaf.type}`, { path });
  switch (leaf.type) {
    case "string":
      return raw;
    case "int": {
      if (!INT.test(raw)) return bad();
      const v = Number(raw);
      if (!Number.isSafeInteger(v)) return bad();
      return noNegZero(v);
    }
    case "float": {
      if (!FLOAT.test(raw)) return bad();
      const v = Number(raw);
      if (!Number.isFinite(v)) return bad();
      return noNegZero(v);
    }
    case "bool": {
      const l = asciiLower(raw);
      if (TRUE.includes(l)) return true;
      if (FALSE.includes(l)) return false;
      return bad();
    }
    case "list":
      return raw.split(",").map((s) => s.replace(/^[ \t]+|[ \t]+$/g, "")).filter((s) => s !== "");
    case "json": {
      let v: Json;
      try {
        v = JSON.parse(raw) as Json;
      } catch {
        return bad();
      }
      return wellFormed(v, 0) ? v : bad();
    }
    case "enum":
      return leaf.values!.includes(raw) ? raw : bad();
  }
}

const LONE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

/** JSON values every port can represent: finite numbers, no lone surrogates, depth <= 512. */
function wellFormed(v: Json, depth: number): boolean {
  if (depth > 512) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return !LONE.test(v);
  if (Array.isArray(v)) return v.every((x) => wellFormed(x, depth + 1));
  if (isObject(v)) return Object.keys(v).every((k) => !LONE.test(k) && wellFormed(v[k] as Json, depth + 1));
  return true;
}

function checkRange(leaf: Leaf, v: Json, path: string): void {
  if (typeof v !== "number") return;
  if ((leaf.min !== undefined && v < leaf.min) || (leaf.max !== undefined && v > leaf.max)) fail("out_of_range", "value is outside min..max", { path });
}

type Source = "env" | "default" | "none";

function resolveLeaf(leaf: Leaf, env: Env, path: string): { value: Json; source: Source } {
  if (leaf.env !== undefined && has(env, leaf.env)) {
    const v = cast(leaf, env[leaf.env] as string, path);
    checkRange(leaf, v, path);
    return { value: v, source: "env" };
  }
  if (leaf.hasDefault) {
    checkRange(leaf, leaf.def, path);
    return { value: JSON.parse(JSON.stringify(leaf.def)) as Json, source: "default" };
  }
  if (leaf.required) fail("missing_value", "no environment value and no default", { path });
  return { value: null, source: "none" };
}

function walk(schema: unknown, path: string, depth: number, visit: (leaf: Leaf, path: string) => Json): JsonObject {
  if (depth > MAX_DEPTH) return fail("too_deep", "schema nested too deeply", { path });
  if (!isObject(schema)) return fail("invalid_schema", "schema node must be an object", { path });
  const out: JsonObject = {};
  for (const k of Object.keys(schema)) {
    const p = path === "" ? k : `${path}.${k}`;
    if (!NAME.test(k)) fail("invalid_schema", `invalid key: ${k}`, { path: p });
    const node = schema[k];
    if (!isObject(node)) fail("invalid_schema", "schema node must be an object", { path: p });
    put(out, k, isLeaf(node as JsonObject) ? visit(leafOf(node as JsonObject, p), p) : walk(node, p, depth + 1, visit));
  }
  return out;
}

/** Validate the whole schema without resolving any value. */
export function validateSchema(schema: unknown): true {
  walk(schema, "", 0, () => null);
  return true;
}

/**
 * Resolve a schema against an environment into a typed config object. The schema is validated
 * completely first; then fields are resolved in schema order and the first failure is thrown.
 */
export function resolve(schema: unknown, env?: unknown): JsonObject {
  validateSchema(schema);
  const e = checkEnv(env);
  return walk(schema, "", 0, (leaf, p) => resolveLeaf(leaf, e, p).value);
}

export interface ExplainEntry {
  path: string;
  type: FieldType;
  env: string | null;
  source: Source;
  value: Json;
  error: ErrorCode | null;
}

/** One entry per field in schema order; secret values are shown as `[secret]`. Never throws for value errors. */
export function explain(schema: unknown, env?: unknown): ExplainEntry[] {
  validateSchema(schema);
  const e = checkEnv(env);
  const entries: ExplainEntry[] = [];
  walk(schema, "", 0, (leaf, p) => {
    const base = { path: p, type: leaf.type, env: leaf.env ?? null };
    try {
      const r = resolveLeaf(leaf, e, p);
      entries.push({ ...base, source: r.source, value: leaf.secret && r.value !== null ? "[secret]" : r.value, error: null });
    } catch (err) {
      if (!(err instanceof LombokConfigError)) throw err;
      const source: Source = leaf.env !== undefined && has(e, leaf.env) ? "env" : leaf.hasDefault ? "default" : "none";
      entries.push({ ...base, source, value: null, error: err.code });
    }
    return null;
  });
  return entries;
}

// ---------------------------------------------------------------- merge and get

function mergeInto(a: JsonObject, b: JsonObject, depth: number): JsonObject {
  if (depth > MAX_DEPTH) return fail("too_deep", "objects nested too deeply");
  const out: JsonObject = JSON.parse(JSON.stringify(a)) as JsonObject;
  for (const k of Object.keys(b)) {
    const av = has(out, k) ? out[k] : undefined;
    const bv = b[k] as Json;
    put(out, k, isObject(av) && isObject(bv) ? mergeInto(av, bv, depth + 1) : (JSON.parse(JSON.stringify(bv)) as Json));
  }
  return out;
}

/** Deep merge: objects merge key by key, everything else (arrays, scalars, null) in `override` replaces. */
export function merge(base: unknown, override: unknown): JsonObject {
  if (!isObject(base) || !isObject(override)) return fail("invalid_input", "merge takes two objects");
  return mergeInto(base, override, 0);
}

const INDEX = /^(0|[1-9][0-9]*)$/;

/** Value at a dotted path; array items by decimal index. Throws `missing_value` unless a fallback is given. */
export function get(config: unknown, path: unknown, ...fallback: unknown[]): Json {
  if (typeof path !== "string" || path === "") return fail("invalid_path", "path must be a non-empty string");
  const parts = path.split(".");
  if (parts.some((p) => p === "")) return fail("invalid_path", "path has an empty segment", { path });
  let cur: unknown = config;
  for (const p of parts) {
    if (isObject(cur) && has(cur, p)) cur = cur[p];
    else if (Array.isArray(cur) && INDEX.test(p) && Number(p) < cur.length) cur = cur[Number(p)];
    else {
      if (fallback.length > 0) return fallback[0] as Json;
      return fail("missing_value", "no value at path", { path });
    }
  }
  return cur as Json;
}
