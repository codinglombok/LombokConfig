# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/); entri terbaru di depan. Versi mengikuti [SemVer](https://semver.org/).

## [0.1.0] - 2026-10-07

### Added
- Parser dotenv dengan `export`, komentar, kutip ganda dan tunggal, multi-baris, interpolasi `${NAME}` dan `${NAME:-default}`, nomor baris pada galat.
- Resolusi skema dengan tipe `string`, `int`, `float`, `bool`, `list`, `json`, `enum`; `default`, `required`, `min`/`max`, `secret`; validasi skema lengkap lebih dulu.
- `explain` dengan asal nilai dan penyamaran nilai rahasia.
- `merge` (deep merge) dan `get` (jalur bertitik dengan indeks array dan fallback).
- Port Rust (`no_std + alloc`, tanpa dependensi, titik masuk dinamis `call`) dan port TypeScript (tanpa dependensi runtime).
- Vector bersama 346 kasus (226 golden berekspektasi tulis tangan, 120 regresi hasil pembangkit), dijalankan oleh runner Rust dan TypeScript.
- Pseudo-fuzz dan skrip uji mutasi (22 mutan).

### Security
- Pesan galat tidak memuat nilai yang ditolak; `explain` menyamarkan nilai `secret`.
- Kunci `__proto__` diperlakukan sebagai data (tanpa prototype pollution).
- Batas kedalaman 64 (skema, merge) dan 512 (JSON).
