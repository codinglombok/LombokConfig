# Kebijakan Keamanan

## Versi yang didukung

| Versi | Dukungan |
|---|---|
| 0.1.x | Perbaikan keamanan |

## Melaporkan kerentanan

Gunakan **GitHub Private Vulnerability Reporting** pada repo ini (tab Security, "Report a vulnerability"). Jangan membuka issue publik untuk kerentanan.

- Respons awal: paling lama 48 jam.
- Perbaikan untuk temuan kritis: target 7 hari.
- Pengungkapan dikoordinasikan dengan pelapor.

## Cakupan

Dalam cakupan: parser dotenv, resolusi skema, dan penggabungan (`parseDotenv`, `resolve`, `merge`), khususnya cara apa pun agar nilai rahasia bocor ke pesan galat, interpolasi melewati batas kedalaman, atau masukan menyebabkan panic, crash, atau waktu eksekusi tak terbatas.

Di luar cakupan: cara aplikasi membaca berkas dan variabel lingkungan dari sistem operasi, serta penyimpanan rahasia.

## Model ancaman ringkas

Lihat bagian Keamanan pada `docs/SPEC_LombokConfig_v0.1.0.md`.
