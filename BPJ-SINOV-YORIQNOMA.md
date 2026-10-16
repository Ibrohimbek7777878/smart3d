# BPJ real sinov — yo'riqnoma (TZ-17)

**Kim uchun:** Bazis-Mebelshchik bilan ishlaydigan bazischi va loyiha egasi.
**Maqsad:** Smart3D chiqargan `.bpj` faylni Bazis'ga import qilib, model to'g'ri chiqishini tasdiqlash. Tasdiqlansa, BPJ'dan "SINOV" belgisi olinadi va ustalarga ochiladi.
**Vaqt:** taxminan 30–40 daqiqa.

---

## Avval kompyuterda tekshirilgan (taqlid testi)

Import skripti Bazis o'rniga soxta funksiyalar bilan ishga tushirildi (`tests/bpj_import_mock.mjs`). Natija:

- 38 ta MebelCity modulining 612 ta paneli asl Bazis faylidagi joyiga ≤ 0.5 mm aniqlikda tushdi.
- Oshxona (I, L, U shakl; modullar 0°, 90°, 270° burilgan) — har panel o'z modulida turadi, eshiklar xona tomonga qaragan.
- ERP o'quvchisi (`bpj_parser.py`) faylni xatosiz o'qidi. Detal soni, o'lchami va materiali kesim ro'yxati bilan bir xil chiqdi.

**Taqlid tekshira olmaydigan 3 narsa** — buni faqat real Bazis ko'rsatadi:

| № | Taxmin | Noto'g'ri bo'lsa nima ko'rinadi |
|---|---|---|
| A | Panel qalinligi kontur tekisligidan **ichkariga** (lokal +Z) o'sadi | Yon devorlar korpusdan tashqariga 16 mm chiqib turadi; shkaf eni 600 emas, 632 bo'lib qoladi |
| B | `Orient(Z, Y)` panelni aynan berilgan o'qlarga buradi | Panellar yotib qoladi yoki 90° burilib chiqadi |
| C | Teshik `AddHole(x, y, z)`: z = 0 — old yuz, z = qalinlik — orqa yuz | Teshiklar panelning noto'g'ri yuzida bo'ladi |

## Kerakli narsalar

1. Bazis-Mebelshchik o'rnatilgan kompyuter.
2. `BazisUniversalImport.js` (v4.18) — Bazis'ning skriptlar papkasida bo'lishi kerak. Fayl: `mebelcity-platform/widget_bazis/static/widget_bazis/viewer/bazis/BazisUniversalImport.js`.
3. Smart3D'dan ikkita BPJ fayl. Ularni admin akkaunti bilan yuklab olinadi:
   - **1-fayl — bitta modul.** Yangi loyiha → Mebel → **MC · 1 polk 2 fasad** (MC-KP-02) ni qo'shing. O'lchamni o'zgartirmang: 600 × 450 × 708. Keyin Fayllar → **Bazis (BPJ) · SINOV**.
   - **2-fayl — oshxona.** Yangi loyiha → Xona 3600 × 3000 → Mebel → **Avtomatik konstruksiya** → L shakl → Qo'llash. Keyin Fayllar → **Bazis (BPJ) · SINOV**.

## 1-sinov: bitta modul (MC-KP-02)

1. Bazis'da yangi bo'sh model oching.
2. Skriptni ishga tushiring: **BazisUniversalImport.js**.
3. Sozlamalarni standart holatda qoldiring:
   - "Orient(Z,Y) — asosiy usul" — **yoqilgan**;
   - "Korreksiya RotateGCS" — **yoqilgan**;
   - "Mutlaq Translate" — **yoqilgan**;
   - "BBox rejimi" — **o'chiq**.
4. **BPJ Import** tugmasini bosing va 1-faylni tanlang.
5. Oxirida chiqqan oynada quyidagilar bo'lishi kerak:
   - `Panellar: 10 / 10`;
   - `Xato: 0`;
   - `Butts: 15/15`;
   - `Teshiklar: 8/8`.

**Ko'z bilan tekshiring** (Bazis o'qlari: X — o'ngga, Y — yuqoriga, Z — oldga, mm):

| Detal | O'lcham | X | Y | Z |
|---|---|---|---|---|
| bok (yon devor) ×2 | 692 × 450 × 16 | 0…16 va 584…600 | 16…708 | 0…450 |
| pol (tub) | 600 × 450 × 16 | 0…600 | 0…16 | 0…450 |
| planka ×2 | 568 × 80 × 16 | 16…584 | 692…708 | 0…80 va 370…450 |
| polka | 568 × 410 × 18 | 16…584 | 346…364 | 0…410 |
| xdf (orqa devor) | 706 × 598 × 3 | 1…599 | 1…707 | −3…0 |
| Дверь (eshik) ×2 | 704 × 298 × 16 | 1…299 va 301…599 | 1…705 | 450…466 |
| Фронтальная (sokol) | 90 × 600 × 16 | 0…600 | −90…0 | 434…450 |

Shu bilan birga tekshiring:

- [ ] Shkaf tik turibdi: yon devorlar tik, eshiklar oldda (Z tomonda), orqa devor orqada. Bu — **B taxmin**.
- [ ] Umumiy eni aynan **600 mm**. Yon devorlar tashqariga chiqmagan. Bu — **A taxmin**.
- [ ] Kromka yon devor, polka va plankaning **old qirrasida** (eshik tomonda), eshiklarda — 4 tomonda.
- [ ] Teshiklar tub va yon devorlarda yon devor bilan tub uchrashgan joyda. Teshik qaysi yuzada ekanini yozing. Bu — **C taxmin**.
- [ ] Sokol (Фронтальная) tubdan 90 mm pastda. Bu kutilgan holat — quyidagi "Ma'lum holat" ga qarang.

**Solishtirish (ixtiyoriy, eng ishonchli):** asl Bazis faylini `data1/modulniy/modulniy/kuxnya/nijniy korpus/1 polk 2 fasad .fr3d` yonma-yon oching. Detallar tuzilishi bir xil bo'lishi kerak. O'lcham boshqacha bo'ladi: asl fayl 500 × 450 × 500, Smart3D'da sex standarti bo'yicha 600 × 450 × 708.

## 2-sinov: oshxona (L shakl)

1. Yangi bo'sh model oching, 2-faylni xuddi shunday import qiling.
2. Tekshiring:
   - [ ] `Xato: 0`, panellar soni oynadagidek.
   - [ ] Ikki devor bo'yidagi modullar to'g'ri burchak hosil qiladi. Ikkinchi devordagi modullar 90° burilgan va eshiklari xona ichiga qaragan.
   - [ ] Modullar bir-biriga kirib ketmagan, orasida tirqish yo'q (dobor ham joyida).
   - [ ] Ustki shkaflar pastkilar ustida. Balandlik bo'yicha: pastki korpus 0…708, ustki 1450 dan yuqorida.

## Nima yuborasiz

1. Har sinov uchun 3 ta skrinshot: **old ko'rinish**, **yuqoridan**, **izometriya** (3D).
2. Import oxiridagi oynaning skrinshoti (Panellar / Butts / Teshiklar / Xato).
3. Yuqoridagi ro'yxatda belgilanmagan har band uchun bir jumla: nima ko'rindi.
4. Agar model yotib yoki teskari chiqsa — "BBox rejimi" ni yoqib qayta import qiling va ikkala natijani yuboring. Bu xato sababini aniqlashga yordam beradi.

## Keyin nima bo'ladi

- **Hammasi to'g'ri bo'lsa:** BPJ'dan "SINOV" belgisi olinadi va BPJ ustalarga ochiladi (TZ-17 §7).
- **Biror band noto'g'ri bo'lsa:** skrinshot bo'yicha A, B yoki C taxmin tuzatiladi, keyin qayta sinov qilinadi.
- Sinov davrida BPJ'dan detal **kesilmaydi**. Ishlab chiqarish fayllari (GibLab, stanok fayllari) BPJ'dan mustaqil.

## Ma'lum holat — egasiga savol

MebelCity pastki shkaflari Bazis'da 100 mm oyoqda turadi, sokol (Фронтальная) korpus ostida 10…100 mm da joylashgan. Smart3D konstruktori esa shkafni polga (0 mm) qo'yadi. Shuning uchun:

- sokol −90…0 ga tushadi;
- stoleshnitsa 726 mm da chiqadi (Bazis dizaynida taxminan 834 mm);
- oshxona qatoriga alohida "Sokol planka" ham qo'shiladi — sokol kesim ro'yxatida **ikki marta** chiqadi.

Bu texnolog qarori bilan tuzatiladi (TZ-17 natijasida savol sifatida berilgan).
