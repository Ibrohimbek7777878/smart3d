# TZ-11 — Stanok fayllarini haqiqiy stanokka moslash

**Sana:** 2026-10-15 · **Navbat:** 11 · **Holat:** MA'LUMOT KUTILMOQDA — D7 (serverdan namuna fayllar) va Q7 (stanok modellari).
**Bog'liq:** TZ-01, TZ-06.

## Muammo (tekshirilgan, `app/js/engine/cnc.js`)
| # | Muammo | Joyi |
|---|---|---|
| C2 | G-code kesish chuqurligi doim 16 mm — 18 mm plita oxirigacha kesilmaydi | `cnc.js:289` |
| C3 | Detallar orasidagi tirqish arra uchun 4 mm, freza esa Ø6 — qo'shni detalga kirib ketadi | nesting + cnc |
| C4 | Biesse (.cix) va Homag (.mpr) — loyiha emas, "Sample_Panel" | `cnc.js:761` |
| C5 | Hamma teshik bitta Ø6 freza bilan; burg'ilash sikli yo'q; yon teshik yuza teshigi deb chiqadi | `cnc.js` |
| C8 | G-code: G54/G43 yo'q, bir o'tishda to'liq chuqurlik, kirish rampasi yo'q | `cnc.js` |
| C9 | Har stanok uchun alohida post-protsessor tuzilmasi yo'q | — |

## Bajariladigan ishlar
1. **Serverdan namunalarni o'rganish** — serverdagi haqiqiy fayllar:
   - Homag `.LC4`, Altendorf `.gibcut`, Rover `.tap`, GibLab `.project`;
   - formatini, o'lchov birligini, sarlavhasini va kesim tartibini aniqlash.
2. **Post-protsessorlar:** `app/js/engine/post/<stanok>.js` — har stanok alohida fayl (C9):
   - avval sexda borlari (Q7) — Altendorf, Homag (Holzma), Rover;
   - Biesse va Homag WoodWOP sexda bo'lsagina.
3. **G-code tuzatishlari:**
   - chuqurlik = plita qalinligi + "o'tib kesish" (sex parametri);
   - bir necha o'tish;
   - G54/G43;
   - kirish rampasi;
   - CNC rejimida detallar orasidagi tirqish ≥ freza diametri.
4. **Teshik sikllari:** diametr bo'yicha asbob; yon teshiklar alohida (TZ-06 teshiklari asosida).
5. **Birinchi sinov (C10):** 1 ta arzon detalda sexda kesish, texnolog tasdig'i. Tasdiqlangan stanok faylidan `SINOV` belgisi olinadi.

## Tegadigan fayllar
- `app/js/engine/cnc.js`, yangi `app/js/engine/post/*`
- `app/js/app.js`, `app/index.html` (TZ-01 da yashirilgan tugmalar qaytadi)
- testlar: namunalar bilan solishtirish

## Xavf, moliya, orqaga qaytarish
- **Xavf: YUQORI** — stanok va plita.
  - Texnolog tasdig'igacha hamma fayl `SINOV`.
  - Sinov faqat arzon detalda, egasining ruxsati bilan (5.1).
- **Moliya:** noto'g'ri kesim — plita isrofi. Shuning uchun bosqichma-bosqich sinov.
- **Orqaga qaytarish:** har stanok alohida commit.

## Egasining javobi (2026-10-15)
- **Sexda:** Altendorf (formatli arra), Homag / Holzma (arra markazi), Biesse Rover (CNC), kromka va prisadka stanoklari.
- **Namunalar:**
  - Altendorf `.gibcut`, Homag `.LC4`, Rover `.tap` — serverda;
  - kromka va prisadka — sexdagi kompyuterlarda.

## Egasidan kerak
- **D7** — serverdagi namuna fayllar. Server agenti uchun matn tayyor.
- **Q7** — stanok turlari aytildi (4 tur). Post-protsessor uchun aniq model nomlari ham kerak bo'ladi — namuna fayllarning sarlavhasidan ham aniqlash mumkin.
- Texnolog bilan sinov kuni.

## Qabul
- Har stanok fayli namuna bilan formati bo'yicha bir xil.
- Sinov detali to'g'ri kesildi; texnolog tasdiqladi.
