# Development IDE LombokConfig v0.1.0

## 1. Roadmap

| Versi | Isi |
|---|---|
| 0.1.1 | Tutup syarat rilis: CI dijalankan, `doctor docs/privacy/style`, coverage diukur, target `cargo-fuzz` |
| 0.2.0 | Tipe `duration` dan `size` (misalnya `30s`, `10MB`); prefiks env per grup; port Python, Go, PHP |
| 0.3.0 | Integrasi opsional TOML lewat LombokSerde; validasi lintas field; pembangkit dokumentasi `.env.example` dari skema |

## 2. Deferred scope

Lihat SPEC bagian Non-goals dan README (Batasan).

## 3. Prinsip desain kontributor

- Kontrak dulu, test dulu; semua port lulus vector yang sama.
- Tidak ada dependensi runtime; dev-dependency dicatat.
- Fungsi inti murni: jam, keacakan, dan I/O dipasok pemanggil.
- Konversi tipe ketat: lebih baik gagal saat start-up daripada salah di produksi.
- Nilai yang ditolak tidak pernah masuk ke pesan galat.

## 4. Cara berkontribusi

Lihat `CONTRIBUTING.md`.

## 5. Pertanyaan terbuka

- Apakah string kosong sebaiknya dapat dikonfigurasi sebagai "tidak diisi" per field?
- Apakah `${NAME}` sebaiknya mengutamakan `env` di atas berkas (perilaku beberapa pustaka dotenv)?
