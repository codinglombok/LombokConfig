# SPEC LombokConfig v0.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

Key words MUST, MUST NOT, SHOULD and MAY are interpreted as in RFC 2119 and RFC 8174.

| Atribut | Nilai |
|---|---|
| Versi kontrak | 0.1.0 |
| Tanggal tinjauan standar acuan | 2026-10-07 |
| Vector | `vectors/lombokconfig-vectors-v1.json` |
| SHA-256 vector | `af88ec3b63d6dac3040235c18ff9ba9bd2c383f3326266caff2a9a2e40971201` |

## 0. Standar acuan (U2)

| Acuan | Versi | Pemakaian |
|---|---|---|
| RFC 8259 | Desember 2017 | Tipe `json`, bentuk argumen dan hasil |
| ECMA-262 | 2024 | Urutan properti objek dan format angka keluaran |
| POSIX.1-2024, Shell Command Language | 2024 | Acuan bentuk `${NAME}` dan `${NAME:-word}`; hanya subset di bagian 3 yang berlaku |
| RFC 2119, RFC 8174 | 1997, 2017 | Kata kunci normatif |

Format dotenv tidak memiliki standar resmi. Aturan bagian 3 adalah definisi normatif untuk library ini.

## 1. Vector

Berkas vector memuat `{ format, specVersion, note, groups }`. Setiap kasus memuat `name`, `fn`, `args`, dan `expect` berbentuk `{ "result": nilai }` atau `{ "error": code, "path"?: string, "line"?: number }`. Setiap port yang diklaim MUST menjalankan seluruh kasus; hasil MUST sama secara struktural; galat MUST memiliki `code` yang sama dan `path`/`line` yang sama persis (termasuk ketiadaannya). Hash SHA-256 berkas MUST sama dengan tabel atribut.

## 2. Antarmuka

Semua fungsi MUST murni: tidak membaca berkas, lingkungan proses, jam, atau keacakan.

| `fn` | Argumen | Hasil |
|---|---|---|
| `parseDotenv` | `text`, `env?` | objek string |
| `validateSchema` | `schema` | `true` |
| `resolve` | `schema`, `env?` | objek konfigurasi |
| `explain` | `schema`, `env?` | array entri |
| `merge` | `base`, `override` | objek |
| `get` | `config`, `path`, `fallback?` | nilai |

`env` adalah objek yang semua nilainya string; `env` yang tidak ada atau `null` berarti objek kosong; bentuk lain MUST `invalid_input`.

## 3. Dotenv

`text` MUST string (selain itu `invalid_input`); lalu `env` diperiksa. Satu U+FEFF di awal dibuang. Teks diproses per code point. Akhir baris adalah `\r\n`, `\n`, atau `\r`. Nomor baris dimulai dari 1.

Perulangan:

1. Lewati spasi dan tab. Akhir teks: selesai. Akhir baris: lanjut ke baris berikut. `#`: abaikan sampai akhir baris.
2. Entri dimulai; baris awal entri dicatat. Bila teks berikut adalah `export` yang diikuti spasi atau tab, lewati `export` dan spasi/tab sesudahnya.
3. Kunci: rangkaian terpanjang `[A-Za-z0-9_]`; MUST cocok `^[A-Za-z_][A-Za-z0-9_]*$`. Lewati spasi/tab; MUST ada `=`; lewati spasi/tab.
4. Nilai:
   - Diawali `"`: berlanjut melewati akhir baris sampai `"` penutup. `\n`, `\r`, `\t`, `\\`, `\"`, `\$` menjadi karakter yang sesuai; backslash diikuti karakter lain menghasilkan kedua karakter apa adanya. `${...}` diekspansi (di bawah). Akhir baris di dalam nilai disalin apa adanya.
   - Diawali `'`: literal sampai `'` penutup; tanpa escape dan tanpa ekspansi.
   - Setelah kutip penutup hanya boleh spasi/tab lalu akhir baris, akhir teks, atau `#` (komentar).
   - Selain itu (tanpa kutip): sisa baris. Komentar dimulai pada `#` pertama yang berada di awal nilai atau didahului spasi/tab. Spasi/tab di ujung dibuang. `${...}` diekspansi; teks lain apa adanya.
5. `out[kunci] = nilai`. Kunci yang muncul ulang mengganti nilai dan mempertahankan posisi pertamanya.

Ekspansi: `${` diikuti teks sampai `}` pertama (pada nilai tanpa kutip pencarian dibatasi pada nilai yang sudah dipotong komentar). Isi berbentuk `NAME` atau `NAME:-default` (pemisah adalah `:-` pertama); `NAME` MUST cocok pola kunci. Nilai `NAME` dicari pada entri yang **sudah** terbaca di teks ini, lalu pada `env`. `${NAME}` menghasilkan nilai itu atau string kosong. `${NAME:-default}` menghasilkan `default` (literal, tanpa ekspansi) bila tidak ada atau kosong. Hasil ekspansi tidak dipindai ulang. `$` yang tidak diikuti `{` adalah literal.

Galat `invalid_dotenv` dengan `line` = baris awal entri: kunci tidak sah, `=` tidak ada, kutip tidak ditutup, teks setelah kutip penutup, `${` tanpa `}`, atau nama ekspansi tidak sah.

## 4. Skema

Skema adalah objek. Setiap kunci MUST cocok `^[A-Za-z_][A-Za-z0-9_]*$` dan nilainya MUST objek. Node adalah **leaf** bila memiliki kunci `type` bernilai string; selain itu **grup** yang ditelusuri secara rekursif (kedalaman grup lebih dari 64: `too_deep`). `path` adalah kunci yang digabung `.`; skema tingkat atas memiliki path kosong.

Kunci leaf yang sah: `type`, `env`, `default`, `required`, `values`, `min`, `max`, `description`, `secret`; kunci lain MUST `invalid_schema`. Urutan pemeriksaan leaf: kunci tak dikenal, `type` (salah satu `string`, `int`, `float`, `bool`, `list`, `json`, `enum`), `env` (nama variabel), `required` (boolean, bawaan `true`), `secret` (boolean), `description` (string), `values` (wajib untuk `enum`: array string tidak kosong; dilarang untuk tipe lain), `min`/`max` (hanya `int` dan `float`, angka, `min <= max`), `default` sesuai tipe (`string`: string; `int`: bilangan bulat dengan nilai mutlak paling besar 9007199254740991; `float`: angka; `bool`: boolean; `list`: array string; `enum`: salah satu `values`; `json`: apa saja).

Skema MUST divalidasi seluruhnya (menurut urutan properti bagian 7) sebelum nilai apa pun di-resolve; galat skema pertama dilaporkan dengan `path` node tersebut.

## 5. Resolusi

Setelah skema sah, `env` diperiksa, lalu setiap leaf di-resolve menurut urutan skema dan galat pertama dilaporkan dengan `path` leaf:

1. Bila `env` leaf ada dan kunci itu ada di `env` (termasuk string kosong): konversi (bagian 5.1), lalu periksa rentang.
2. Bila ada `default`: salinan `default`, lalu periksa rentang.
3. Bila `required` true: `missing_value`. Selain itu `null`.

### 5.1 Konversi

| Tipe | Aturan | Galat |
|---|---|---|
| `string` | apa adanya | - |
| `int` | cocok `^[+-]?[0-9]+$`, nilai bilangan bulat aman (mutlak paling besar 9007199254740991) | `invalid_value` |
| `float` | cocok `^[+-]?([0-9]+(\.[0-9]*)?\|\.[0-9]+)([eE][+-]?[0-9]+)?$` dan hasil berhingga | `invalid_value` |
| `bool` | setelah pelipatan huruf ASCII: `true`, `1`, `yes`, `on` menjadi true; `false`, `0`, `no`, `off` menjadi false | `invalid_value` |
| `list` | dipisah `,`; spasi/tab di ujung tiap butir dibuang; butir kosong dibuang | - |
| `json` | JSON RFC 8259 (spasi di ujung diizinkan); semua angka berhingga, tanpa surrogate tunggal, kedalaman paling besar 512 | `invalid_value` |
| `enum` | sama persis dengan salah satu `values` | `invalid_value` |

`-0` pada `int` dan `float` dinormalisasi menjadi `0`. Rentang: bila hasil berupa angka dan kurang dari `min` atau lebih dari `max` (inklusif): `out_of_range`.

Pesan galat MUST tidak memuat nilai yang ditolak.

### 5.2 Explain

`explain` memvalidasi skema dan `env` seperti `resolve`, lalu menghasilkan satu entri per leaf: `{ path, type, env (string atau null), source, value, error }`. Bila resolusi leaf berhasil: `source` adalah `env`, `default`, atau `none`; `value` adalah hasilnya, kecuali `secret` true dan hasil bukan `null`, maka `value` adalah `[secret]`; `error` null. Bila gagal: `value` null, `error` kode galat, `source` adalah `env` bila variabelnya ada, selain itu `default` bila ada default, selain itu `none`. Galat nilai MUST tidak dilempar.

## 6. Merge dan get

`merge(base, override)`: keduanya MUST objek (`invalid_input`). Hasil adalah salinan `base`; untuk setiap kunci `override` menurut urutan: bila nilai di hasil dan di `override` keduanya objek, digabung rekursif; selain itu nilai `override` (termasuk array dan `null`) menggantikan. Kedalaman rekursi lebih dari 64: `too_deep`. Kunci seperti `__proto__` MUST diperlakukan sebagai data biasa.

`get(config, path, fallback?)`: `path` MUST string tidak kosong (selain itu `invalid_path` tanpa `path`); segmen dipisah `.` dan tidak boleh kosong (`invalid_path` dengan `path`). Setiap segmen menunjuk kunci objek, atau indeks array berbentuk desimal kanonik (`0` atau tanpa nol di depan) yang kurang dari panjang array. Bila jalur tidak ada: `fallback` bila diberikan (termasuk `null`), selain itu `missing_value` dengan `path`.

## 7. Serialisasi dan urutan

Urutan properti objek mengikuti ECMA-262: kunci indeks array (string bilangan bulat kanonik 0..4294967294) menaik lebih dulu, lalu kunci lain menurut urutan penyisipan. Angka keluaran mengikuti `Number::toString`.

## 8. Keamanan

- Nilai yang ditolak dan nilai `secret` MUST tidak muncul di pesan galat; `explain` MUST menyamarkan nilai `secret`.
- Kunci `__proto__`, `constructor`, dan sejenisnya MUST menjadi properti data biasa; implementasi MUST tidak mengubah prototipe objek mana pun.
- Rekursi skema dan merge dibatasi 64 tingkat; parser JSON dibatasi 512 tingkat.
- Masukan apa pun MUST menghasilkan hasil atau galat dengan `code` pada bagian 9; panic atau pengecualian lain adalah bug.

## 9. Galat

| `code` | Kondisi | `messageId` |
|---|---|---|
| `invalid_dotenv` | teks dotenv tidak sah (dengan `line`) | `lombokconfig.error.invalid_dotenv` |
| `invalid_schema` | skema tidak sah (dengan `path`) | `lombokconfig.error.invalid_schema` |
| `invalid_value` | konversi gagal (dengan `path`) | `lombokconfig.error.invalid_value` |
| `missing_value` | field wajib atau jalur `get` tidak ada (dengan `path`) | `lombokconfig.error.missing_value` |
| `out_of_range` | di luar `min`..`max` (dengan `path`) | `lombokconfig.error.out_of_range` |
| `invalid_input` | argumen bukan bentuk yang diminta | `lombokconfig.error.invalid_input` |
| `invalid_path` | jalur `get` tidak sah | `lombokconfig.error.invalid_path` |
| `too_deep` | kedalaman lebih dari 64 | `lombokconfig.error.too_deep` |

## 10. Non-goals (0.1.0)

Membaca berkas atau lingkungan proses, YAML, TOML, INI, substitusi perintah dan `$NAME` tanpa kurung kurawal di dotenv, hot reload, dan validasi lintas field.

## 11. Riwayat perubahan kontrak

| Versi | Perubahan |
|---|---|
| 0.1.0 | Kontrak awal |
