# TZ-20 — Narx faqat bizning ma'lumotdan (admin "Narxlar" sahifasi)

**Sana:** 2026-10-16 · **Navbat:** 20 · **Holat:** 1-BOSQICH BAJARILDI 2026-10-17 (egasi #143: "tasdiqlayman"; jamoa — `dizayn` ebbefdb). Narx stavkalari egasi javobini kutmoqda
**Asos:** egasi (2026-10-16, muharrir skrinshoti bilan): "bu yerdagi narx bizning datalar asosida chiqarib berish kerak".
**Bog'liq:** TZ-04 (narx jadvali + import vositasi), TZ-14 (admin sahifa namunasi), TZ-21 (Bazis faylidan smeta shu narxlardan oladi).

## 2026-10-17 — qayta ko'rib chiqish (#138: narx kamida 95% aniq)

### O'lchov: 22 ta haqiqiy buyurtma (sexning GibLab natijasi bor)
Bazis fayli → bizning kesim va raskroy ↔ sex GibLab'da kesgani. Sex kesgan materiallar: korpus LDSP va HDF. Fasad (MDF, akril) va stoleshnitsa sexda kesilmaydi, ular GibLab'da yo'q.

| Nima | Biz | Sex | Xulosa |
|---|---|---|---|
| Kromka, metr | Bazis va GibLab bir versiya bo'lgan 8 buyurtmadan 6 tasida ±1% | — | ✅ aniq |
| LDSP listlari — o'sha 8 buyurtma (detal maydoni ±6% bir xil) | 34 list | 23,5 list | ❌ biz +44% |
| Teshiklar (prisadka) — Bazis faylidan ochilgan loyiha | 0 | 22 buyurtmada 10 674 ta | ❌ narxga kirmaydi |
| Furnitura | 67 tur ERP'ga bog'lanmagan | — | ❌ narxga kirmaydi |
| Raspil, kromka urish, prisadka stavkasi | kodda taxmin | sexning xizmat narxlari bor (paket `04_xizmat_narxlari`) | ❌ almashtiriladi |

**Eng katta xato — listlar soni.** Bitta list LDSP — bir necha yuz ming so'm, shuning uchun bitta ortiqcha list narxni sezilarli buzadi. Sabablari (tekshirilgan):
1. **Arra qalinligi (4 mm) har detaldan keyin qo'shiladi.** Faqat detallar orasida bo'lishi kerak.
   - Misol, 3646: eni 600 mm li 9 ta detal. 1830 li listning eniga 3 tasi sig'adi (600×3 + 4×2 = 1808 ≤ 1810), lekin bizda faqat 2 tasi sig'yapti.
   - Natija: bizda 5 list, sexda 2 ta. Shu xatoning o'zi tuzatilsa — 3 list.
2. **Tekstura cheklovi oddiy dekorga ham qo'yilgan.** "Белый гладкий"da yo'nalish yo'q, sex detallarni aylantiradi.
3. **List formati.** Sex 2750×1830 (5,0325) ishlatgan, Bazis'da 2500×1830 (4,575) yozilgan. Bizda Bazis'dagisi olinadi.
4. **Sex qoldiqdan ham kesadi.** Masalan 4034 da 10 ta qoldiq bo'lagi ishlatilgan.
5. **Joylashtirish algoritmi GibLab'dan kuchsizroq.** Sexda listning to'lishi o'rtacha 85–93%.

### Narx manbalari (paket 2026-10-16 — endi bor)
- **Raspil, list boshiga:** Altendorf 1/2/3 = 18 000 / 33 000 / 38 000; Holzma 1/2/3 = 25 000 / 43 000 / 48 000. Stoleshnitsa — 10 000.
- **Kromka urish, metr boshiga (lenta bilan):** ПВХ 19/1 прямая 4 000, 19/2 прямая 4 900, 21/04 прямая 3 300, 21/1 глянцевая прямая 4 800 va boshqalar (150 qator).
  - "Ташкаридан" — arzonroq, "овальная" — qimmatroq.
- **Prisadka, dona boshiga:** ЕВРО 1 600, ЕВРО 2 1 200, ПЕТЛЕ 900, ПОЛКАДЕРЖАТЕЛ 800, РУЧКА 800, ШКАНТ 800, ЭКСЦЕНТРИК 1 400, МЕТКА 300, Паз 4 000.
- **Plita** — ERP katalogi. **Furnitura** — `Materiallar_va_narxlar.xlsx`: 3 140 qator, 1 019 tasida narx bor.
- **Paketda yo'q:**
  - yig'ish (ish haqi) — sex xizmatlarida yo'q;
  - ustama foizi.

### Bajariladigan ishlar (yangi tartib)
1. **Raskroy:**
   - arra qalinligi faqat detallar orasida;
   - oddiy dekor aylantiriladi, yo'nalish faqat tekstura bo'lsa saqlanadi;
   - shu dekorning ERP'dagi eng mos list formati tanlanadi;
   - bir necha tartibda joylab, eng kam list olinadi.
   - **Maqsad:** 8 ta bir xil versiyali buyurtmada list soni sexdagidan ko'pi bilan +5%.
2. **Xizmat narxlari** — sexning xizmat jadvalidan, qatorida manba va sana: raspil (list boshiga), kromka (lenta turi bo'yicha metr), prisadka (teshik turi bo'yicha dona).
3. **Bazis faylidan ochilgan loyihada teshiklar** Bazis mahkamlagichlaridan hisoblanadi:
   - konfirmat → ЕВРО, petlya → ПЕТЛЕ, polka → ПОЛКАДЕРЖАТЕЛ, shkant, eksentrik;
   - soni sex KDT fayllari bilan solishtiriladi.
4. **Furnitura** — Bazis nomi → ERP mahsuloti. Har biriga 3 ta taklif, admin tasdiqlaydi.
5. **"* to'liq emas" o'rniga "Narx aniqligi X%"** — jami summaning qancha qismi tasdiqlangan manbadan.
6. **Admin "Narxlar" bo'limi** — avvalgi rejadagidek (1-band, pastda).
7. **O'lchov testi** `tests/verify_narx_aniqlik.mjs` (paket bo'lmasa — o'tkazib yuboriladi): har buyurtmada bir xil narx jadvali bilan ikki summa solishtiriladi:
   - bizning miqdorlar;
   - sexning GibLab miqdorlari (list, kromka, teshik).

### Qabul (yangi)
- **22 buyurtmada narx aniqligi:** o'rtacha ≥ 95%, har biri ≥ 90%.
  - Aniqlik = 1 − |biz − sex| / sex.
  - Fasad va stoleshnitsa hisobga olinmaydi — sexda kesilmaydi.
- Narx panelida "Narx aniqligi X%" chiqadi.
- Hamma testlar yashil.

### Xavf va moliya
- **Xavf: O'RTA** — barcha narxlar o'zgaradi.
- Sinov oshxonasida "eski → yangi" ko'rsatiladi, siz tasdiqlaysiz.
- Narx o'ylab topilmaydi (4.3). ERP'ga yozilmaydi. Pul harakati yo'q.

### NARX.pdf (egasi #142, 2026-10-17) — furnitura narxlari
- **Nima bor:** do'kon narx ro'yxati, 1399 pozitsiya (1288 tasida narx): ruchka, petlya, nojka, rolik (yo'naltiruvchi), samorez, aksessuarlar, asboblar.
  - Ustunlar: artikul, nom, qoldiq (ombordagi soni), narx.
  - Birlik yozilmagan.
- **Nima yo'q:** raspil, kromka, prisadka, plita (faqat 1 ta LDSP qatori). Bular paketning xizmat jadvalida bor (yuqorida).
- **Katalogga qo'shildi** (`dizayn` bacccab, `scripts/narx_pdf_import.py`):
  - 288 tasi ERP katalogida bor — narxi aynan bir xil (farq 0);
  - 1111 tasi yangi, 111 tasi narxsiz ("narx yo'q" — o'ylab topilmaydi);
  - jami katalog 3089 ta;
  - qoldiq soni yozilmaydi (ombor ma'lumoti).
- **Modullarga hali bog'lanmagan** — loyiha narxi o'zgarmadi. Modullardagi furnitura nomlari ro'yxatdagi nomlarga to'g'ridan-to'g'ri mos emas, tanlov kerak.

  Taklif (eng ko'p ishlatiladiganlar, so'm):

  | Moduldagi nomi (dona, 38 MC modulda) | Taklif |
  |---|---|
  | Евро 51 Алкан — konfirmat (748) | SAMAREZ YEVRO (ALKAN) 30 000 — ⚠ quti narxi bo'lishi mumkin |
  | samorez 16 mm (220) | SAMOREZ 16 LIK (MEXMASH) 35 000 — ⚠ quti |
  | petle oddiy, Петля прямая (71) | PETLE NS PRIMOY 3 000 (yoki PETLE POL GOR (ODDIY) 2 500) |
  | Петля Samet 90° доводчик (16) | Петля Master накладная, доводчик 11 796 |
  | polkoderjatel nikel (76) | Полкодержатель штифтовой 430 (yoki XITOY OQ 300) |
  | nojka nikel 100 mm (48) | NOSHKA 10 LIK 3 500 (yoki Кухонная ножка 10–15 см 6 200) |
  | Ручка 160 мм (46) | 0351 -160- MATOVIY 16 000 (arzoni: 5006 -160- 9 000) |
  | salazka / napravl. 400 (50) | SAMET SREDNIY 40 SM 36 000 (yoki ROLIK 40 LIK VAKUM 42 000) |
  | Эксцентрик (4) | MSFIX Эксцентрик-дюбель 1 800 |

### 1-bosqich natijasi (2026-10-17, jamoa ishi — egasi #143)
Koordinator vazifani 3 backend agentga bo'ldi, keyin mustaqil testchi tekshirdi. Hammasi `dizayn` da (ebbefdb, push qilindi).

| Agent (model, deadline) | Holat | Natija | Commit |
|---|---|---|---|
| Backend · Furnitura bog'lash (Sonnet, 12:20) | BAJARILDI (1 marta qaytarildi: web ilovaga ulanmagan edi) | `app/data/furnitura-boglash.json` — 12 kod → 7 mahsulot; MC modullari, Bazis importi va web hisob shu jadvaldan; 74 qator narxli bo'ldi | 9279d12, ba62c58 |
| Backend · Bazis teshiklari (Sonnet, 13:20) | QISMAN (1 marta qaytarildi: narx teshiklari stanok ogohlantirishiga tushardi) | `app/js/engine/bazis/teshik.js` — tur bo'yicha soni, 7 buyurtmada KDT bilan: 8 turdan 6 tasi ±10%; shkant −29%, eksentrik +50% (bitta buyurtmaga bog'liq) | 7dfda91, acf6587 |
| Backend · Raskroy (Opus, 13:50) | QISMAN | kerf faqat detallar orasida; oddiy dekor aylanadi (dalil — sex GibLab `txt="false"`); 108 sozlamali joylashtirish. 8 buyurtma LDSP: 34 → 27 (sex 23,5); sex list formatida (2750×1830) 24 — maqsad (≤ 24,7) shu formatda bajarildi | d1d74b6 |
| Test · Narx (Sonnet, 12:50) | O'TDI | node yashil, server 73/73, web 27 to'plam yashil; raskroy geometriyasi 6 buyurtmada xatosiz (ustma-ust 0, kerf buzilishi 0); 3832 — 113–232 ms | — |

- **Sinov oshxonasi** (`scripts/smeta_hisob.mjs`, ebbefdb): tannarx 3 271 549, mijoz narxi 4 416 591, narxsiz qator 5.
  - Furnitura qo'shildi: +furnitura narxi.
  - Raskroy yaxshilandi: −list narxi.
- **Qolgani:**
  - list formati (Bazis yoki sexdagi) — egasi qarori;
  - teshik, raspil, kromka stavkalari — egasi javobi;
  - samorez/konfirmat birligi;
  - "Narx aniqligi X%" (frontend) — stavkalardan keyin.

### Savollar (2026-10-17)
1. **Raspil:** Altendorf / Holzma 1, 2, 3 nimani bildiradi (material turi, qalinlik yoki detal soni)? Usta loyihasiga qaysi biri qo'yiladi?
2. **Kromka (sukut bo'yicha):**
   - korpus — ПВХ 19/1 прямая (4 000/m)?
   - fasad — 21/1 (yoki 22/0,8)?
   - "Ташкаридан" — mijozning o'z lentasi, shundaymi?
3. **List:**
   - material butun list bo'yicha sotiladimi yoki ishlatilgan maydon bo'yicha?
   - qoldiq narxga ta'sir qiladimi?
4. **Yig'ish (ish haqi):** narxga kiradimi? Kirsa — stavka (detal yoki modul boshiga)?
5. **Ustama:** 35% qoladimi?
6. **Furnitura bog'lash** (NARX.pdf, yuqoridagi jadval):
   - takliflar to'g'rimi?
   - samorez va konfirmat narxi necha donaga (quti)?
7. **"Boshla"** — shu tartibda.

---

## Hozirgi holat (tekshirilgan, 2026-10-16)
Sinov oshxonasi: 3 m, 7 modul, `scripts/smeta_hisob.mjs`.

| Qism | Summa, so'm | Manba | Bizniki? |
|---|---|---|---|
| Plita (raskroy bilan, 6 varaq) | 2 280 900 — tannarxning 69% | ERP narx katalogi, 2026-10-13 | ✅ ha |
| Ish haqi | 984 000 — 30% | 12 000 / detal, kamida 40 000 / modul — taxmin | ❌ yo'q |
| Kromka | 61 449 — 2% | 800 / 1 500 / 2 000 so'm/m — taxmin | ❌ yo'q |
| Furnitura | **0** | 10 tur, 193 dona — narxi yo'q (Bazis nomi ERP mahsulotiga bog'lanmagan) | ❌ hisobga kirmaydi |
| Teshik (prisadka) | 0 | usta tanlasa qo'shiladi; 300–1 500 so'm — taxmin | ❌ yo'q |
| Ustama 35% | 1 164 222 | kodda turgan son, egasi aytmagan | ❌ yo'q |

- **Mijoz narxi:** 4 490 571 so'm. Shundan faqat plita (taxminan 51%) bizning ma'lumotdan olinadi.
- Katalog kartalaridagi narx (masalan "~660 582 so'm") ham xuddi shu hisobdan chiqadi. Shuning uchun xato ham bir xil.
- **Furnitura narxga umuman kirmaydi.** Shu sababli narx haqiqiydan past chiqadi.
- **TZ-04 jadvali** (`Smart3D_malumot/narx-toldirish-2026-10-15.xlsx`) hali to'ldirilmagan.

## Topilgan ma'lumot manbalari
1. **ERP narx katalogi (2026-10-13).** Plita va furnitura bor. 184 plita va 187 furnituraning narxi 0.
2. **`data1/NARXLAR.xlsx`.** 2 106 qator: tartib raqami, nom, raqam. 719 qatorda raqam 0. Sarlavha yo'q.
   - ⚠ 3-ustun 1 donaning narxiga o'xshamaydi. Masalan:
     - "Кухонная ножка 10-15 см Черный" — 10 855 951;
     - "Петля Master со встроенным доводчиком" — 7 383 743.
   - Ustun ma'nosi aniqlanmaguncha bu fayl ishlatilmaydi (qoida 4.3).
3. **Kromka, ish haqi, teshik va ustama.** Bizda hech qayerda yo'q. Faqat egasi (yoki texnolog/buxgalter) beradi.

## Bajariladigan ishlar
1. **Admin "Narxlar" bo'limi** — Sozlamalar ichida, faqat admin o'zgartiradi. TZ-14 dagi "Sex standartlari" kabi. Bo'limlar:
   - **Plita:** nom, qalinlik, varaq o'lchami, varaq narxi.
   - **Kromka:** so'm/m.
   - **Furnitura:** dona yoki komplekt narxi.
   - **Ish haqi:** detal boshiga, modul boshiga, prisadka, kromka urish.
   - **Teshiklar.**
   - **Ustama, %.**
   - **Har qatorda:** manba (ERP / egasi / taxmin) va sana.
   - **O'zgarish tarixi:** kim, qachon, eski → yangi.
   - **Bazis zapchastini ERP mahsulotiga bog'lash:** 48 ta zapchast. Har biriga 3 ta taklif chiqadi (TZ-04 dagi bilan bir xil); admin bittasini tanlaydi yoki ID yozadi. Tasdiqlangan bog'lanish narxga darhol tushadi.
2. **Server:**
   - narxlar bazada (DB) saqlanadi;
   - `GET /api/narxlar` — hamma uchun;
   - `PUT /api/narxlar` — faqat admin; har o'zgarish tarixga yoziladi;
   - kiritilgan qiymat tekshiriladi: son, 0 dan katta, aql chegarasida;
   - xato kodlari `S3D-NARX-xxx`.
3. **Fayldan yuklash** — Excel faylini yuklash tugmasi. Avval ko'rib chiqish chiqadi ("eski → yangi", nechta qator o'zgaradi), keyin admin "Saqlash" bosadi.
   - Bo'sh yoki 0 katak hech narsani o'zgartirmaydi.
   - Qabul qilinadigan fayllar:
     - TZ-04 jadvali;
     - ERP katalogining yangi eksporti;
     - `NARXLAR.xlsx` — faqat ustun ma'nosi aniqlangach (Q1).
4. **Hisob faqat shu narxlardan.** Muharrirdagi jami, katalog kartalari, Narx qadami, Excel, PDF hisobot — hammasi bitta manbadan oladi. Narx kodda yozilmaydi.
5. **Narx to'liqligi** — Narx qadamida har qator yonida manba: ERP / egasi / taxmin / narxi yo'q.
   - Taxminiy yoki narxsiz qator bo'lsa, yuqoridagi jami yonida belgi chiqadi (Q3).
   - Bu yangi UI, shuning uchun avval skrinshot bilan tasdiqlanadi (3.3).
6. **Testlar:**
   - server: faqat admin o'zgartira oladi, tarix yoziladi, noto'g'ri qiymat rad etiladi;
   - hisob: o'zgartirilgan narx smetaga o'tadi, sinov oshxonasida eski va yangi narx solishtiriladi;
   - brauzer: admin bo'limi, telefon (390 px) va kompyuter.

## Tegadigan fayllar
- **Server:** `server/index.js` (yangi API), yangi jadval va migratsiya, `server/test/`.
- **Hisob:** narx manbasi `app/data/materials.json` va `furnitura-catalog.json` dan server ma'lumotiga o'tadi.
  - Fayllar zaxira bo'lib qoladi: internet yo'q bo'lsa ham hisob ishlaydi.
- **Web** (`dizayn` tarmog'i):
  - `web/src/features/settings/` — yangi bo'lim;
  - `features/editor/pricing/` — manba belgisi.
- `scripts/narx_import.py` mantig'i serverga ko'chiriladi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Barcha narxlar o'zgaradi. Har saqlashdan oldin "eski → yangi" ko'rsatiladi va sinov oshxonasi solishtiriladi.
- **Moliya:**
  - narx faqat siz kiritgan yoki ERP'dagi qiymatdan olinadi, o'ylab topilmaydi (4.3);
  - ERP'ga hech narsa yozilmaydi (2.10);
  - pul harakati yo'q.
- **Orqaga qaytarish:** narx tarixidan istalgan oldingi holatga qaytarish; kod — `git revert`.

## Egasidan kerak
1. **Q1 — `NARXLAR.xlsx` ning 3-ustuni nima?**
   - variantlar: 1 donaning sotuv narxi, kirim narxi yoki ombordagi jami summa;
   - fayl qaysi ERP hisobotidan olingan?
2. **Q2 — sexdagi haqiqiy stavkalar:**
   - ish haqi: detal yoki modul boshiga, kromka urish, prisadka;
   - kromka metr narxi;
   - ustama foizi.

   Bilmasangiz, kim beradi (texnolog, buxgalter)?
3. **Q3 — narx to'liq bo'lmaganda nima qilinadi?**
   - **A (tavsiya):** narx ko'rinadi, yonida "taxminiy" belgisi va nima yetishmayotgani;
   - **B:** narx yashiriladi.
4. **"Boshla".**

## Qabul
- Narx qadamida "manba: taxmin" yoki "narxi yo'q" qatori qolmaydi — faqat siz kiritmagan qatorlar qoladi va ular aniq ko'rsatiladi.
- Furnitura smetaga kiradi (bog'langan zapchastlar).
- Admin narxni o'zgartiradi → muharrirdagi narx darhol yangilanadi; tarixda yozuv bor.
- Usta narxni o'zgartira olmaydi (server 403 qaytaradi).
- Barcha testlar yashil.

## Muddat (taxmin)
- Taxminan **2 ish kuni**, Q1–Q3 javobidan keyin. Bu taxmin, aniq hisob emas.
