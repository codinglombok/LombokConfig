# Lang LombokConfig v0.1.0

## 1. Tingkat i18n

Tingkat **E** (pesan error dan dokumentasi saja). Library tidak menghasilkan teks untuk pengguna akhir selain pesan galat.

## 2. Katalog ID pesan (normatif)

Format `lombokconfig.<jenis>.<kode>`. Berkas katalog: `locales/<bcp47>/lombokconfig.json`, satu berkas untuk semua port.

| ID | Teks sumber (en) | Kode galat |
|---|---|---|
| `lombokconfig.error.invalid_dotenv` | The dotenv text is malformed. | `invalid_dotenv` |
| `lombokconfig.error.invalid_schema` | The configuration schema is invalid. | `invalid_schema` |
| `lombokconfig.error.invalid_value` | A configuration value cannot be converted to its declared type. | `invalid_value` |
| `lombokconfig.error.missing_value` | A required configuration value is missing. | `missing_value` |
| `lombokconfig.error.out_of_range` | A configuration value is outside its allowed range. | `out_of_range` |
| `lombokconfig.error.invalid_input` | An argument has the wrong shape. | `invalid_input` |
| `lombokconfig.error.invalid_path` | The configuration path is invalid. | `invalid_path` |
| `lombokconfig.error.too_deep` | The configuration is nested too deeply. | `too_deep` |

Galat membawa `code` (kontrak, sama di semua port) dan `messageId`. Pesan `message` di objek galat berbahasa Inggris dan tidak bersifat normatif.

## 3. Cakupan saat ini

Core-20: 2 dari 20 (`en`, `id`). Paket Nusantara: 0 dari 6. Bahasa lain belum ada. Katalog bahasa tambahan harus ditinjau penutur asli sebelum diterima.

## 4. Cara menambah bahasa

1. Salin `locales/en/lombokconfig.json` ke `locales/<bcp47>/lombokconfig.json`.
2. Terjemahkan nilai; kunci tidak diubah.
3. Minta tinjauan penutur asli, lalu ajukan PR.

## 5. Ketergantungan LombokLocale

Tidak ada pada 0.1.0. Konsumen yang memakai LombokLocale dapat me-resolve `messageId` terhadap katalog di atas.
