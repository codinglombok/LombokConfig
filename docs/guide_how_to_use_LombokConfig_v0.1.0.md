# Guide How To Use LombokConfig v0.1.0

## Instalasi

Belum terbit. Setelah rilis: `npm install lombokconfig` atau `cargo add lombokconfig`. Sebelum itu, bangun dari repo (lihat `CONTRIBUTING.md`).

## Konsep dasar

1. **Lingkungan** adalah objek string. Anda menyusunnya sendiri, misalnya dari berkas `.env` dan `process.env`.
2. **Skema** mendeklarasikan setiap field: tipe, variabel lingkungan, default, batas.
3. `resolve(skema, lingkungan)` menghasilkan objek bertipe atau melempar galat pertama dengan `path`.

## Contoh

```ts
import { readFileSync } from "node:fs";
import { parseDotenv, resolve } from "lombokconfig";

const fileEnv = parseDotenv(readFileSync(".env", "utf8"), process.env as Record<string, string>);
const env = { ...fileEnv, ...(process.env as Record<string, string>) };   // proses menang atas berkas
const config = resolve(schema, env);
```

## Recipes

### Validasi saat start-up dengan pesan yang jelas

```ts
import { resolve, LombokConfigError } from "lombokconfig";
try {
  resolve({ db: { port: { type: "int", env: "DB_PORT" } } }, { DB_PORT: "80a" });
} catch (e) {
  if (e instanceof LombokConfigError) console.error(`${e.code} at ${e.path}`);   // invalid_value at db.port
}
```

### Menampilkan asal konfigurasi tanpa membocorkan rahasia

```ts
import { explain } from "lombokconfig";
explain({ db: { pass: { type: "string", env: "DB_PASS", secret: true } } }, { DB_PASS: "x" });
// [{"path":"db.pass","type":"string","env":"DB_PASS","source":"env","value":"[secret]","error":null}]
```

### Konfigurasi berlapis

```ts
import { merge } from "lombokconfig";
merge({ cache: { ttl: 60, driver: "memory" } }, { cache: { ttl: 5 } });
// {"cache":{"ttl":5,"driver":"memory"}}
```

### Interpolasi dotenv

```
APP_URL=https://example.com
CALLBACK_URL=${APP_URL}/callback
LOG_LEVEL=${LOG_LEVEL:-info}
```

## Common pitfalls

- String kosong (`PORT=`) adalah nilai, bukan "tidak diisi"; untuk `int` hasilnya `invalid_value`.
- `bool` hanya menerima `true/false/1/0/yes/no/on/off`; `y` dan `enabled` ditolak.
- `${NAME}` di dotenv hanya melihat kunci yang sudah terbaca **sebelumnya** di berkas yang sama, lalu `env`.
- Nilai dalam kutip tunggal tidak diekspansi dan tidak mengenal escape.
- Komentar di nilai tanpa kutip harus didahului spasi: `A=a#b` bernilai `a#b`.
- `merge` mengganti array secara utuh, tidak menggabungkannya.

## Lihat juga

README, SPEC_, API_.
