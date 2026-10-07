# API LombokConfig v0.1.0

Semantik normatif ada di `SPEC_LombokConfig_v0.1.0.md`; dokumen ini hanya mendaftar antarmuka yang benar-benar diekspor.

## 1. TypeScript (paket `lombokconfig`)

Stabilitas: 0.x, dapat berubah pada rilis minor.

| Simbol | Tanda tangan | Keterangan |
|---|---|---|
| `parseDotenv` | `(text: unknown, env?: unknown) => Env` | Sejak 0.1.0 |
| `validateSchema` | `(schema: unknown) => true` | Melempar galat skema pertama |
| `resolve` | `(schema: unknown, env?: unknown) => JsonObject` | |
| `explain` | `(schema: unknown, env?: unknown) => ExplainEntry[]` | Tidak melempar galat nilai |
| `merge` | `(base: unknown, override: unknown) => JsonObject` | Deep merge |
| `get` | `(config: unknown, path: unknown, ...fallback: unknown[]) => Json` | Fallback opsional |
| `ExplainEntry` | `{ path; type; env; source: "env" \| "default" \| "none"; value; error }` | |
| `TYPES`, `FieldType` | `string`, `int`, `float`, `bool`, `list`, `json`, `enum` | |
| `Env`, `Json`, `JsonObject` | tipe | |
| `LombokConfigError` | `extends Error`; `code`, `messageId`, `path?`, `line?` | Kode: SPEC bagian 9 |

Bentuk leaf skema: `{ type, env?, default?, required?, values?, min?, max?, description?, secret? }`.

## 2. Rust (crate `lombokconfig`)

Fitur: `std` (bawaan). Tanpa `std`, crate bersifat `no_std + alloc`.

| Simbol | Keterangan |
|---|---|
| `parse_dotenv(&str, Option<&Value>) -> Result<Value>` | Dotenv |
| `validate_schema(&Value) -> Result<()>` | |
| `resolve(&Value, Option<&Value>) -> Result<Value>` | |
| `explain(&Value, Option<&Value>) -> Result<Value>` | Array entri |
| `merge(&Value, &Value) -> Result<Value>` | |
| `get(&Value, &str, Option<&Value>) -> Result<Value>` | |
| `call(fn: &str, args: &[Value]) -> Result<Value>` | Titik masuk dinamis dengan konvensi vector |
| `Source` (`Env`, `Default`, `None`), `TYPES` | |
| `json::Value`, `parse_json`, `json::js_number` | JSON internal, keluaran setara `JSON.stringify` |
| `Error { code, message, path: Option<String>, line: Option<u32> }` | `message_id()`; `Display`; `std::error::Error` dengan `std` |

## 3. Port lain

Belum ada.

## 4. Kompatibilitas lintas bahasa

Untuk masukan yang sama, TypeScript dan Rust menghasilkan hasil dan galat (termasuk `path` dan `line`) yang identik pada seluruh vector (346 kasus).
