//! LombokConfig core (Rust reference, `no_std + alloc`, zero dependencies).
//!
//! Dotenv parsing, schema-driven resolution with strict casts, deep merge and dotted-path
//! lookup. Results are identical to the other ports for every vector in
//! `vectors/lombokconfig-vectors-v1.json`; the normative contract is
//! `docs/SPEC_LombokConfig_v0.1.0.md`. Nothing here reads the process environment: callers pass it in.
#![cfg_attr(not(feature = "std"), no_std)]
#![forbid(unsafe_code)]

extern crate alloc;

pub mod json;

pub use json::{parse_json, Value};

use alloc::format;
use alloc::string::{String, ToString};
use alloc::vec::Vec;

const MAX_DEPTH: usize = 64;
const MAX_SAFE: f64 = 9007199254740991.0;

/// Error with a canonical `code` (contract), optional `path` or `line`, and an English message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error {
    pub code: &'static str,
    pub message: String,
    /// Dotted schema or config path, when the error belongs to one.
    pub path: Option<String>,
    /// 1-based line of the dotenv entry, for `invalid_dotenv`.
    pub line: Option<u32>,
}

impl Error {
    fn new(code: &'static str, message: &str) -> Self {
        Error {
            code,
            message: message.to_string(),
            path: None,
            line: None,
        }
    }
    fn at(code: &'static str, message: &str, path: &str) -> Self {
        let mut e = Error::new(code, message);
        e.path = Some(path.to_string());
        e
    }
    fn line(message: &str, line: u32) -> Self {
        let mut e = Error::new("invalid_dotenv", message);
        e.line = Some(line);
        e
    }
    /// Stable message id for translation through LombokLocale.
    pub fn message_id(&self) -> String {
        format!("lombokconfig.error.{}", self.code)
    }
}

#[cfg(feature = "std")]
impl std::error::Error for Error {}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)?;
        if let Some(p) = &self.path {
            write!(f, " (at {})", p)?;
        }
        if let Some(l) = self.line {
            write!(f, " (line {})", l)?;
        }
        Ok(())
    }
}

pub type Result<T> = core::result::Result<T, Error>;

fn is_name(s: &str) -> bool {
    let mut it = s.chars();
    match it.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }
    it.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn obj() -> Value {
    Value::Obj(Vec::new())
}

/// Validate an environment object (all values strings). `None` or `null` is an empty environment.
fn check_env(env: Option<&Value>) -> Result<Value> {
    match env {
        None | Some(Value::Null) => Ok(obj()),
        Some(v @ Value::Obj(m)) => {
            if m.iter().all(|(_, x)| matches!(x, Value::Str(_))) {
                Ok(v.clone())
            } else {
                Err(Error::new("invalid_input", "env values must be strings"))
            }
        }
        Some(_) => Err(Error::new(
            "invalid_input",
            "env must be an object of strings",
        )),
    }
}

// ---------------------------------------------------------------- dotenv

struct Dotenv<'a> {
    c: Vec<char>,
    i: usize,
    line: u32,
    out: Value,
    env: &'a Value,
}

impl Dotenv<'_> {
    fn at(&self, k: usize) -> char {
        self.c.get(k).copied().unwrap_or('\0')
    }
    fn more(&self, k: usize) -> bool {
        k < self.c.len()
    }
    fn is_nl(c: char) -> bool {
        c == '\n' || c == '\r'
    }
    fn skip_blank(&mut self) {
        while self.more(self.i) && (self.at(self.i) == ' ' || self.at(self.i) == '\t') {
            self.i += 1;
        }
    }
    fn lookup(&self, name: &str) -> Option<String> {
        self.out
            .get(name)
            .or_else(|| self.env.get(name))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }
    /// Expand `${...}` at `k` (`$` then `{`), searching for `}` before `end`.
    fn expand(&self, k: usize, end: usize, entry_line: u32) -> Result<(String, usize)> {
        let mut j = k + 2;
        while j < end && self.at(j) != '}' {
            j += 1;
        }
        if j >= end {
            return Err(Error::line("unterminated ${", entry_line));
        }
        let body: String = self.c[k + 2..j].iter().collect();
        let (name, default) = match body.find(":-") {
            Some(p) => (&body[..p], Some(&body[p + 2..])),
            None => (body.as_str(), None),
        };
        if !is_name(name) {
            return Err(Error::line("invalid variable name in ${...}", entry_line));
        }
        let v = self.lookup(name);
        let text = match default {
            Some(d) => match v {
                Some(x) if !x.is_empty() => x,
                _ => d.to_string(),
            },
            None => v.unwrap_or_default(),
        };
        Ok((text, j + 1))
    }

    fn parse(&mut self) -> Result<()> {
        let n = self.c.len();
        while self.i < n {
            self.skip_blank();
            if self.i >= n {
                break;
            }
            let c = self.at(self.i);
            if Self::is_nl(c) {
                if c == '\r' && self.at(self.i + 1) == '\n' && self.more(self.i + 1) {
                    self.i += 2;
                } else {
                    self.i += 1;
                }
                self.line += 1;
                continue;
            }
            if c == '#' {
                while self.i < n && !Self::is_nl(self.at(self.i)) {
                    self.i += 1;
                }
                continue;
            }
            let entry_line = self.line;
            let export: String = self.c[self.i..n.min(self.i + 6)].iter().collect();
            if export == "export"
                && self.more(self.i + 6)
                && (self.at(self.i + 6) == ' ' || self.at(self.i + 6) == '\t')
            {
                self.i += 6;
                self.skip_blank();
            }
            let ks = self.i;
            while self.i < n && (self.at(self.i).is_ascii_alphanumeric() || self.at(self.i) == '_')
            {
                self.i += 1;
            }
            let key: String = self.c[ks..self.i].iter().collect();
            if !is_name(&key) {
                return Err(Error::line("expected a variable name", entry_line));
            }
            self.skip_blank();
            if !(self.more(self.i) && self.at(self.i) == '=') {
                return Err(Error::line("expected '='", entry_line));
            }
            self.i += 1;
            self.skip_blank();
            let mut value = String::new();
            let q = if self.more(self.i) {
                self.at(self.i)
            } else {
                '\0'
            };
            if q == '"' || q == '\'' {
                self.i += 1;
                let mut closed = false;
                while self.i < n {
                    let ch = self.at(self.i);
                    if ch == q {
                        closed = true;
                        self.i += 1;
                        break;
                    }
                    if q == '"' && ch == '\\' && self.i + 1 < n {
                        let e = self.at(self.i + 1);
                        match e {
                            'n' => value.push('\n'),
                            'r' => value.push('\r'),
                            't' => value.push('\t'),
                            '\\' => value.push('\\'),
                            '"' => value.push('"'),
                            '$' => value.push('$'),
                            other => {
                                value.push('\\');
                                value.push(other);
                            }
                        }
                        if Self::is_nl(e) {
                            if e == '\r' && self.more(self.i + 2) && self.at(self.i + 2) == '\n' {
                                value.push('\n');
                                self.i += 1;
                            }
                            self.line += 1;
                        }
                        self.i += 2;
                        continue;
                    }
                    if q == '"' && ch == '$' && self.more(self.i + 1) && self.at(self.i + 1) == '{'
                    {
                        let (t, next) = self.expand(self.i, n, entry_line)?;
                        value.push_str(&t);
                        self.i = next;
                        continue;
                    }
                    if ch == '\r' && self.more(self.i + 1) && self.at(self.i + 1) == '\n' {
                        value.push_str("\r\n");
                        self.i += 2;
                        self.line += 1;
                        continue;
                    }
                    if Self::is_nl(ch) {
                        self.line += 1;
                    }
                    value.push(ch);
                    self.i += 1;
                }
                if !closed {
                    return Err(Error::line("unterminated quoted value", entry_line));
                }
                self.skip_blank();
                if self.i < n && !Self::is_nl(self.at(self.i)) && self.at(self.i) != '#' {
                    return Err(Error::line(
                        "unexpected text after quoted value",
                        entry_line,
                    ));
                }
                while self.i < n && !Self::is_nl(self.at(self.i)) {
                    self.i += 1;
                }
            } else {
                let vs = self.i;
                while self.i < n && !Self::is_nl(self.at(self.i)) {
                    self.i += 1;
                }
                let mut ve = self.i;
                for k in vs..self.i {
                    if self.at(k) == '#'
                        && (k == vs || self.at(k - 1) == ' ' || self.at(k - 1) == '\t')
                    {
                        ve = k;
                        break;
                    }
                }
                while ve > vs && (self.at(ve - 1) == ' ' || self.at(ve - 1) == '\t') {
                    ve -= 1;
                }
                let mut k = vs;
                while k < ve {
                    if self.at(k) == '$' && k + 1 < ve && self.at(k + 1) == '{' {
                        let (t, next) = self.expand(k, ve, entry_line)?;
                        value.push_str(&t);
                        k = next;
                    } else {
                        value.push(self.at(k));
                        k += 1;
                    }
                }
            }
            self.out.set(&key, Value::Str(value));
        }
        Ok(())
    }
}

/// Parse dotenv text into an object of strings. `${NAME}` and `${NAME:-default}` refer to keys
/// defined earlier in the same text, then to `env` (an object of strings, or `None`).
pub fn parse_dotenv(text: &str, env: Option<&Value>) -> Result<Value> {
    let env = check_env(env)?;
    let body = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut p = Dotenv {
        c: body.chars().collect(),
        i: 0,
        line: 1,
        out: obj(),
        env: &env,
    };
    p.parse()?;
    Ok(p.out)
}

// ---------------------------------------------------------------- schema resolution

/// Field types of a schema leaf.
pub const TYPES: [&str; 7] = ["string", "int", "float", "bool", "list", "json", "enum"];
const LEAF_KEYS: [&str; 9] = [
    "type",
    "env",
    "default",
    "required",
    "values",
    "min",
    "max",
    "description",
    "secret",
];

struct Leaf<'a> {
    ty: &'a str,
    env: Option<&'a str>,
    default: Option<&'a Value>,
    required: bool,
    values: Vec<&'a str>,
    min: Option<f64>,
    max: Option<f64>,
    secret: bool,
}

fn is_leaf(node: &Value) -> bool {
    matches!(node.get("type"), Some(Value::Str(_)))
}

fn leaf_of<'a>(node: &'a Value, path: &str) -> Result<Leaf<'a>> {
    let bad = |m: &str| Err(Error::at("invalid_schema", m, path));
    for (k, _) in node.as_obj().map(|m| m.as_slice()).unwrap_or(&[]) {
        if !LEAF_KEYS.contains(&k.as_str()) {
            return bad("unknown field key");
        }
    }
    let ty = node.get("type").and_then(|t| t.as_str()).unwrap_or("");
    if !TYPES.contains(&ty) {
        return bad("unknown type");
    }
    let mut leaf = Leaf {
        ty,
        env: None,
        default: node.get("default"),
        required: true,
        values: Vec::new(),
        min: None,
        max: None,
        secret: false,
    };
    if let Some(e) = node.get("env") {
        match e {
            Value::Str(s) if is_name(s) => leaf.env = Some(s),
            _ => return bad("env must be a variable name"),
        }
    }
    if let Some(r) = node.get("required") {
        match r {
            Value::Bool(b) => leaf.required = *b,
            _ => return bad("required must be a boolean"),
        }
    }
    if let Some(r) = node.get("secret") {
        match r {
            Value::Bool(b) => leaf.secret = *b,
            _ => return bad("secret must be a boolean"),
        }
    }
    if let Some(d) = node.get("description") {
        if d.as_str().is_none() {
            return bad("description must be a string");
        }
    }
    if ty == "enum" {
        match node.get("values").and_then(|v| v.as_arr()) {
            Some(vs) if !vs.is_empty() && vs.iter().all(|x| x.as_str().is_some()) => {
                leaf.values = vs.iter().filter_map(|x| x.as_str()).collect();
            }
            _ => return bad("enum needs a non-empty values array of strings"),
        }
    } else if node.get("values").is_some() {
        return bad("values is only allowed for enum");
    }
    for b in ["min", "max"] {
        if let Some(v) = node.get(b) {
            if ty != "int" && ty != "float" {
                return bad("min and max are only allowed for int and float");
            }
            let n = match v.as_f64() {
                Some(n) => n,
                None => return bad("min and max must be numbers"),
            };
            if b == "min" {
                leaf.min = Some(n);
            } else {
                leaf.max = Some(n);
            }
        }
    }
    if let (Some(a), Some(b)) = (leaf.min, leaf.max) {
        if a > b {
            return bad("min is greater than max");
        }
    }
    if let Some(d) = leaf.default {
        let okd = match ty {
            "string" => d.as_str().is_some(),
            "int" => {
                matches!(d, Value::Num(n) if (-MAX_SAFE..=MAX_SAFE).contains(n) && *n == (*n as i64) as f64)
            }
            "float" => d.as_f64().is_some(),
            "bool" => d.as_bool().is_some(),
            "list" => matches!(d, Value::Arr(a) if a.iter().all(|x| x.as_str().is_some())),
            "enum" => matches!(d, Value::Str(s) if leaf.values.contains(&s.as_str())),
            _ => true,
        };
        if !okd {
            return bad("default does not match type");
        }
    }
    Ok(leaf)
}

fn is_int_text(s: &str) -> bool {
    let d = s.strip_prefix(['+', '-']).unwrap_or(s);
    !d.is_empty() && d.bytes().all(|b| b.is_ascii_digit())
}

fn is_float_text(s: &str) -> bool {
    let b = s.as_bytes();
    let mut i = 0;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        i += 1;
    }
    let int_start = i;
    while i < b.len() && b[i].is_ascii_digit() {
        i += 1;
    }
    let int_digits = i - int_start;
    let mut frac_digits = 0;
    if i < b.len() && b[i] == b'.' {
        i += 1;
        let fs = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        frac_digits = i - fs;
    }
    if int_digits == 0 && frac_digits == 0 {
        return false;
    }
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        i += 1;
        if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
            i += 1;
        }
        let es = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        if i == es {
            return false;
        }
    }
    i == b.len()
}

fn finite_tree(v: &Value) -> bool {
    match v {
        Value::Num(n) => n.is_finite(),
        Value::Arr(a) => a.iter().all(finite_tree),
        Value::Obj(m) => m.iter().all(|(_, x)| finite_tree(x)),
        _ => true,
    }
}

fn no_neg_zero(x: f64) -> f64 {
    if x == 0.0 {
        0.0
    } else {
        x
    }
}

fn cast(leaf: &Leaf, raw: &str, path: &str) -> Result<Value> {
    let bad = || {
        Err(Error::at(
            "invalid_value",
            "value is not valid for its type",
            path,
        ))
    };
    match leaf.ty {
        "string" => Ok(Value::Str(raw.to_string())),
        "int" => {
            if !is_int_text(raw) {
                return bad();
            }
            match raw.parse::<i64>() {
                Ok(n) if n.unsigned_abs() <= MAX_SAFE as u64 => {
                    Ok(Value::Num(no_neg_zero(n as f64)))
                }
                _ => bad(),
            }
        }
        "float" => {
            if !is_float_text(raw) {
                return bad();
            }
            match raw.parse::<f64>() {
                Ok(n) if n.is_finite() => Ok(Value::Num(no_neg_zero(n))),
                _ => bad(),
            }
        }
        "bool" => match raw.to_ascii_lowercase().as_str() {
            "true" | "1" | "yes" | "on" => Ok(Value::Bool(true)),
            "false" | "0" | "no" | "off" => Ok(Value::Bool(false)),
            _ => bad(),
        },
        "list" => Ok(Value::Arr(
            raw.split(',')
                .map(|s| s.trim_matches(|c| c == ' ' || c == '\t'))
                .filter(|s| !s.is_empty())
                .map(|s| Value::Str(s.to_string()))
                .collect(),
        )),
        "json" => match parse_json(raw) {
            Ok(v) if finite_tree(&v) => Ok(v),
            _ => bad(),
        },
        _ => {
            if leaf.values.contains(&raw) {
                Ok(Value::Str(raw.to_string()))
            } else {
                bad()
            }
        }
    }
}

fn check_range(leaf: &Leaf, v: &Value, path: &str) -> Result<()> {
    if let Value::Num(n) = v {
        if leaf.min.is_some_and(|m| *n < m) || leaf.max.is_some_and(|m| *n > m) {
            return Err(Error::at("out_of_range", "value is outside min..max", path));
        }
    }
    Ok(())
}

/// Where a resolved value came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    Env,
    Default,
    None,
}

impl Source {
    pub fn as_str(self) -> &'static str {
        match self {
            Source::Env => "env",
            Source::Default => "default",
            Source::None => "none",
        }
    }
}

fn resolve_leaf(leaf: &Leaf, env: &Value, path: &str) -> Result<(Value, Source)> {
    if let Some(name) = leaf.env {
        if let Some(Value::Str(raw)) = env.get(name) {
            let v = cast(leaf, raw, path)?;
            check_range(leaf, &v, path)?;
            return Ok((v, Source::Env));
        }
    }
    if let Some(d) = leaf.default {
        check_range(leaf, d, path)?;
        return Ok((d.clone(), Source::Default));
    }
    if leaf.required {
        return Err(Error::at(
            "missing_value",
            "no environment value and no default",
            path,
        ));
    }
    Ok((Value::Null, Source::None))
}

fn walk(
    schema: &Value,
    path: &str,
    depth: usize,
    visit: &mut dyn FnMut(&Leaf, &str) -> Result<Value>,
) -> Result<Value> {
    if depth > MAX_DEPTH {
        return Err(Error::at("too_deep", "schema nested too deeply", path));
    }
    if schema.as_obj().is_none() {
        return Err(Error::at(
            "invalid_schema",
            "schema node must be an object",
            path,
        ));
    }
    let mut out = obj();
    for (k, node) in schema.js_entries() {
        let p = if path.is_empty() {
            k.clone()
        } else {
            format!("{}.{}", path, k)
        };
        if !is_name(k) {
            return Err(Error::at("invalid_schema", "invalid key", &p));
        }
        if node.as_obj().is_none() {
            return Err(Error::at(
                "invalid_schema",
                "schema node must be an object",
                &p,
            ));
        }
        let v = if is_leaf(node) {
            let leaf = leaf_of(node, &p)?;
            visit(&leaf, &p)?
        } else {
            walk(node, &p, depth + 1, visit)?
        };
        out.set(k, v);
    }
    Ok(out)
}

/// Validate the whole schema without resolving any value.
pub fn validate_schema(schema: &Value) -> Result<()> {
    walk(schema, "", 0, &mut |_, _| Ok(Value::Null)).map(|_| ())
}

/// Resolve a schema against an environment (object of strings) into a typed config object.
/// The schema is validated completely first; then fields resolve in schema order.
pub fn resolve(schema: &Value, env: Option<&Value>) -> Result<Value> {
    validate_schema(schema)?;
    let env = check_env(env)?;
    walk(schema, "", 0, &mut |leaf, p| {
        resolve_leaf(leaf, &env, p).map(|r| r.0)
    })
}

/// One entry per field in schema order (`path`, `type`, `env`, `source`, `value`, `error`);
/// secret values are shown as `[secret]`. Value errors are reported, not raised.
pub fn explain(schema: &Value, env: Option<&Value>) -> Result<Value> {
    validate_schema(schema)?;
    let env = check_env(env)?;
    let mut entries: Vec<Value> = Vec::new();
    walk(schema, "", 0, &mut |leaf, p| {
        let mut e = obj();
        e.set("path", Value::Str(p.to_string()));
        e.set("type", Value::Str(leaf.ty.to_string()));
        e.set(
            "env",
            leaf.env
                .map(|s| Value::Str(s.to_string()))
                .unwrap_or(Value::Null),
        );
        match resolve_leaf(leaf, &env, p) {
            Ok((v, src)) => {
                e.set("source", Value::Str(src.as_str().to_string()));
                let shown = if leaf.secret && v != Value::Null {
                    Value::Str("[secret]".to_string())
                } else {
                    v
                };
                e.set("value", shown);
                e.set("error", Value::Null);
            }
            Err(err) => {
                let src = if leaf.env.is_some_and(|n| env.get(n).is_some()) {
                    Source::Env
                } else if leaf.default.is_some() {
                    Source::Default
                } else {
                    Source::None
                };
                e.set("source", Value::Str(src.as_str().to_string()));
                e.set("value", Value::Null);
                e.set("error", Value::Str(err.code.to_string()));
            }
        }
        entries.push(e);
        Ok(Value::Null)
    })?;
    Ok(Value::Arr(entries))
}

// ---------------------------------------------------------------- merge and get

fn merge_into(a: &Value, b: &Value, depth: usize) -> Result<Value> {
    if depth > MAX_DEPTH {
        return Err(Error::new("too_deep", "objects nested too deeply"));
    }
    let mut out = a.clone();
    for (k, bv) in b.js_entries() {
        let nv = match (out.get(k), bv) {
            (Some(av @ Value::Obj(_)), Value::Obj(_)) => merge_into(av, bv, depth + 1)?,
            _ => bv.clone(),
        };
        out.set(k, nv);
    }
    Ok(out)
}

/// Deep merge: objects merge key by key; arrays, scalars and `null` in `over` replace.
pub fn merge(base: &Value, over: &Value) -> Result<Value> {
    if base.as_obj().is_none() || over.as_obj().is_none() {
        return Err(Error::new("invalid_input", "merge takes two objects"));
    }
    merge_into(base, over, 0)
}

fn is_index(s: &str) -> Option<usize> {
    if s == "0" {
        return Some(0);
    }
    if s.is_empty() || s.starts_with('0') || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    s.parse().ok()
}

/// Value at a dotted path (array items by decimal index). Missing paths return `fallback` when
/// given, otherwise `missing_value`.
pub fn get(config: &Value, path: &str, fallback: Option<&Value>) -> Result<Value> {
    if path.is_empty() {
        return Err(Error::new(
            "invalid_path",
            "path must be a non-empty string",
        ));
    }
    if path.split('.').any(|p| p.is_empty()) {
        return Err(Error::at("invalid_path", "path has an empty segment", path));
    }
    let mut cur = config;
    for p in path.split('.') {
        let next = match cur {
            Value::Obj(_) => cur.get(p),
            Value::Arr(a) => is_index(p).and_then(|i| a.get(i)),
            _ => None,
        };
        match next {
            Some(v) => cur = v,
            None => {
                return match fallback {
                    Some(f) => Ok(f.clone()),
                    None => Err(Error::at("missing_value", "no value at path", path)),
                }
            }
        }
    }
    Ok(cur.clone())
}

/// Dynamic entry point with the contract's JSON calling convention (`fn`, `args`), used by the
/// vector runner and by FFI or script hosts. Unknown `fn` yields `invalid_input`.
pub fn call(func: &str, args: &[Value]) -> Result<Value> {
    let arg = |i: usize| args.get(i);
    let null = Value::Null;
    match func {
        "parseDotenv" => match arg(0) {
            Some(Value::Str(t)) => parse_dotenv(t, arg(1)),
            _ => Err(Error::new("invalid_input", "text must be a string")),
        },
        "resolve" => resolve(arg(0).unwrap_or(&null), arg(1)),
        "validateSchema" => validate_schema(arg(0).unwrap_or(&null)).map(|_| Value::Bool(true)),
        "explain" => explain(arg(0).unwrap_or(&null), arg(1)),
        "merge" => merge(arg(0).unwrap_or(&null), arg(1).unwrap_or(&null)),
        "get" => match arg(1) {
            Some(Value::Str(p)) => get(arg(0).unwrap_or(&null), p, arg(2)),
            _ => Err(Error::new(
                "invalid_path",
                "path must be a non-empty string",
            )),
        },
        _ => Err(Error::new("invalid_input", "unknown function")),
    }
}
