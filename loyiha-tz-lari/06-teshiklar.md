# TZ-06 — Modullarga teshiklar (prisadka)

**Sana:** 2026-10-15 · **Navbat:** 6 · **Holat:** QAROR KUTILMOQDA (variant tanlash; B varianti uchun D6 kerak).

## Muammo (tekshirilgan)
- **MebelCity'ning 38 modulida teshik yo'q.** Bazis teshiklari parserda ochilmagan (B3D_PARSER_BILIM 11.5). Shu sababli bu modullarda:
  - prisadka narxi 0;
  - NC va PTP fayllari bo'sh;
  - `holes.json` bo'sh.
- **Umumiy 83 modulda teshiklar shablon** (M4). Holati qayta tekshiriladi.

## Variantlar
- **A. Bazis faylidan o'qish.**
  - O'z dekoderimiz `scripts/` da. `mebelcity-platform` dagi parser faqat o'qiladi, o'zgartirilmaydi.
  - Tadqiqot: 1–2 kun, natija kafolatlanmaydi.
  - Muvaffaqiyatli bo'lsa — teshiklar aynan Bazis'dagidek bo'ladi (eng ishonchli).
- **B. Qoida bo'yicha.** Konfirmat (detal birikmasida), petlya kosasi (eshikda), polka ushlagich (yon devorda).
  - Masofa, diametr va chuqurlik — **faqat sex standartidan (D6)**, o'ylab topilmaydi.
- **Tavsiya:** avval A. Bo'lmasa — B.

## Bajariladigan ishlar (tanlangan variantga ko'ra)
1. Teshiklar `fragments-mc.json` dagi har detalga yoziladi.
   - Koordinata qoidasi mavjud kelishuv bo'yicha: x — en bo'yicha F chetidan, y — uzunlik bo'yicha L chetidan.
2. **Tekshiruv:**
   - har teshik detal ichida;
   - petlya soni eshik soniga mos;
   - zapchast soni teshikka mos (konfirmat soni = teshik soni).
3. **Prisadka narxi** TZ-04 dagi tasdiqlangan stavkadan olinadi.

## Tegadigan fayllar
- `scripts/fr3d_import.py`
- yangi dekoder yoki `scripts/teshik_qoida.py`
- `app/data/fragments-mc.json`
- testlar

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Teshik koordinatasi xato bo'lsa, stanok noto'g'ri teshadi. Shuning uchun stanok fayllari TZ-11 dagi sinovdan (texnolog tasdig'i) oldin `SINOV` belgisida qoladi.
- **Moliya:** prisadka narxi qo'shiladi — faqat tasdiqlangan stavka bilan.
- **Orqaga qaytarish:** `git revert`.

## Egasidan kerak
- Variant tanlash (A yoki B).
- B uchun **D6** — sex konstruktiv standarti: teshik turlari, masofalar, diametrlar.

## Qabul
- 38 modulning har birida teshik bor va hammasi detal ichida.
- Petlya va konfirmat soni zapchast soniga mos.
- Testlar yashil.
