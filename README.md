# LombokConfig

[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue)](LICENSE-APACHE)

Inti konfigurasi bertipe: parser **dotenv**, resolusi **skema** dengan konversi tipe yang ketat, **deep merge**, dan pencarian jalur bertitik. Tanpa dependensi runtime dan tanpa membaca lingkungan proses secara diam-diam: lingkungan selalu dipasok pemanggil. Hasilnya identik di setiap port.

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## Mengapa library ini?

Konfigurasi biasanya gagal di produksi, bukan saat pengembangan: `PORT=80a` dibaca sebagai `80`, `DEBUG=fasle` dibaca sebagai `false` tanpa peringatan, variabel wajib yang lupa diisi baru ketahuan saat fitur pertama kali dipakai. LombokConfig menolak semua itu saat start-up dengan kode galat dan jalur yang tepat (`db.port`), tanpa menyertakan nilai yang ditolak di pesan galat sehingga rahasia tidak bocor ke log.

Parser dotenv di setiap bahasa juga berbeda dalam hal kutip, komentar, dan interpolasi. LombokConfig menetapkan aturannya secara normatif dan membuktikannya dengan vector bersama.

Skenario pemakaian:

- **Layanan web dan API**: skema konfigurasi divalidasi sekali saat start-up; galat menyebut jalur dan variabel lingkungan.
- **Alat CLI**: `explain` menampilkan asal setiap nilai (env, default, kosong) dengan nilai rahasia tersamarkan.
- **Serverless dan edge**: tanpa akses sistem berkas; lingkungan dipasok sebagai objek.
- **Perangkat tertanam**: inti Rust `no_std + alloc` membaca konfigurasi dari teks yang disimpan di flash.
- **Konfigurasi berlapis**: `merge` untuk bawaan, berkas per lingkungan, dan override.

Contoh dependen lain di ekosistem Lombok dicantumkan di `docs/map_LombokConfig_v0.1.0.md`.

## Fitur

Setiap fitur di bawah ini dicakup vector di `vectors/` dan test TypeScript.

- `parseDotenv`: `KEY=VALUE`, `export`, komentar `#`, kutip ganda (escape `\n \r \t \\ \" \$`, multi-baris), kutip tunggal (literal), interpolasi `${NAME}` dan `${NAME:-default}`, BOM, CRLF; galat menyebut nomor baris.
- `resolve`: tipe `string`, `int`, `float`, `bool`, `list`, `json`, `enum`; `default`, `required`, `min`/`max`, `secret`; skema divalidasi lengkap lebih dulu; galat pertama menurut urutan skema dengan `path`.
- `explain`: daftar asal dan status setiap field; nilai `secret` ditampilkan `[secret]`.
- `merge`: deep merge dua objek; array dan skalar diganti.
- `get`: nilai di jalur bertitik dengan indeks array dan nilai cadangan.
- Aman terhadap kunci `__proto__` (tidak ada prototype pollution).

## Instalasi

Belum terbit di registry. Setelah rilis pertama:

```bash
npm install lombokconfig      # TypeScript / JavaScript
cargo add lombokconfig        # Rust
```

## Quick Start

### TypeScript

```ts
import { parseDotenv, resolve } from "lombokconfig";

const env = parseDotenv("DB_HOST=db.example.com\nDB_PORT=6543\n");
const schema = {
  db: {
    host: { type: "string", env: "DB_HOST" },
    port: { type: "int", env: "DB_PORT", default: 5432, min: 1, max: 65535 },
  },
  debug: { type: "bool", env: "APP_DEBUG", default: false },
};
const config = resolve(schema, env);
// {"db":{"host":"db.example.com","port":6543},"debug":false}
```

### Rust

```rust
use lombokconfig::{parse_dotenv, parse_json, resolve};

let env = parse_dotenv("DB_HOST=db.example.com\nDB_PORT=6543\n", None).unwrap();
let schema = parse_json(r#"{"db":{"host":{"type":"string","env":"DB_HOST"},"port":{"type":"int","env":"DB_PORT","default":5432}}}"#).unwrap();
let config = resolve(&schema, Some(&env)).unwrap();
assert_eq!(config.to_json(), r#"{"db":{"host":"db.example.com","port":6543}}"#);
```

## Status port

| Port | Status | Bukti |
|---|---|---|
| Rust (`no_std + alloc`) | YA, lulus vector | `rust/tests/vectors.rs` menjalankan seluruh vector termasuk `path` dan `line` galat; build `thumbv7em-none-eabi` |
| TypeScript | YA, lulus vector | `typescript/test/vectors.test.ts` menjalankan seluruh vector; ditambah test keamanan dan fuzz |
| Python, Go, PHP, Java, Kotlin, C#, C/C++, Swift, Perl | BELUM | Tidak ada kode; direncanakan setelah kontrak stabil (lihat `docs/development_ide_LombokConfig_v0.1.0.md`) |

Vector: 346 kasus (226 golden berekspektasi tulis tangan, 120 regresi hasil pembangkit).

## Standar yang diimplementasikan

Format dotenv tidak memiliki standar resmi; aturannya ditetapkan di `docs/SPEC_LombokConfig_v0.1.0.md` dan disusun agar kompatibel dengan pemakaian umum. RFC 8259 untuk tipe `json`.

## Batasan yang diketahui

- Tidak membaca berkas atau lingkungan proses; pemanggil memasok keduanya.
- Interpolasi dotenv hanya bentuk `${NAME}` dan `${NAME:-default}`; `$NAME` tanpa kurung kurawal dan substitusi perintah tidak didukung.
- String kosong dari lingkungan dihitung sebagai nilai yang ada, bukan "tidak diisi".
- Tidak ada format YAML atau TOML; untuk itu pakai parser terpisah lalu `merge`.
- Hanya Rust dan TypeScript yang memiliki kode. Fuzz bersifat pseudo-fuzz, belum `cargo-fuzz`. Belum ada audit keamanan pihak ketiga.

## Ekosistem Lombok

LombokConfig tidak bergantung pada library Lombok lain (L0). Library lain dapat memakainya secara opsional; daftar dependen ada di `docs/map_LombokConfig_v0.1.0.md`.

## Contributing

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Untuk melaporkan kerentanan lihat [SECURITY.md](SECURITY.md).

## Lisensi

`Apache-2.0 OR MIT`. Lihat [LICENSE-APACHE](LICENSE-APACHE) dan [LICENSE-MIT](LICENSE-MIT).
