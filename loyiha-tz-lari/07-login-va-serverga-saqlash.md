# TZ-07 — Kirish (login) va loyihani serverga saqlash

**Sana:** 2026-10-15 · **Navbat:** 7 · **Holat:** BAJARILDI 2026-10-15 (egasi: "hammasini qilib tugatib ber"). Haqiqiy SMS — Eskiz akkaunti serverga qo'yilgach.

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

## Egasining qarori (2026-10-15)
- **Kirish: telefon + SMS kod** (parolsiz). Shuning uchun 2-bandda parol o'rniga bir martalik SMS kod bo'ladi:
  - 6 xonali kod, 5 daqiqa amal qiladi, urinishlar soni cheklanadi;
  - **SMS provayderi: Eskiz.uz** (egasi tanladi). Server Eskiz API orqali kod yuboradi. Akkaunt ma'lumotlari faqat server muhitida (`ESKIZ_*`), commit qilinmaydi;
  - sinov rejimi: test bazasida (S8) SMS yuborilmaydi — kod test natijasida tekshiriladi;
  - provayder kaliti faqat server muhitida saqlanadi.

## Egasidan kerak
1. ~~Kirish usuli~~ — telefon + SMS kod (Eskiz.uz).
2. **Eskiz.uz akkaunti:** login va kalit. Serverga o'zingiz yoki admin qo'yadi, menga yozma ko'rinishda bermang.
3. ~~Q4~~ — Bittada serveri.

## Qabul
- Bir qurilmada saqlangan loyiha ikkinchisida ochiladi.
- Boshqa foydalanuvchi uni ko'rmaydi.
- Internetsiz qilingan o'zgarish keyin saqlanadi.
- Server va brauzer testlari yashil.

## Natija (2026-10-15)
- **Server (`index.js`, `sms.js`):**
  - `POST /api/auth/sms/send` va `/verify`: 6 xonali kod, 5 daqiqa, 5 urinish, qayta yuborish 60 soniyadan keyin, IP bo'yicha cheklov. Kod bazada faqat HMAC ko'rinishida.
  - Telefon S1 bo'yicha `998XXXXXXXXX`; bitta raqam — bitta akkaunt (oxirgi 9 raqam, noyob indeks). `/api/register` ham telefonni shu formatga keltiradi.
  - Eskiz.uz: `notify.eskiz.uz` — `api/auth/login` va `api/message/sms/send`; 401 bo'lsa qayta kiradi. Manzillar ochiq Eskiz kutubxonasi manbasidan tekshirildi.
  - Eskiz sozlanmagan bo'lsa: production — 503; dev/test — kod javobda keladi (`dev_code`).
  - `/api/projects`: ro'yxat, yaratish, ochish, yangilash, o'chirish (= yashirish). Har usta faqat o'zinikini ko'radi.
  - Jadvallar (`sms_codes`, `projects`) mavjud bazaga ham qo'shiladi (`IF NOT EXISTS`). MebelCity'ning 38 moduli bazaga bir marta qo'shiladi.
- **Stack:**
  - `Dockerfile` endi `index.js` va frontendni o'z ichiga oladi — repo ildizidan quriladi;
  - PM2 — bitta jarayon (`fork`), maxfiy qiymatlarsiz;
  - `src/` va `production.js` — "ISHLATILMAYDI" deb belgilandi.
- **Sayt (`auth.js`):**
  - 👤 tugmasi faqat Smart3D serveri orqali ochilganda ko'rinadi;
  - kirish oynasi: telefon maskasi, SMS kod, ism;
  - "Loyihalarim": ochish, yangi, o'chirish o'z oynamiz bilan;
  - holat belgisi: ☁ ✓ / … / ✕.
  - **Xavfsiz tartib:**
    - kirgandan keyin oxirgi loyiha avval serverdan ochiladi, keyin avtomatik saqlash yoqiladi (2 soniya);
    - "Yangi" yoki qurilmadan yuklash — serverda yangi loyiha (eskisi ustidan yozilmaydi);
    - birinchi kirishda joriy ish akkauntga saqlanadi;
    - internet yo'q bo'lsa — navbatda turadi, qaytganda yuboriladi.
- **Testlar:**
  - server 20/20 (yangi 7: format, kod, urinishlar, oxirgi 9 raqam, ro'yxat 409, loyihalar va ularning yopiqligi, buzilgan doc 400, MC modullari);
  - brauzer `tests/ui/kirish.mjs` — Node server bilan vaqtinchalik bazada: kirish → saqlash → qayta ochish → internetsiz navbat → internet qaytdi → yangi → o'chirish → chiqish. 3 marta ketma-ket o'tdi;
  - statik saytda tugma yashirin (`mc.mjs`); qolgan barcha to'plamlar yashil.
- **Eslatmalar (TZ-10 uchun):**
  - token muddati standart 12 soat — SMS bilan kirishda production'da `JWT_EXPIRES=30d` qo'yish tavsiya;
  - `ecosystem.config.js` CommonJS, `package.json` esa ESM — PM2 da muammo bo'lsa, faylni `.cjs` ga o'zgartirish;
  - Eskiz'da SMS matni shablon sifatida moderatsiyadan o'tishi talab qilinishi mumkin. Matn: "Smart3D kirish kodi: XXXXXX. Kodni hech kimga bermang."

