# Vectors

`lombokconfig-vectors-v1.json` adalah kontrak uji lintas bahasa untuk LombokConfig.

- SHA-256: `af88ec3b63d6dac3040235c18ff9ba9bd2c383f3326266caff2a9a2e40971201` (harus sama dengan `docs/SPEC_LombokConfig_v0.1.0.md`).
- Dibangkitkan oleh `scripts/gen-vectors.mjs`. Grup `golden`: ekspektasi ditulis tangan dan dicocokkan dengan port TypeScript saat pembangkitan (ketidakcocokan menggagalkan pembangkitan). Grup `generated-regression`: teks dotenv acak berbenih, ekspektasi dari port TypeScript dan dikonfirmasi port Rust. Galat membawa `path` atau `line` yang juga diperiksa.
- Setiap kasus memanggil fungsi `fn` dengan `args`; `expect` berbentuk `{ "result": ... }` atau `{ "error": code }`.
- Setiap port yang diklaim MUST menjalankan seluruh kasus.
- Jumlah: 346 kasus (226 golden berekspektasi tulis tangan, 120 regresi hasil pembangkit).
