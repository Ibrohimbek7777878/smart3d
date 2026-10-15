# TZ-09 — Yangi dizayn (Claude Design natijasi asosida)

**Sana:** 2026-10-15 · **Navbat:** 9 · **Holat:** MA'LUMOT KUTILMOQDA — Claude Design natijasi.
**Bog'liq:** TZ-07 (ro'yxat ekrani shu yerda ulanadi), TZ-08 (logo).

## Muammo (tekshirilgan)
- **Faqat yorug' rejim** — CSS'da `prefers-color-scheme` ham, `data-theme` ham yo'q (qoida 6.1).
- **Ranglar va shrift Bittada'niki emas:** to'q sariq `#d97706` va tizim shrifti. Bittada'da laym `#DCF262` va Plus Jakarta Sans.
- **Landing va onboarding yo'q.** Ilova 5 tabdan iborat, yangi foydalanuvchi uchun murakkab.
- **Dizayn talablari** [DIZAYN-Smart3D.md](../DIZAYN-Smart3D.md) da yozilgan.

## Bajariladigan ishlar (bosqichma-bosqich, har biri alohida commit)
1. **Dizayn tizimi:**
   - Bittada tokenlari CSS o'zgaruvchilarida, ikkala rejim;
   - ☀/🌙 almashtirgich, tanlov eslab qolinadi;
   - Plus Jakarta Sans.
2. **Ilova — 4 qadam:**
   - Xona → Mebel → Narx → Fayllar;
   - narx doim topbar'da;
   - telefonda bottom sheet va pastki menyu;
   - modulning sochilgan ko'rinishi.
3. **Landing:**
   - hero, 3D demo (rangsiz → rangli → sochilish), karusel;
   - demo modul ro'yxatdan keyin loyihaga o'tadi.
4. **Onboarding** — 3 qadam.

## Tegadigan fayllar
- `app/index.html`, `app/css/app.css`, `app/js/app.js`
- yangi `app/landing/*` (yoki `index` ichida)
- `app/sw.js`
- `tests/ui/*` — matritsa ikkala rejimda.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — butun ekran o'zgaradi.
  - Har bosqichdan keyin 7 qurilma × 2 rejim brauzer testlari.
  - Hisob dvigateliga tegilmaydi.
- **Moliya:** ta'siri yo'q.
- **Orqaga qaytarish:** har bosqich alohida commit.

## Egasidan kerak
- **Claude Design natijasi** — fayllar yoki havola.
- Landing uchun: tarif va narx, aloqa ma'lumotlari.

## Qabul
- DIZAYN-Smart3D.md 14-bo'limidagi qabul ro'yxati to'liq bajarilgan.
- Barcha testlar ikkala rejimda yashil.
