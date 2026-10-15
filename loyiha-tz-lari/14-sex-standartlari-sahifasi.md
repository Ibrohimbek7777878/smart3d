# TZ-14 — Sex standartlari sahifasi (min/max — ekrandan, faqat admin)

**Sana:** 2026-10-15 · **Navbat:** 14 (TZ-07 dan keyin) · **Holat:** BAJARILDI 2026-10-15 (egasi: "hammasini qilib tugatib ber") · **Asos:** egasi: "Ha, ekrandan (faqat admin)".

## Muammo
- Modullarning o'lcham chegaralari (oshxona, shkaf, krovat, parta) hozir faqat faylda o'zgartiriladi: `app/data/sex-standartlari.json`.
- Egasi ularni ilovaning o'zida, ekrandan o'zgartirmoqchi. Faqat admin o'zgartiradi, ustalar faqat ko'radi.

## Bajariladigan ishlar
1. **Server:**
   - `GET /api/sex-standartlari` — hamma uchun;
   - `PUT /api/sex-standartlari` — faqat admin (`adminOnly`, bor).
   - Tekshiruv: min < max, son, mm.
   - Har o'zgarish tarixga yoziladi: kim, qachon, eski → yangi. Narx tarixi (`price_history`) bilan bir xil usulda.
2. **Ilova — "Sozlamalar → Sex standartlari":**
   - har tur bo'yicha jadval: eni / bo'yi / chuqurligi; krovat va parta uchun matras/stol usti;
   - min, max va standart qiymatlar;
   - manba (ГОСТ yoki sex statistikasi) ko'rinadi.
   - Usta faqat o'qiydi.
3. **Darhol ta'sir:** saqlangach katalog chegaralari va ogohlantirishlar yangilanadi (`applySexStandart`).
4. **Testlar:**
   - server — admin emas → 403; noto'g'ri qiymat → 400; tarix yozildi;
   - brauzer — admin o'zgartirdi → katalogda yangi chegara.

## Tegadigan fayllar
- `server/index.js`, server testlari.
- `app/js/app.js`, `app/index.html`, `app/css/app.css`.
- `app/data/sex-standartlari.json` — boshlang'ich qiymatlar shu yerdan olinadi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — noto'g'ri chegara modullarni noto'g'ri siqadi. Shu sababli: faqat admin, tekshiruv va tarix — eski qiymatga qaytarish mumkin.
- **Moliya:** to'g'ridan-to'g'ri yo'q (narx o'lchamdan hisoblanadi). ERP'ga yozilmaydi.
- **Orqaga qaytarish:** tarixdan oldingi qiymat; kod — `git revert`.

## Bog'liq
- TZ-07 — kirish va admin roli kerak.

## Qabul
- Admin chegarani ekrandan o'zgartiradi, katalogda darhol ko'rinadi.
- Usta o'zgartira olmaydi.
- Tarixda yozuv bor.

## Natija (2026-10-15)
- **Server:**
  - `GET /api/sex-standartlari` (hamma) va `PUT` (faqat admin);
  - tekshiruv: min < max, son 1–20000, standart qiymatlar chegara ichida, faqat mavjud tur va o'lcham;
  - nom, manba va boshqa maydonlar saqlanadi;
  - qiymat `settings` jadvalida, har o'zgarish `sex_std_history` da (eski → yangi).
- **Sayt:**
  - "📏 Sex standartlari" — akkaunt oynasidan; har tur bo'yicha min / max / standart qiymatlar va manba;
  - admin o'zgartiradi, usta faqat ko'radi;
  - saqlangach katalog chegaralari va narx taxminlari darhol yangilanadi;
  - server orqali ochilganda standartlar serverdan olinadi.
- **Admin kirishi:** kirish oynasida "Admin (email bilan)" havolasi; har ochilganda oyna SMS rejimiga qaytadi.
- **`applySexStandart`:** bo'sh qiymat endi chegarani olib tashlaydi (eski qiymat qolib ketmaydi).
- **Testlar:**
  - server 30/30 (yangi: 401 / 403 / 400×4 / 200, boshqa maydonlar saqlanishi);
  - brauzer `tests/ui/standart.mjs` — admin o'zgartirdi → katalog "max 1100"; noto'g'ri qiymat — xato; usta faqat ko'radi; qayta ochilganda 1100;
  - to'liq regressiya yashil.

