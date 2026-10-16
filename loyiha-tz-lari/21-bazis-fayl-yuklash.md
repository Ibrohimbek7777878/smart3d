# TZ-21 — Saytga Bazis faylini yuklash (.b3d, .fr3d, .bpj)

**Sana:** 2026-10-16 · **Navbat:** 21 · **Holat:** BAJARILDI 2026-10-16 (`dizayn` tarmog'i; egasi: "ruxsat beraman, buni tugat" — tavsiyalar: A, hamma ustalar, xom fayl saqlanmaydi) — yangi UI skrinshot tasdig'i kutilmoqda
**Asos:** egasi (2026-10-16): "sayt Bazis fayllarni ham qabul qilsin".
**Bog'liq:** TZ-20 (smeta narxi), TZ-06 (teshiklar Bazis faylidan), TZ-11 (stanok fayllari), TZ-13 (modullar kutubxonasi), TZ-17 (BPJ eksport).

---

## Hozirgi holat (tekshirilgan, 2026-10-16)
- **Saytda** faqat Smart3D loyiha fayli (`.json`) yuklanadi. Bazis fayli qabul qilinmaydi.
- **Bazis modullari** (38 ta `.fr3d`) hozir faqat qo'lda o'qiladi:
  - `scripts/fr3d_import.py` Python parseri bilan, ERP papkasidan;
  - saytga emas, `app/data/fragments-mc.json` ga yoziladi.
- **ERP'da tayyor JS parser bor:** `mebelcity-platform/client_erp/DOCS/bazis_erp_paket/bazis_bom.js`.
  - Hajmi: 270 qator, brauzerda va Node'da ishlaydi.
  - Hujjatiga ko'ra: 918+ haqiqiy faylda sinalgan; rasmiy BPJ eksporti bilan 77/77 panelning joyi va o'lchami aynan bir xil.
  - Chiqaradi: detallar (o'lcham, material, soni), kromka (m), furnitura, mahkamlagich, panel joyi (3D uchun).
- **Bizning 38 ta `.fr3d` modulda sinaldi** (faqat o'qish; ERP fayllari o'zgarmadi):
  - 38/38 o'qildi, xato 0, shifrlangan 0;
  - 38 fayl jami 0.3 soniyada o'qildi.
- **Parser cheklovlari** (parser hujjatidan):
  - **Shifrlangan fayllar** ("Encrypt=1") o'qilmaydi. Deshifrlash usuli ochilmagan.
  - **Eski Bazis 9/10 fayllari** (taxminan 0.5%) qisman o'qiladi.
  - **Taxminan 3% detal materialsiz chiqadi.** O'lchami va soni to'g'ri, faqat material nomi yo'q.
  - **Teshiklar faylda o'qilmaydi** (THole). Prisadka TZ-06 usulida mahkamlagichlardan hisoblanadi.
  - **Tortma yoki eshik ochiq holatda saqlangan bo'lishi mumkin.** Bu 3D ko'rinishga ta'sir qiladi, smetaga ta'sir qilmaydi.

## Bajariladigan ishlar (taklif — variant A)
1. **Parser loyihaga ko'chiriladi** — `app/js/engine/bazis/` ga, ES modul sifatida. ERP nusxasi o'zgarmaydi (2.10).
   - zlib uchun `pako` 2.1.0 (MIT) qo'shiladi — ERP'da sinalgan bilan aynan bir xil ishlashi uchun.
   - `.bpj` (JSON) uchun alohida o'quvchi. Tekshiruv namunasi — `mebelcity-platform/1.bpj` (125 panel).
2. **Yuklash joyi:** "Loyihalarim" → "Bazis faylini yuklash" tugmasi; faylni sudrab tashlash ham ishlaydi.
   - Fayl **brauzerda** o'qiladi, xom fayl serverga yuborilmaydi. Tez ishlaydi va mijoz fayli begona joyga ketmaydi.
3. **Xavfsizlik:**
   - fayl turi kengaytmasi va ichidagi belgisidan tekshiriladi;
   - hajm chegarasi — 50 MB;
   - ochilgan ma'lumot chegarasi — siqilgan bomba (zip-bomb) himoyasi;
   - o'qish alohida oqimda (Web Worker) va vaqt chegarasi bilan, sahifa qotmaydi.
4. **Natija — "Bazis loyihasi" sahifasi:**
   - **3D ko'rinish:** panellar Bazis'dagi joyida.
   - **Kesim ro'yxati:** detal, o'lcham, soni, material, kromka.
   - **Smeta TZ-20 narxlaridan:**
     - plita raskroy bilan, varaq bo'yicha;
     - kromka metr bo'yicha;
     - furnitura;
     - ish haqi;
     - narxi topilmagan qatorlar alohida ro'yxatda.
   - **Fayllar:**
     - mavjud eksportlar — Excel, Detallar CSV, GibLab, PDF hisobot;
     - stanok fayllariga TZ-11 cheklovlari amal qiladi.
5. **Nomlarni katalogga moslash.** Bazis'dagi material va furnitura nomi bizning mahsulotga bog'lanadi:
   - avtomatik taklif chiqadi, usta yoki admin tasdiqlaydi;
   - tasdiqlangan moslik eslab qolinadi — keyingi fayllarda o'zi tushadi;
   - materialsiz detal uchun usta materialni o'zi tanlaydi.
6. **Saqlash.** Loyiha akkauntga saqlanadi (o'qilgan natija; xom fayl saqlanmaydi — Q6). Server ma'lumotni chuqur tekshiradi (TZ-19 `docXatosi` kabi).
7. **Xatolar.** Shifrlangan, buzilgan yoki noma'lum fayl bo'lsa:
   - foydalanuvchiga tushunarli xabar va kod (`S3D-BAZIS-xxx`) chiqadi;
   - xato jurnalga yoziladi.
8. **Uch til** — yangi matnlar lug'atga qo'shiladi (TZ-18).
9. **Testlar:**
   - 38 ta `.fr3d`: JS natijasi Python parseri natijasi bilan bir xil (detal soni, o'lcham, material);
   - `1.bpj`: 125 panel;
   - buzilgan, bo'sh, katta va soxta fayllar rad etiladi;
   - brauzer testi: yuklash → 3D → smeta → Excel; telefon (390 px) va kompyuter.

## Variantlar (Q4)
- **A (tavsiya).** Bazis fayli → 3D + kesim ro'yxati + smeta + fayllar. Loyiha Smart3D muharririda tahrirlanmaydi; tahrir Bazis'da qilinib, fayl qayta yuklanadi.
- **B.** Bazis loyihasini Smart3D muharririda tahrirlanadigan modullarga aylantirish. Ancha qiyin va ishonchsiz: ixtiyoriy loyihadan modul formulasini tiklab bo'lmaydi (38 ta modulda ham qo'lda tekshirilgan).
- **C (A ga qo'shimcha, 2-bosqich, faqat admin).** `.fr3d` modulni saytdan katalogga qo'shish. Hozirgi `fr3d_import.py` mantig'i saytga ko'chiriladi. TZ-13 dagi 600 modulga yo'l shu.

## Tegadigan fayllar
- **Yangi:** `app/js/engine/bazis/` (parser, BPJ o'quvchi, smeta ko'prigi), `web/src/features/bazis/` (`dizayn` tarmog'i).
- `web/src/features/projects/` — yuklash tugmasi.
- `server/index.js` — loyiha turi "bazis" va uning tekshiruvi.
- `app/js/xatolar.js` — `S3D-BAZIS-*` kodlari.
- `web/package.json` — `pako` (aniq versiya).
- **Testlar:** `tests/verify_bazis.mjs`, `tests/ui/web_bazis.mjs`.
- `mebelcity-platform/*` — faqat o'qiladi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Noto'g'ri o'qilgan fayl noto'g'ri smeta beradi.
  - Smetada "Bazis faylidan" belgisi turadi.
  - O'qilmagan qismlar (materialsiz detal, shifrlangan blok) ochiq ko'rsatiladi, yashirilmaydi.
- **Moliya:**
  - narx faqat TZ-20 manbasidan;
  - pul harakati yo'q;
  - stanok fayllari TZ-11 tugaguncha "SINOV".
- **Orqaga qaytarish:** yangi funksiya alohida — tugma yashiriladi yoki `git revert`. Mavjud loyihalarga tegilmaydi.

## Navbat
- TZ-20 dan keyin yoki u bilan parallel: parser va sahifa TZ-20 ga bog'liq emas. Faqat smeta narxi TZ-20 ga bog'liq.

## Egasidan kerak
1. **Q4 — variant:** A (tavsiya), A + C yoki B?
2. **Q5 — kim yuklay oladi?**
   - **(tavsiya):** barcha ro'yxatdan o'tgan ustalar;
   - **yoki:** faqat admin va bazischi.
3. **Q6 — xom Bazis fayli serverda ham saqlansinmi?**
   - **(tavsiya):** yo'q — faqat o'qilgan natija saqlanadi;
   - **yoki:** ha — ERP'ga yuborish uchun.
4. **Ixtiyoriy:**
   - 2–3 ta haqiqiy `.b3d` loyiha — `serverdan/04_bazis/` ga (mijoz ismi va telefonisiz);
   - shifrlangan fayllar ishlatilsa — bitta loyihani shifrli va shifrsiz saqlab bering.
5. **"Boshla".**

## Qabul
- 38 ta `.fr3d` va `1.bpj` saytda yuklanadi; detal soni, o'lchami va materiali Python parseri bilan bir xil.
- Haqiqiy `.b3d` loyiha yuklanadi: 3D, kesim ro'yxati, smeta va Excel chiqadi — siz tasdiqlaysiz.
- Shifrlangan yoki buzilgan fayl sahifani buzmaydi: xabar va kod chiqadi.
- Konsolda xato yo'q; telefon va kompyuterda ishlaydi.
- Barcha testlar yashil.

## Muddat (taxmin)
- **A:** taxminan **3 ish kuni**.
- **C:** yana taxminan **2 kun**.

Bu taxmin, aniq hisob emas.

## Natija (2026-10-16, `dizayn` tarmog'i, commitlar `8d58221`, `fb92ece`)
| Ish | Natija |
|---|---|
| O'quvchi | `app/js/engine/bazis/b3d.js` — ERP `bazis_bom.js` ko'chirmasi (zlib tashqaridan: brauzerda `pako` 2.1.0, Node'da `zlib`). **94/94 faylda asl bilan aynan** |
| Daraxt | `daraxt.js` — `scripts/bazis_daraxt.py` ko'chirmasi: asosiy model, global joylashuv, amallar tarixisiz. **38/38 MC modulda Python bilan aynan.** Tuzatish: asosiy ro'yxat — eng ko'p panelli (4250 buyurtmada 12 MB mesh ro'yxati "asosiy" deb olinib, 0 panel chiqardi) |
| `.bpj` | `bpj.js` — BazisUniversalExport JSON; `1.bpj`: 125 panel, materiallar BPJ hisobi bilan bir xil (89 / 25 / 11) |
| O'girgich | `loyiha.js`: har dekor alohida material (raskroy alohida listda, list o'lchami nomdan: "5,0325" = 2750×1830 …), kromka tomonlari, furnitura kodi `fr3d_import.py` bilan bir xil (164/164), 3D panellar. Plastik/metall, shisha va materialsiz detallar kesimga kirmaydi — hisobotda ko'rsatiladi |
| Sayt | Loyihalarim → "Bazis faylini yuklash" (.b3d, .fr3d, .bpj) → fayl **brauzerda, alohida oqimda** (50 MB, 40 s chegarasi; xom fayl serverga yuborilmaydi) → yangi loyiha + "Bazis fayli" hisoboti; Mebel qadamida "Bazis hisoboti"; 3D, narx, raskroy, Excel, GibLab — odatdagidek; loyiha saqlanadi va qayta ochiladi. Xato kodlari S3D-BAZIS-101…106 |

**Aniqlik (30 ta haqiqiy buyurtma, `Smart3D_toplam_2026-10-16`):**
- Bazis faylidan chiqqan kesim ro'yxatimizda sexdagi GibLab detallarining **97,7%** i bor (3256 dan 3182), ko'pchilik buyurtmada **100%**.
- Eng pasti — 72% (3276: GibLab ro'yxatida metall/xrom va plastik qismlar bor, Bazis faylida ularning materiali yozilmagan — ular yog'och kesimiga kirmaydi).
- Eng katta fayl (7,5 MB) — 0,37 s.
- Oldingi tekis o'qishda detallar 2,4 baravar ko'p chiqardi (amallar tarixi) — daraxt usuli tuzatdi.

**Testlar:** `verify_bazis` — 30 (mijoz fayllari bo'lmasa o'sha qismlar o'tkazib yuboriladi — CI'da faqat sun'iy namunalar), `web_bazis` (buzilgan fayl, noto'g'ri tur, .bpj, haqiqiy .b3d, hisobot, narx, Excel, saqlash va qayta ochish, telefon), run-all yashil, web 14/14, server 56/56.

**TZ'dan farq va qolganlar:**
- Material va furnitura nomini ERP mahsulotiga avtomatik bog'lash (5-band) — **qilinmadi**: narx TZ-20 da (pauza). Hozir plita narxi turdagi asosiy materialdan olinadi va hisobotda shunday yoziladi.
- Variant C (admin: `.fr3d` ni katalogga qo'shish) — qilinmadi (TZ-13 ga, 150 modul bilan birga).
- Teshiklar Bazis faylidan o'qilmaydi (THole — parser cheklovi). Prisadka — TZ-06/TZ-11 da KDT fayllari bilan.
- Shifrlangan fayllar o'qilmaydi: aniq xabar chiqadi (26 ta fragmentdan 1 tasi shifrlangan).

