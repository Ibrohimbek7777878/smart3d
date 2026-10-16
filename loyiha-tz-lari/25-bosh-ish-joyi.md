# TZ-25 — Bosh ish joyi: Bazis kabi bitta ekran (matn qatori, Bazis faylini ochish, xona va mebel chizish)

**Sana:** 2026-10-17 · **Navbat:** 25 · **Holat:** TASDIQ KUTILMOQDA (savollarga javob #129; dizayn namunasi va "boshla" kerak)
**Asos:** egasi (#128): "bitta bosh joy bo'lsin, Bazis'dagi kabi; u yerda matn yozadigan joy bo'lsin; Bazis faylni ham chizish bo'lsin; mebel va xonani chiza olish ham bo'lsin; SunPin'ga ko'r, o'shandan zo'r va sodda bo'lsin".
Savollarga javob (#129):
- sayt ochilganda — darhol bo'sh ish joyi;
- matn — pastda doim ochiq qator;
- Bazis — faylini ish joyida ochish;
- xona — devorni bosib chizish.

**Bog'liq:** TZ-09/19 (tasdiqlangan dizayn), TZ-21 (Bazis yuklash), TZ-22 (avtomatik konstruktor), TZ-24 (modul chizish, tayyor so'rovlar), TZ-23 (3D ko'rinish).

---

## 1. Hozirgi holat (tekshirilgan, 2026-10-17)
- **Kirish yo'li:** kirgandan keyin "Loyihalarim" → "Yangi loyiha" → "Nima yasaymiz" (2 ekranli so'rovnoma) → muharrir.
- **Muharrir:**
  - chapda 4 qadam (Xona, Mebel, Narx, Fayllar);
  - o'rtada 3D/2D;
  - o'ngda — qadam paneli.
- **Matn (AI)** — pastki o'ngdagi tugma → oyna: matn, ovoz, tayyor so'rovlar, shablonlar.
- **Bazis fayli** — faqat "Loyihalarim" sahifasidagi tugma orqali ochiladi.
- **Xona:**
  - tayyor shakllar (to'rtburchak, L, erkin) — o'lcham raqam bilan;
  - eshik va deraza — varaqda raqam bilan;
  - 2D da devorni sichqoncha bilan chizib bo'lmaydi.
- **SunPin** (Bittada Usta, `usta.bittada.uz/#/sunpin`, faqat o'qildi):
  - 2D kanva: devor, eshik, deraza, o'lcham zanjiri;
  - fragment qo'yish, narx, 3D;
  - ko'p bosqichli: chizmalar ro'yxati → kanva → hisob.

## 2. Bajariladigan ishlar

### A. Bosh ish joyi — bitta ekran
1. **Ochilishi.** Kirishi bilan oxirgi ochilgan loyiha ochiladi, bo'lmasa — bo'sh ish joyi.
   - "Nima yasaymiz" so'rovnomasi ekrandan yashiriladi (qoida 2.7).
   - "Loyihalarim" va "Sozlamalar" — tepadagi menyuda.
2. **Joylashuv:**
   - **tepada** — logo, loyiha nomi, narx, "Loyihalar", "Fayllar", til, akkaunt;
   - **chapda** — asboblar paneli (vertikal): Tanlash, Devor chizish, Eshik va deraza, Mebel (katalog), Modul chizish, Bazis faylini ochish, O'lchash; 2D/3D;
   - **o'rtada** — kanva;
   - **o'ngda** — panel faqat kerak bo'lganda ochiladi: katalog, tanlangan obyekt, modul chizish, narx, fayllar;
   - **pastda** — matn qatori (B).
3. **Hozirgi 4 qadam** (Xona, Mebel, Narx, Fayllar) olib tashlanmaydi — chap paneldagi asboblarga va tepadagi tugmalarga ko'chadi. Hamma funksiya qoladi.

### B. Matn qatori (pastda, doim ochiq)
1. "Nima chizamiz? Masalan: 3×4 oshxona, L shakl, xolodilnik chapda" → Enter → loyiha quriladi.
   - AI'siz tahlilchi va avtomatik konstruktor bilan;
   - serverda AI kaliti bo'lsa — AI ham.
2. Mikrofon. Tayyor so'rovlar va shablonlar — qator ustidagi menyu.
3. **Bazis buyruq qatori kabi.** Devor chizish paytida qator "Devor uzunligi, mm" so'raydi: raqam yozib Enter bosilsa — devor shu uzunlikda chiziladi. Modul o'lchami ham shu qatordan beriladi.

### C. Bazis faylini ochish
Faylni (.b3d, .fr3d, .bpj) ish joyiga sudrab tashlash yoki chap paneldagi tugma. Bazis loyihasi va hisoboti o'zgarishsiz qoladi.

### D. Xona chizish (2D)
1. **Devor:**
   - nuqtama-nuqta bosiladi;
   - 0°, 90° va 45° ga yopishadi (Shift — erkin);
   - uzunligi — matn qatoridan yoki sudrab;
   - birinchi nuqtaga qaytilsa — xona yopiladi.
2. Devorni sudrab surish; o'lcham yozuvini bosib uzunligini o'zgartirish.
3. Eshik va deraza — devorga sudrab qo'yiladi; eni va joyi o'lchamda ko'rinadi.
4. Tayyor shakllar (to'rtburchak, L, P) — bir bosishda.
5. O'lcham zanjiri (har devor uzunligi) doim ko'rinadi.

### E. Mebel
- Katalog — o'ng panelda; xonaga sudrab qo'yiladi.
- "O'z modulingizni chizish" — chap paneldagi tugma.
- Modul kartasi, material va boshqa funksiyalar — o'zgarishsiz.

### F. Telefon
- Asboblar — matn qatori ustida, gorizontal qatorda.
- Panel — pastdan chiqadigan varaq.
- Matn qatori doim ko'rinadi.

## 3. Dizayn (qoida 3.3)
- Tasdiqlangan dizaynning (`frontend/design_handoff_smart3d`) ranglari, shrifti, tugma va kartalari o'zgarmaydi — faqat joylashuv o'zgaradi.
- Namuna: egasi aytgan "Bazis kabi" va "SunPin'dan sodda".
- Kod yozishdan oldin — namuna tasdig'i (6-bo'lim, 1-savol).

## 4. Tegadigan fayllar
- `web/src/app/App.jsx` — so'rovnoma o'rniga ish joyi.
- `web/src/features/editor/EditorPage.jsx` — joylashuv.
- Yangi `web/src/features/editor/ishjoyi/*` — asboblar paneli, matn qatori.
- `web/src/features/editor/room/*`, `web/src/services/sahna.js`, `app/js/scene.js` — 2D da devor chizish.
- `web/src/features/bazis/bazis.js` — sudrab tashlash.
- `web/src/features/editor/ai/*` — matn qatoriga ko'chadi.
- Lug'atlar (uz/ru/en).
- **Testlar:**
  - yangi — ish joyi, devor chizish (1440 va 390);
  - mavjud web testlar yangi joylashuvga moslanadi.
- **Tegilmaydi:** hisob, narx, kesim, stanok fayllari, server.

## 5. Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Butun muharrir joylashuvi o'zgaradi, 20 dan ortiq web test yangilanadi.
  - Kamaytirish: funksiyalar o'zgarmaydi, faqat qayerdan ochilishi o'zgaradi.
  - Har bosqichdan keyin barcha testlar ishga tushiriladi.
- **Moliya:** narx va hisobga tegilmaydi.
- **Orqaga qaytarish:** har bo'lim alohida commit; `git revert`.

## 6. Egasidan kerak (javob bo'lmasa — tavsiya olinadi)
1. **Dizayn namunasi.** Bazis oynasining skrinshotini o'zingiz yuborasizmi, yoki men shu uslubda 1440 va 390 uchun namuna rasm tayyorlab beraymi? *Tavsiya:* men tayyorlayman, siz tasdiqlaysiz.
2. **Bo'sh ish joyidagi xona.** Standart to'rtburchak (3600 × 3000) bo'lsinmi yoki butunlay bo'sh? *Tavsiya:* standart xona — darhol mebel qo'yish mumkin; "Devor chizish" bosilsa — yangi xona.
3. **"Boshla".**

## 7. Qabul
- Kirishi bilan ish joyi ochiladi. Matn qatoriga yozilgan so'rov loyiha quradi. Bazis fayli sudrab tashlansa ochiladi.
- Devor sichqoncha va barmoq bilan chiziladi, uzunligi matn qatoridan beriladi. Eshik va deraza sudrab qo'yiladi.
- Mebel qo'yiladi, modul chiziladi; narx va fayllar ishlaydi.
- 1440 va 390 da toshish yo'q; barcha testlar yashil.

## 8. Muddat (taxmin)
- **A + B:** 2 ish kuni.
- **C:** yarim kun.
- **D:** 2–3 ish kuni.
- **E + F:** 1 ish kuni.

Jami — taxminan 5–6 ish kuni. Bu taxmin, aniq hisob emas.
