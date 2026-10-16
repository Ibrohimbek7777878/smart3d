# TZ-17 — Bazis BPJ faylini to'liq va ishonchli qilish

**Sana:** 2026-10-15 · **Navbat:** 17 · **Holat:** BAJARILDI 2026-10-16 (`dizayn` tarmog'i; egasi: "bunga ruxsat beraman, buni tugat") — real Bazis sinovi kutilmoqda ([BPJ-SINOV-YORIQNOMA.md](../BPJ-SINOV-YORIQNOMA.md)); SINOV belgisi undan keyin olinadi
**Asos:** egasi (2026-10-15): "bpj ni davom ettir". Qoida S5 BPJ uchun olib tashlandi.
**Bog'liq:** TZ-01 (BPJ SINOV belgisi), TZ-06 (teshiklar Bazis faylidan), TZ-05 (umumiy modullar geometriyasi, pauza), TZ-09 (Q3, Q5).

---

## BPJ nima (tekshirilgan)
- BPJ — Bazis'ning o'z formati emas. U `BazisUniversalExport` skripti (v4.5) Bazis'dan chiqaradigan JSON fayl (format 4.2).
- Bazis'ga qaytarib kiritish — `BazisUniversalImport.js` (v4.18) skripti bilan.
- ERP'da o'qish — `widget_bazis/bpj_parser.py`.
- **Lokal manbalar** (faqat o'qiladi, qoida 2.10):
  - `mebelcity-platform/1.bpj` — haqiqiy eksport: 125 panel, 3 material;
  - `mebelcity-platform/widget_bazis/static/widget_bazis/viewer/bazis/BazisUniversalImport.js` — import skripti;
  - `mebelcity-platform/widget_bazis/bpj_parser.py` — ERP o'quvchisi.

## Hozirgi holat (tekshirilgan)
- `app/js/engine/bpj.js` fayl yaratadi. `tests/verify.mjs [6]` tekshiradi: JSON, material, joy, teshiklar, kesim o'lchami.
- **Muammolar:**
  1. **117 paneldan 31 tasi (26%) joyini 3D modeldan olmaydi.** Bu 3D modelda yo'q panellar (planka, tortma qismlari va boshqalar) — ular navbat bilan qo'yiladi va Bazis'da noto'g'ri joyda chiqadi.
  2. Haqiqiy Bazis'ga hech qachon import qilinmagan.
  3. Import skripti o'qiydigan maydonlar bilan to'liq solishtirilmagan.
  4. 83 ta umumiy modul geometriyasida xato bor (TZ-05, pauza) — bu BPJ ga ham o'tadi.

## Bajariladigan ishlar
1. **Format tekshiruvi.** Yangi `tests/bpj_check.mjs`: bizning fayl va `1.bpj` maydonma-maydon solishtiriladi — bo'limlar, majburiy maydonlar, turlar.
2. **Import skripti talablari.** `BazisUniversalImport.js` qaysi maydonlarni o'qishi ro'yxat qilinadi: `transform`, `contour`, `butts`, `holes`, `plastics`, `boundingBox`, `material`, `isOval` va boshqalar. Bizning fayl har birini to'g'ri berishi tekshiriladi.
3. **"Bazis taqlidi" testi** — `tests/bpj_import_mock.mjs`:
   - import skripti Node'da soxta Bazis funksiyalari bilan ishga tushiriladi; skriptning o'zi o'zgartirilmaydi;
   - har panel qayerga va qanday burilish bilan qo'yilishi olinadi va bizning 3D model bilan solishtiriladi: joy farqi ≤ 0.5 mm, burchak aniq;
   - skript taqlid qilib bo'lmaydigan Bazis funksiyasini ishlatsa — sizga aytiladi, shu qism faqat real Bazis'da tekshiriladi.
4. **26% muammosini yo'qotish.** 3D modelda yo'q panellarning joyi modul ma'lumotidan hisoblanadi. TZ-09 Q5 da qo'shiladigan tortma shu yerda ham ishlatiladi.
   - Maqsad: 38 ta MebelCity modulida panellarning **100%** to'g'ri joyda.
   - 83 ta umumiy modul — TZ-05 tugaguncha BPJ da "geometriya tekshirilmagan" ogohlantirishi bilan.
5. **ERP o'quvchisi bilan tekshiruv.** `bpj_parser.py` faylimizni xatosiz o'qiydi; detal soni, o'lchami va materiali bizning kesim ro'yxati bilan bir xil.
6. **Real sinov yo'riqnomasi** — yangi `BPJ-SINOV-YORIQNOMA.md`, qadamma-qadam:
   - Bazis'da `BazisUniversalImport.js` ni ishga tushirish;
   - avval 1 ta modul (MC-KP-02), keyin namuna oshxona;
   - nimani tekshirish va qanday skrinshot yuborish.
7. **Real sinov natijasi bo'yicha tuzatish.** Siz yoki bazischi tasdiqlagach, BPJ dan SINOV belgisi olinadi va ustalarga ochiladi.

## Tegadigan fayllar
- `app/js/engine/bpj.js`.
- `app/js/engine/assembler.js` — faqat panel joy ma'lumoti; TZ-09 Q5 bilan kelishilgan holda.
- Yangi: `tests/bpj_check.mjs`, `tests/bpj_import_mock.mjs`; `tests/run-all.sh` ga qo'shiladi.
- Yangi: `BPJ-SINOV-YORIQNOMA.md`.
- `mebelcity-platform/*` — faqat o'qiladi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Noto'g'ri BPJ Bazis'da noto'g'ri model beradi; undan kesilsa — noto'g'ri detal chiqadi.
  - Tasdiqlanmaguncha BPJ SINOV belgisi bilan va faqat admin uchun.
  - Taqlid testi; real sinov avval bitta modulda.
- **Moliya:** narx va smetaga tegilmaydi — BPJ faqat fayl. SINOV davrida BPJ dan kesilmaydi.
- **Orqaga qaytarish:** `git revert`; kerak bo'lsa BPJ tugmasi yana yashiriladi.

## Navbat
- TZ-09 bilan parallel bajarilishi mumkin (bu frontend emas).
- `assembler.js` dagi o'zgarish TZ-09 Q5 bilan bitta joyda qilinadi — ikki marta yozilmaydi.

## Egasidan kerak
1. **Real sinov uchun:** Bazis o'rnatilgan kompyuter va unda `BazisUniversalImport.js` (v4.18) — bormi? Natijani skrinshot bilan yuborasiz.
2. **Ixtiyoriy:** yana 1–2 ta haqiqiy `.bpj` — `serverdan/04_bazis/` ga.
3. **"Boshla".**

## Qabul
- `bpj_check`: `1.bpj` bilan majburiy maydonlarda farq yo'q.
- Taqlid testi: 38 ta MebelCity modulida panellarning 100% to'g'ri joyda va burilishda.
- `bpj_parser.py` xatosiz o'qiydi; detal soni, o'lcham va material kesim ro'yxati bilan bir xil.
- Bazis'da real import: MC-KP-02 va namuna oshxona to'g'ri chiqdi — siz tasdiqlaysiz.
- Barcha testlar yashil.

## Muddat (taxmin)
- Taxminan **2–3 ish kuni** + real sinov kuni. Bu taxmin, aniq hisob emas.

## Natija (2026-10-16, `dizayn` tarmog'i)

**Topilgan asosiy xato — TZ'da yozilganidan jiddiyroq.** Eski BPJ real Bazis'da buzuq model berardi:
- balandlik Bazis'ning Z (chuqurlik) o'qiga yozilardi — model "chalqancha yotib" chiqardi;
- barcha panellarga bir xil o'qlar berilardi — yon devor, polka va orqa devor bir xil yotardi;
- `origin` panel markazida edi, Bazis esa kontur burchagini kutadi.

Bundan tashqari MebelCity'ning 38 modulida 612 paneldan 406 tasi (66%, TZ'da 26% deb yozilgan) joyini olmasdi. Sababi: 3D model bu modullarni yaxlit quti qilib chizadi.

| Ish | Natija |
|---|---|
| 1. Format | `tests/bpj_check.mjs`: haqiqiy `1.bpj` dagi 11 bo'lim va obyektning 19 maydoni bizda bor, turi bir xil. `dl/dw` — haqiqiy fayldagidek geometrik (tayyor) o'lcham; kesim o'lchami `userProps.smart3d_kesim` da |
| 2. Import skripti talablari | Skript o'qiydigan har maydon (`transform`, `contour`, `butts` elemIndex 0–3, `holes` x/y/z, `boundingBox`, `material`, `isOval` …) bor va to'g'ri. O'qlar birlik, o'ng qo'l; bbox transform bilan bir xil (skriptning ikkala usuli bir joyni beradi). Kromka F qirrasi modul oldida (0/90/180/270°) |
| 3. Bazis taqlidi | `tests/bpj_import_mock.mjs`: skript (o'zgartirilmagan) Node'da soxta Bazis bilan ishlaydi. **38 MC modul — 612/612 panel asl Bazis faylidagi joyida (≤ 0.5 mm)**. Konstruktor oshxonalari (I/L/U, 0°/90°/270°) — har panel modul izida, fasadlar xona tomonda |
| 4. Joy manbasi | MC — Bazis faylidan joy formulalari (`scripts/fr3d_import.py` → `parts[].joy`, `app/js/engine/joy.js`). Modul cho'zilsa ham to'g'ri yuradi: detal yaqin chetga bog'lanadi, tortma/eshik bloki birga siljiydi. Standart o'lchamda 396/396 formula Bazis bilan aynan. Joysiz panel: **MC 406 → 0**. Umumiy modullar: 171/599 (29%) navbat bilan, "geometriya tekshirilmagan" ogohlantirishi bilan (TZ-05 gacha) |
| 5. ERP o'quvchisi | `bpj_parser.py` (faqat o'qiladi) xatosiz o'qiydi. Detal soni, o'lcham × qalinlik × material kesim ro'yxati bilan bir xil. BOM va obyekt nomi bir xil (ERP ularni nom bo'yicha bog'laydi) |
| 6. Yo'riqnoma | [BPJ-SINOV-YORIQNOMA.md](../BPJ-SINOV-YORIQNOMA.md) — 1 modul (kutilgan o'lchamlar jadvali bilan) va L-oshxona; taqlid tekshira olmaydigan 3 taxmin (A, B, C) |
| 7. Real sinov | **egasi / bazischi** — yo'riqnoma bo'yicha |

**Yo'lda tuzatilgan boshqa xatolar:**
1. MC modullarida BPJ'da kromka yo'q edi — endi kromka kesim ro'yxatidan olinadi. MC-KP-02 da 0 → 15.
2. Teshikka `z` qo'shildi (orqa yuz) — import skripti `face` maydonini o'qimaydi.

**Egasi va texnolog uchun savollar:**
- **Sokol ikki marta, stoleshnitsa past.** MC pastki shkaflari Bazis'da 100 mm oyoqda, sokol modulning o'z detali (Фронтальная). Smart3D konstruktori modulni polga qo'yadi va qatorga alohida "Sokol planka" qo'shadi. Natijada:
  - sokol kesim ro'yxatida ikki marta chiqadi — 4 modulli oshxonada 2200 + 2400 mm;
  - stoleshnitsa 726 mm da (Bazis dizaynida taxminan 834 mm).

  Taklif: MC pastki modullari z = 100 da turadi, qatordagi alohida sokol MC uchun o'chiriladi. Bu narx va 3D ga tegadi, shuning uchun ruxsat kerak.
- **Polka qalinligi.** Smart3D'da MC polkasi 18 mm, Bazis'da 16 mm (48 panel). Qaysi biri to'g'ri?
- **Egri konturli panellar** (krovat bosh qismi va boshqalar) BPJ'ga to'rtburchak (gabarit) bo'lib chiqadi — Smart3D kesim ro'yxatida kontur yo'q. Ularni kesish uchun Bazis fayli kerak.
