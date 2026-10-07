# Tech Debt LombokConfig

Format: ID, temuan, prioritas, perbaikan, status. Prioritas P1 memblokir rilis minor; P0 memblokir tag 0.1.0.

| ID | Temuan | Prioritas | Perbaikan | Status |
|---|---|---|---|---|
| TD-01 | `ci.yml` belum pernah dijalankan di GitHub Actions; action belum di-pin SHA | P0 | Jalankan di repo, pin SHA, aktifkan Dependabot | OPEN |
| TD-02 | `lombok doctor docs/privacy/style` belum ada (TD-P0-08 ekosistem); pemeriksaan otomatis terbatas pada `docs.test.ts` | P0 | Jalankan setelah `codinglombok/.github` ada | OPEN |
| TD-03 | Coverage belum diukur; target 90% | P1 | Tambah job coverage Rust dan TS | OPEN |
| TD-04 | Fuzz bukan `cargo-fuzz`; fuzz Rust belum ada | P1 | Target `cargo-fuzz` untuk `call` | OPEN |
| TD-05 | Hanya Rust dan TypeScript; port Python, Go, PHP BELUM | P1 | Rencana 0.2.0 | OPEN |
| TD-06 | Salinan `LICENSE-*` di `rust/` | P3 | Otomatiskan salinan saat rilis | OPEN |
| TD-07 | Kasus regresi (120) berekspektasi dari TS dan dikonfirmasi port Rust; hanya 226 golden yang independen | P3 | Tinjau manual sebagian kasus regresi | OPEN |
| TD-08 | Bentuk skema hanya didokumentasikan; belum ada JSON Schema formal untuk skema | P2 | Terbitkan JSON Schema skema di 0.2.0 | OPEN |
| TD-09 | Kinerja belum diukur (benchmark) | P2 | Tambah benchmark sederhana per port | OPEN |

Sudah ditutup di 0.1.0: `no_std` dibuktikan dengan build `thumbv7em-none-eabi` dan clippy/rustfmt dijalankan dengan `-D warnings` (lokal; CI menjalankan yang sama).
