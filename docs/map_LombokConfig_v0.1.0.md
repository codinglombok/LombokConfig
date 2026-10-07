# Map LombokConfig v0.1.0

## 1. Posisi dependensi

L0. Posisi cluster dan nomor katalog mengikuti dokumen induk ekosistem v3.6 (tidak di-commit, ADR-024). Tidak memiliki dependensi Lombok wajib.

## 2. Contoh dependen di ekosistem

Bagian ini satu-satunya tempat nama aplikasi atau framework boleh muncul (ADR-019). Ini ilustrasi, bukan kepemilikan; siapa pun dapat memakai LombokConfig.

| Pemakai | Jenis | Status integrasi | Keterangan |
|---|---|---|---|
| LombokClarion v3 | Framework | rencana (F7) | Menggantikan kompiler konfigurasi internal v2 (skema dan konversi tipe) |
| LombokServer | Library L4 | rencana | Konfigurasi server dari lingkungan |
| LombokCLIParse | Library L0 | rencana (opsional) | Menggabungkan argumen CLI dengan konfigurasi lingkungan lewat `merge` |
| LombokDocFlow | Aplikasi | rencana | Konfigurasi aplikasi |

Integrasi opsional ke LombokSerde (TOML) dan LombokValidator (aturan lintas field) belum diimplementasikan.

## 3. Bergantung pada

Tidak ada.

## 4. Jalur kontrak normatif

`docs/SPEC_LombokConfig_v0.1.0.md` -> `vectors/lombokconfig-vectors-v1.json` (sha256 di SPEC) -> runner `rust/tests/vectors.rs` dan `typescript/test/vectors.test.ts`.

## 5. Peta folder

Lihat `structure_repo_LombokConfig_v0.1.0.md`.
