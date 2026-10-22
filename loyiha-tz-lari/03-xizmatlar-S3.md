# TZ-03 — Xizmatlar smetaga avtomatik qo'shilmasin (qoida S3)

**Sana:** 2026-10-15 · **TZ-48 (2026-10-22, egasi #301) bilan SUKUT O'ZGARDI:** prisadka va Bazis xizmati sukutda YOQILGAN, usta narx panelida o'chira oladi (`xizmatlar.teshik === false`, `xizmatlar.bazis === false/null`); quyidagi "standart — belgilanmagan" qoidasi eskirgan, mexanizm (usta tanlovi, `xizmat_taklif` summasi) o'zgarmagan. · **Holat:** BAJARILDI (2026-10-15; egasi tanlovi: "Prisadka tanlanadi, ish haqi o'zi") · **Asos:** `qoidalar_qatiy_amalqilinsin.md`, S3 — "Xizmatlar avtomatik qo'shilmaydi — foydalanuvchi o'zi tanlaydi".

## 0. Hozirgi holat (tekshirilgan)
`productionCost` (`app/js/engine/cutlist.js`) tannarxga ikki xizmatni **so'ramasdan** qo'shadi:

| Xizmat | Qator guruhi | Qanday hisoblanadi | Manba |
|---|---|---|---|
| Teshik burg'ilash (prisadka) | `Xizmatlar` | teshik turi × soni × narx | `materials.json` → `hole_kinds` |
| Kesim + yig'ish ish haqi | `Ish haqi` | max(detal × 12 000, modul × 40 000) — "taxminiy" | `materials.json` → `labor` |

`services.json` (15 ta tarif) ilovaga yuklanadi va Excel'ga uzatiladi, lekin hisobda **ishlatilmaydi**. Bu tariflar tasdiqlanmagan.

## 1. Bajariladigan ishlar
- **X1. Tanlov.** Narx qadamida (hozir "Smeta" tabida) yangi "Xizmatlar" bloki.
  - 2 ta belgi: `☐ Teshik burg'ilash (prisadka)` va `☐ Kesim va yig'ish (ish haqi)`.
  - Har birining yonida hisoblangan miqdori va summasi ko'rinadi — usta qo'shishdan oldin narxni ko'radi.
  - **Standart holat — belgilanmagan** (S3).
- **X2. Hisob.** `productionCost` ga `opt.xizmatlar = { teshik: bool, ish_haqi: bool }` qo'shiladi.
  - Belgilanmagan xizmat tannarxga, mijoz narxiga va modullarga taqsimlashga **kirmaydi**.
  - Uning summasi ma'lumot uchun alohida qaytariladi (`xizmat_taklif`).
- **X3. Saqlash.** Tanlov loyiha hujjatida (`doc.xizmatlar`) saqlanadi va yuklanganda tiklanadi.
- **X4. Eksport.** Excel 4-bo'limi, chop etiladigan hisobot va `smeta.csv` — faqat tanlangan xizmatlar.
  - Hech biri tanlanmagan bo'lsa: "Xizmatlar tanlanmagan" yozuvi chiqadi.
- **X5. Sinov.** Bog'liq testlar yangi qoidaga moslanadi:
  - `verify_f2`, `verify_mc`, `test_all_30`, `tests/qa_f2.mjs`, `tests/ui/phase3.mjs` — xizmatli holat `xizmatlar` yoqilgan holda tekshiriladi;
  - yangi tekshiruvlar: standart holatda xizmat qatori yo'q; belgi qo'yilsa summa aynan avvalgidek; UI = jadval = Excel.

## 2. Keyingi bosqich (bu TZ'ga kirmaydi)
Serverdagi haqiqiy **211 ta xizmat va 423 ta narx** kelgach (pauzadagi ish), `services.json` almashtiriladi va usta ro'yxatdan tanlaydi (kesish, kromka urish, yig'ish, yetkazish…).

## 3. Tegadigan fayllar
- `app/js/engine/cutlist.js` (`productionCost`)
- `app/js/app.js` (blok, holat, saqlash/yuklash)
- `app/index.html` (blok)
- `app/js/engine/xlsxexport.js`
- hisobot (`printReport`, `app.js`)
- testlar (X5)

Server (`server/index.js`) tannarxni hisoblamaydi — tegilmaydi.

## 4. Xavf va moliya
- **Xavf: O'RTA.** Mijoz narxining standart qiymati kamayadi — xizmatlar endi faqat usta belgilaganda qo'shiladi. Usta belgilashni unutsa, kotirovka xizmatsiz chiqadi.
  - Shu sabab blokda doim ko'rinadigan izoh bo'ladi: "Xizmatlar qo'shilmagan — narxga kirmagan".
- **Moliya:** pul harakati yo'q, ERP'ga yozilmaydi. Narx o'ylab topilmaydi — xizmat summasi avvalgi manbadan (`materials.json`) olinadi.
- **Orqaga qaytarish:** alohida commit, `git revert`.

## 5. Egasi hal qiladi (TZ'dan oldin)
1. **Standart holat:** S3 bo'yicha **belgilanmagan** (tavsiya). Yoki "oxirgi tanlovni eslab qolsin"mi?
2. **"Kesim va yig'ish ish haqi"** xizmat hisoblanadimi (tanlanadimi) yoki sexning doimiy xarajati sifatida avtomatik qolsinmi?

## 6. Egasining qarori va natija (2026-10-15)
- **Qaror:**
  - prisadka (teshik burg'ilash, moyka kesimi ham) — usta tanlaydi, boshida belgilanmagan;
  - ish haqi — sexning doimiy xarajati, avtomatik qoladi.
  - Shuning uchun X1–X4 faqat prisadka uchun bajarildi.
- **Dvigatel:** `productionCost(…, { xizmatlar: { teshik } })`.
  - Tanlanmasa: teshik tannarxga, mijoz narxiga va modullarga taqsimlashga kirmaydi.
  - Smetada 0 so'mlik ma'lumot qatori: "Teshik burg'ilash (prisadka) — tanlanmagan: N teshik, X so'm".
  - Summa `xizmat_taklif.teshik` da qaytadi; narxi yo'q moyka kesimi "narx yo'q" ro'yxatiga tushmaydi.
- **Ekran (Smeta):**
  - "Xizmatlar — usta tanlaydi" bloki: belgi, teshik soni va summasi;
  - tanlanmagan bo'lsa ogohlantirish chiqadi;
  - sex tannarxi qatorida "— tanlanmagan" yoki "— taxminiy".
  - Tanlov `doc.xizmatlar` da saqlanadi; katalog narxlari ham shunga qarab hisoblanadi.
- **Excel va hisobot:** qatorlar prod.lines dan olinadi — tanlanmagan bo'lsa ma'lumot qatori chiqadi.
- **Testlar:**
  - yangi `tests/verify_xizmat.mjs` 10/10 — standart holat; tanlanganda farq aynan teshik summasi; taqsimot teng; ish haqi o'zgarmaydi;
  - `verify_f2` va `verify_narx` "prisadka tanlangan" holatda tekshiradi;
  - brauzer `tests/ui/xizmat.mjs`:
    - standart: belgilanmagan, 106 teshik · 75 000 so'm faqat taklif;
    - belgilansa tannarx +75 000;
    - saqlash → qayta yuklash → tanlov saqlangan;
    - belgi olinsa narx qaytadi.
  - Node 9/9, brauzer 9 to'plam yashil; "UI = jadval = Excel" mos.

