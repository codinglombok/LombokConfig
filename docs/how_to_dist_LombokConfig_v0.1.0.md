# How To Dist LombokConfig v0.1.0

## 1. Upload pertama (bootstrap)

Repo `codinglombok/LombokConfig` sudah dibuat kosong. Dari folder lokal berisi proyek ini:

```powershell
git init -b main
git add -A
git status            # periksa: docs/*architecture*, docs/*masterplan*, node_modules, target TIDAK ikut
git commit -m "feat: LombokConfig v0.1.0"
git remote add origin https://github.com/codinglombok/LombokConfig.git
git push -u origin main
gh repo edit codinglombok/LombokConfig --add-topic lombok-ecosystem --add-topic level-l0 --add-topic config --add-topic dotenv --add-topic rust --add-topic typescript --description "Typed configuration core: dotenv parsing, schema-driven resolution with strict casts, deep merge and dotted-path lookup. Part of the Lombok Ecosystem."
```

Jangan membuat tag rilis pada tahap ini; lihat syarat di `TECH_DEBT.md`.

## 2. Alur rilis reguler

Target (ADR-011): release-please membuka PR rilis; merge PR membuat tag `vX.Y.Z`; publish membaca versi dari tag. Reusable workflow `codinglombok/.github` belum ada (TD-P0-08), sehingga `ci.yml` repo ini mandiri sementara.

## 3. Publish per registry

| Registry | Paket | Pemeriksaan pra-publish |
|---|---|---|
| npm | `lombokconfig` | `cd typescript && npm pack --dry-run` (lulus lokal); publish dengan `--provenance` |
| crates.io | `lombokconfig` | `cd rust && cargo publish --dry-run` (lulus lokal) |
| PyPI, Packagist, Go, Maven, NuGet | belum ada port | - |

Urutan: tag, CI hijau, `npm publish --provenance --access public`, `cargo publish`.

## 4-7. Server, Docker, shared hosting, lokal

Library tidak dideploy. Pemakaian lokal: `npm install ./typescript` atau `cargo add --path rust`.

## 8. Verifikasi

`lombok doctor docs` belum tersedia. Pemeriksaan manual setara (juga dijalankan otomatis oleh `typescript/test/docs.test.ts`):

```powershell
(Get-FileHash vectors\lombokconfig-vectors-v1.json -Algorithm SHA256).Hash   # harus sama dengan hash di SPEC_
git ls-files | Select-String 'architecture|masterplan'   # harus kosong (ADR-024)
```
