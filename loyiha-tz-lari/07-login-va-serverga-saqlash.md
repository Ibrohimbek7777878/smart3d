# TZ-07 — Kirish (login) va loyihani serverga saqlash

**Sana:** 2026-10-15 · **Navbat:** 7 · **Holat:** TASDIQ KUTILMOQDA.

## Muammo (tekshirilgan)
1. **Sayt serverga ulanmagan.** Faqat `/api/health` chaqiriladi ([app.js:1643](../app/js/app.js#L1643)).
   - Login va ro'yxat ekranlari yo'q, server tomonda esa bor: `/api/register`, `/api/login`.
2. **Loyiha faqat brauzerda saqlanadi va faqat bittasi** (localStorage, [app.js:1220–1238](../app/js/app.js#L1220)).
   - Brauzer tozalansa — loyiha yo'qoladi.
   - Boshqa qurilmada ko'rinmaydi.
   - Bir nechta loyiha yo'q (F3).
3. **Serverning uch xil kirish fayli bor:**
   - `server/index.js` — SQLite, ishlaydi, 13 test;
   - `server/src/server.js` — PostgreSQL, ishlamaydi (B1);
   - `server/production.js` — PostgreSQL + Redis klaster, tekshirilmagan.

   `Dockerfile` `src/server.js` ga (B8), `ecosystem.config.js` esa `production.js` ga qaragan — ishlaydigan `index.js` ga hech biri qaramaydi.
4. **Server bazasida faqat 83 modul bor** (`init-db.js` → `fragments.json`). MebelCity'ning 38 moduli va sex standartlari yo'q.
5. **Ro'yxatdan o'tish email bilan.** Dizayn va qoida S1 esa telefon bilan.

## Bajariladigan ishlar
1. **Stack:** SQLite (`index.js`) qoladi.
   - `src/` va `production.js` — "ishlatilmaydi" deb belgilanadi, o'chirilmaydi.
   - `Dockerfile` va `ecosystem.config.js` `index.js` ga to'g'rilanadi.
2. **Server:**
   - telefon bilan ro'yxat va kirish: `998XXXXXXXXX`, dublikat oxirgi 9 raqam bo'yicha (S1); email ixtiyoriy; parol bcrypt (bor);
   - `/api/projects` — ro'yxat, ochish, saqlash. O'chirish — faqat yashirish (arxiv). Har foydalanuvchi faqat o'z loyihasini ko'radi;
   - bazaga MebelCity modullari va `sex-standartlari.json`.
3. **Sayt:**
   - kirish va ro'yxat ekrani (hozirgi uslubda; yangi ko'rinish — TZ-09);
   - "Loyihalarim" ro'yxati;
   - **avtomatik saqlash** — o'zgarishdan 2 soniya keyin;
   - internet yo'q bo'lsa — qurilmada navbatga qo'yiladi va keyin yuboriladi;
   - mavjud localStorage loyihasi birinchi kirishda serverga ko'chiriladi.
4. **Testlar:**
   - server — telefon formati, dublikat, boshqa foydalanuvchi loyihasini ko'ra olmaslik;
   - brauzer — kirish → saqlash → yangi sessiyada ochish.

## Tegadigan fayllar
- Server: `server/index.js`, `server/init-db.js`, `server/Dockerfile`, `server/ecosystem.config.js`, `server/test/*`.
- Sayt: `app/js/app.js`, yangi `app/js/auth.js`, `app/index.html`, `app/css/app.css`.
- `app/sw.js` — `/api/` keshlanmaydi, hozir ham shunday.

## Xavf, moliya, orqaga qaytarish
- **Xavf: YUQORI** — kirish va foydalanuvchi ma'lumoti.
  - Maxfiy narsa commit qilinmaydi (`JWT_SECRET` faqat muhitda).
  - Serverni men qayta ishga tushirmayman (5.3).
  - Sinov o'z test bazasida (S8).
- **Moliya:** pul harakati yo'q.
- **Orqaga qaytarish:** server va sayt alohida commit'larda, `git revert`. localStorage'dagi loyiha ko'chirilgandan keyin ham o'chirilmaydi.

## Egasidan kerak
1. **Telefon + parol bilan kirish** — tasdiqlash. SMS kodi yo'q; kerak bo'lsa — alohida TZ, provayder kerak.
2. **Q4 — server qayerda turadi?** Deploy uchun, TZ-10.

## Qabul
- Bir qurilmada saqlangan loyiha ikkinchisida ochiladi.
- Boshqa foydalanuvchi uni ko'rmaydi.
- Internetsiz qilingan o'zgarish keyin saqlanadi.
- Server va brauzer testlari yashil.
