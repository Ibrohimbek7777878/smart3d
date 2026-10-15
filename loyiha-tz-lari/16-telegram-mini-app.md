# TZ-16 — Telegram bot uchun Mini App

**Sana:** 2026-10-15 · **Navbat:** 16 · **Holat:** TASDIQ KUTILMOQDA
**Asos:** egasi (2026-10-15): "bot ga ulab qo'yamiz, bot uchun mini app yozib qo'y, botni linkini keyinroq beraman". Telefon ilovasi (App Store / Play Market) hozir qilinmaydi.
**Bog'liq:** TZ-09 (yangi frontend — Mini App shuning o'zi), TZ-07 (kirish), TZ-10 (serverga qo'yish, HTTPS).

---

## Maqsad
- Smart3D ilovasi Telegram botning ichida ochiladi.
- Bu alohida ilova emas — TZ-09 dagi o'sha React ilova. Telegram ichida ochilganda Telegram imkoniyatlaridan foydalanadi.
- Dizayn o'zgarmaydi.

## Foydalanuvchi uchun qanday ishlaydi
1. Usta botni ochadi va "Smart3D" tugmasini bosadi. Ilova Telegram ichida ochiladi.
2. **Kirish avtomatik.** Telegram foydalanuvchi ma'lumotini beradi, server uni bot kaliti bilan tekshiradi (soxtalashtirib bo'lmaydi). Parol ham, SMS ham kerak emas.
3. **Telefon raqami.** Birinchi kirishda Telegram'ning "Raqamni ulashish" oynasi chiqadi — bir bosish.
   - Raqam S1 formatida saqlanadi: `998XXXXXXXXX`.
   - Saytda shu raqamli akkaunt bo'lsa — o'sha akkauntga bog'lanadi (bitta raqam — bitta akkaunt, S1).
4. **Loyihalar umumiy:** botda boshlangan loyiha saytda ham ochiladi va aksincha.

## Bajariladigan ishlar

### 1. Frontend (`web/`)
- Telegram ichida ochilganini aniqlash. Telegram skripti faqat shu holatda yuklanadi; oddiy saytda ta'siri yo'q.
- Telegram sarlavha va fon rangi — dizayndagi `#0F2229`; ilova to'liq ekranga ochiladi.
- Ekranlar orasida Telegram'ning "Orqaga" tugmasi ishlaydi.
- 3D sahnani barmoq bilan aylantirganda Telegram oynasi pastga tortilib yopilib ketmaydi.
- Kirish ekrani o'rniga avtomatik kirish va telefon so'rash.
- **Fayllar:**
  - Telegram ichida to'g'ridan-to'g'ri yuklab olish ishlasa — shu ishlatiladi;
  - ishlamasa — fayl bot chatiga hujjat bo'lib keladi.

### 2. Server
- `POST /api/auth/telegram`:
  - Telegram ma'lumotini bot kaliti bilan tekshirish (HMAC-SHA256), eskirgan ma'lumot rad etiladi;
  - foydalanuvchini topish yoki yaratish (`users.telegram_id`);
  - kirish kaliti (JWT) — saytdagi bilan bir xil.
- Telefonni bog'lash: S1 formati, dublikat — oxirgi 9 raqam bo'yicha.
- `POST /api/telegram/send-file` — faylni faqat o'sha foydalanuvchining chatiga yuborish; hajm chegarasi bilan.
- Bot kaliti faqat server muhitida (`TELEGRAM_BOT_TOKEN`). Commit qilinmaydi, kodda yozilmaydi.

### 3. Bot sozlamasi
- Menyu tugmasi ("Smart3D" → ilova) va `/start` xabari.
- Yo'riqnoma `server/DEPLOY.md` ga yoziladi. Sozlashni siz yoki admin qiladi.

### 4. Testlar (o'z test bazasida, S8)
- **Server:**
  - to'g'ri Telegram ma'lumoti → kirish;
  - soxta yoki eskirgan → 401;
  - telefon dublikati;
  - fayl faqat o'z chatiga ketadi.
- **Brauzer:** Telegram muhitini taqlid qilib (test kaliti bilan) ilovani ochish, kirish, loyiha saqlash.

## Tegadigan fayllar
- Yangi `web/src/app/bridge/telegram.js`; `web/app.html`; kirish ekrani mantiqi.
- `server/index.js`, `server/init-db.js` (`users.telegram_id` — yangi maydon, mavjud ma'lumot o'zgarmaydi).
- Yangi `server/telegram.js` va `server/test/telegram.test.js`.
- `server/DEPLOY.md`.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — kirish va shaxsiy ma'lumot (Telegram ID, telefon).
  - Telegram ma'lumoti faqat server tomonda tekshiriladi.
  - Kalit faqat server muhitida.
  - Telefon faqat foydalanuvchi o'zi ruxsat bersa olinadi.
- **Moliya:** pul harakati yo'q. Telegram to'lovlari ishlatilmaydi.
- **Orqaga qaytarish:** Telegram qismi alohida modul. Uni o'chirsa ham sayt ishlayveradi; `git revert`.

## Shartlar
- TZ-09 dan keyin bajariladi (Mini App — TZ-09 ilovasining o'zi).
- Sayt HTTPS'da ochiq bo'lishi kerak — Telegram talabi (TZ-10, `smart3d.bittada.uz`).

## Egasidan kerak
1. **Bot** — BotFather'da yaratilgan bot va uning kaliti (token). Kalitni serverga o'zingiz yoki admin qo'yadi, menga yozma bermang.
2. **Bot linki** — keyin berasiz.
3. **"Boshla".**

## Qabul
- Botdagi tugma ilovani ochadi; kirish avtomatik; telefon bir bosishda.
- Botda saqlangan loyiha saytda ochiladi va aksincha.
- Fayllar Telegram ichida olinadi.
- Ko'rinish saytdagi bilan bir xil (skrinshot bilan solishtiriladi).
- Server va brauzer testlari yashil.

## Muddat (taxmin)
- Taxminan **2–3 ish kuni**, TZ-09 tugagach. Bu taxmin, aniq hisob emas.
