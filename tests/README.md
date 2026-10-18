# Smart3D testlari

| Buyruq | Nima tekshiradi |
|---|---|
| `bash tests/run-all.sh` | Node testlari (11 to'plam): kroy, GibLab, BPJ, AI tahlilchi, poligon xona, oshxona elementlari, GLB, eksportlar, MebelCity modullari, narx jadvali va "taxminiy" belgisi, xizmatlar, Bazis teshiklari, yangi frontend hisob ko'prigi |
| `bash tests/ui/run.sh` | Brauzer testlari: 7 qurilma, teginish, oynalar, smeta, MC modullari, eksport. Natija: `tests/ui/out/` (yoki `QA_OUT=...`) |
| `bash tests/ui/dizayn.sh` | TZ-09: yangi frontend (`web/`) tasdiqlangan dizayn bilan pikselma-piksel bir xilmi — sayt va ilova, 1440 va 390 px (3D maydonlar chetlab). Farq bo'lsa `tests/ui/out/dizayn/yonma-*.png` |
| `bash tests/ui/hisob_teng.sh` | TZ-09: yangi frontend hisobi eski sayt bilan aynan bir xilmi — 6 ssenariy (namuna, prisadka, AI U/L, garderob, ERP plita) |
| `bash tests/ui/internetsiz.sh` | TZ-09: yangi frontend internetsiz ochiladimi (sayt, ilova, ma'lumot) |
| `cd server && NODE_ENV=test npm test` | Server: kirish, xavfsizlik, API |
| `node tests/giblab_check.mjs FAYL.project` | Istalgan GibLab `.project` faylini tekshirish |

## GibLab tekshiruvchisi (`giblab_check.mjs`)
- Bittada FMS'dagi `giblab_raskroy.py` (o'qish, qayta kodlash, chizish) mantig'ining Node'dagi aynan nusxasi. Python va `/tmp` kerak emas.
- **Tekshiradi:** round-trip, chizish xatosi, o'lcham (kesim), son (`n_parts`, `usedCount`), ustma-ust, joylashtirilmagan detal.
- **Mos parser bilan solishtirilgan (2026-10-15):**
  - 7 ta haqiqiy GibLab fayl — 7/7 bir xil natija;
  - Smart3D'ning 120 modulli fayli (1 346 detal) — bir xil natija.
- `verify.mjs` ataylab buzilgan fayllar bilan uni sinaydi — detal yo'q, o'lcham farq, joylashtirilmagan.

## Commit oldidan avtomatik
Ixtiyoriy:

    ln -s ../../tests/pre-commit.sh .git/hooks/pre-commit

Repoda `git remote` yo'q — GitHub CI keyin (TZ-10).
