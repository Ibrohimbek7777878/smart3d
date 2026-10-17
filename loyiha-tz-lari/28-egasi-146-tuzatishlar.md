# TZ-28 — Shkaf prompti, material tanlash, 3D zoom, list ko'rsatkichi, 123 modul va Bazis o'lchovi

**Sana:** 2026-10-17 · **Navbat:** 28 · **Holat:** BAJARILDI 2026-10-17 (jamoa; `dizayn` 5a1908f; egasi #149: "shu qismlarni to'g'irla … o'rtacha 1 soatda", #150: talqinlar tasdiqlandi)

**Asos — egasi #149, 3 ta skrinshot bilan:**
- standart xona kichkina;
- modulda rang va material tanlash tushunarsiz;
- yaqinlashtirish va uzoqlashtirish juda tez va sifatsiz;
- orqadagi material ro'yxatdanmi;
- "4 list, 9 m²" xaotik;
- shkaf prompti natija bermadi;
- zapchast narxi aniq bo'lsin;
- 120 modul to'liq ishlasin va narxi Bazis bilan bir xil bo'lsin.

## 1. Jamoa va natija (koordinator tartibi, #143)

| Agent (model, deadline) | Holat | Natija | Commit |
|---|---|---|---|
| Backend · AI prompt (Opus, 14:00) | BAJARILDI | Egasining prompti (imlo xatolari bilan) aynan quriladi: 1200×580×2100, sokol, orqa HDF polgacha. Chapda 1000 mm kiyim joyi + shtanga + ustida/ostida polka, o'ngda 6 teng polka. Korpus/polka — ERP «Кашемир 16мм», fasad — «Дуб Золотой 16мм». Konfirmat, polkaderjatel, `RU-1000`. OBJ savolsiz yuklanadi. Rus va xatosiz variantlar ham ishlaydi. | d900df1 |
| Frontend · Material tanlash (Sonnet, 13:35) | BAJARILDI (ko'rinish — egasi tasdig'iga) | Rang plitkalari (1281 plita → 1097 dekor), rang oilasi doiralari, qidiruv, "Filtr" (tur, qalinlik), doira "Faqat shu modul / Butun loyiha", "Tanlandi" qatori. Orqa devor uchun ham ERP ro'yxati. | f53c7a7 |
| Frontend · 3D yaqinlashtirish (Sonnet, 13:35) | BAJARILDI | Silliq g'ildirak (qadam ~11%, bir hodisada ≤ 18%, jami ≤ 45%), kursorga zoom, `+`/`−`, sahnaga mos chegara, adaptiv near/far, anisotropiya 8. `OrbitControls` da 1 qator (DPR xatosi). | 536c417 |
| Backend · Zapchast va list (Sonnet, 13:35) | A BAJARILDI, B — taklif | **A.** "9 m²" — detal maydoni, list maydoni emas; hisob xatosi yo'q. Narx panelida material bo'yicha "N list · M m² ishlatildi · to'lish P%". **B.** 85 umumiy modul zapchastlari uchun katalog taklifi (12 kod) — `agent/narx` 393e654, egasi tasdig'ini kutmoqda. | 52c3019 (A) |
| Test · 120 modul va Bazis (Sonnet, 13:35) | O'lchov | 123 modul: xato 0; 69 tasi to'liq narxli, 54 tasida narxsiz furnitura bor. 38 MC modul Bazis asli bilan: detallar 99%, maydon 99,8%, **narx 97,7%** (36/38 ≥ 95%), furnitura ro'yxati 85%, teshik 83%, kromka 63%. | — |
| Test · Yakuniy (Sonnet, 13:45) | O'TDI | Node yashil, server 73/73, web 27 to'plam yashil; AI prompti mustaqil tekshirildi (ustma-ust 0, kiyim joyi aynan 1000 mm). | — |

- **Egasi #150 da tasdiqladi:**
  - "1 metr" — kiyim joyi balandligi;
  - kiyim joyi o'rtada;
  - "bakavina" — yon devor, orqa HDF ham polgacha;
  - `RU-1000` → 90001991 «0351- 1000 MM QORA» 45 000 (5a1908f).

## 2. Egasining savollariga javob
- **Bazis'da standart xona:** Bazis-Mebelshik buyum o'lchamidan boshlanadi, majburiy xona yo'q. Bizda 3600×3000×2700 (#134). Yangi o'lcham — egasidan.
- **Orqadagi material:** sukut materiallar (LDSP18, LDSP16, MDF16, HDF3 "orqa devor") ERP ro'yxatidan emas — umumiy, `price_src` yo'q. Faqat qo'lda tanlangan material ERP'dan.

## 3. Ochiq savollar (egasi)
1. Yangi material oynasi ko'rinishi (`tests/ui/out/web/material-keyin-*.png`) ma'qulmi?
2. Zapchast takliflari (`agent/narx` 393e654) va nojka 90 mm → 100 mm li NOSHKA.
3. Sukut materiallar: korpus, orqa, fasad — ERP'dagi qaysilar?
4. Standart xona o'lchami.
5. Kromka: Bazis faylidagi (8 modulda umuman yo'q, qolganida kam) yoki bizning formula (sex standarti)?
6. Sukut LDSP18 ning hamma list o'lchamiga bir xil narx yozilgan (580 650) — ERP narxiga o'tkazish.

## 4. Qolgan cheklovlar
- Uzun ruchka teshik oralig'i — mahsulot tanlangach.
- OBJ butun loyihani chiqaradi.
- Narx panelidagi yangi plita qatori uchun UI testi va skrinshot yo'q (kodda tekshirilgan).
- Zoom haqiqiy trackpad va sensorli ekranda qo'lda sinalmagan.
- 85 umumiy modulda Bazis asli yo'q — 15 tasini usta Bazis'da chizishi tavsiya qilindi.
