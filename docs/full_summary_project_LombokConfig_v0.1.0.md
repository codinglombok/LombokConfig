# Full Summary LombokConfig v0.1.0

## Apa ini

Inti konfigurasi bertipe: parser dotenv, resolusi skema dengan konversi ketat, deep merge, dan pencarian jalur, tanpa membaca lingkungan proses secara diam-diam.

## Mengapa dibuat

Kesalahan konfigurasi biasanya baru terlihat di produksi karena konversi yang longgar (`80a` menjadi `80`) dan variabel wajib yang tidak diperiksa saat start-up. Parser dotenv di setiap bahasa juga berbeda dalam aturan kutip dan interpolasi, sehingga berkas yang sama dibaca berbeda oleh layanan yang berbeda.

## Fitur utama

Lihat README (bagian Fitur). Semua fitur dicakup vector.

## Status saat ini

Kode lengkap untuk Rust dan TypeScript; lulus 346 kasus vector; belum terbit di registry; belum memenuhi aturan skor rilis (lihat `TECH_DEBT.md`).

## Contoh pemakai

Lihat README (skenario pemakaian).

## Batasan yang Diketahui

- Tidak membaca berkas atau lingkungan proses; pemanggil memasok keduanya.
- Interpolasi dotenv hanya `${NAME}` dan `${NAME:-default}`.
- String kosong dari lingkungan adalah nilai, bukan ketiadaan.
- Tidak ada YAML, TOML, atau INI; tidak ada validasi lintas field.
- Hanya dua port (Rust, TypeScript); fuzz berupa pseudo-fuzz, belum `cargo-fuzz`; belum audit pihak ketiga; coverage belum diukur.

## Info lanjut

SPEC_, API_, `development_ide_`.

## Gap vs pembanding (U6)

Perbandingan bersifat kualitatif dan berdasarkan pengetahuan umum tentang kategori library; belum diverifikasi fitur demi fitur pada 2026-10-07.

| Pembanding (kategori) | Yang dimiliki pembanding dan belum dimiliki LombokConfig | Yang ditawarkan LombokConfig |
|---|---|---|
| Loader konfigurasi satu bahasa (dotenv, envalid, convict, config-rs, pydantic-settings, Viper) | Banyak format berkas, hot reload, sumber jarak jauh, validasi kustom | Kontrak dotenv dan konversi tipe lintas bahasa dengan vector bersama; galat dengan jalur; inti `no_std + alloc`; tanpa dependensi |
| Parser dotenv saja | Ekosistem plugin | Skema bertipe, `explain`, dan `merge` dalam satu paket |
