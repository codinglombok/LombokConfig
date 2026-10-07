# Changelog LombokConfig (ringkasan)

Entri terbaru di depan. Rincian ada di `CHANGELOG.md`.

## 0.1.0 - 2026-10-07

### Added
- `parseDotenv`, `validateSchema`, `resolve`, `explain`, `merge`, `get`.
- Port Rust `no_std + alloc` dan port TypeScript.
- Vector 346 kasus; runner di kedua port; fuzz, uji mutasi.

### Security
- Pesan galat tidak memuat nilai yang ditolak; `explain` menyamarkan nilai `secret`.
- Kunci `__proto__` diperlakukan sebagai data (tanpa prototype pollution).
- Batas kedalaman 64 (skema, merge) dan 512 (JSON).
