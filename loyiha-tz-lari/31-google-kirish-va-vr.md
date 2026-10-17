# TZ-31 — Google bilan kirish va VR (shlemda)

**Sana:** 2026-10-18 · **Navbat:** 31 · **Holat:** **BAJARILDI** 2026-10-18 (`dizayn` 139209b, testchi O'TDI) — haqiqiy Google va shlemda tekshirish qoldi (egasi #196, #197: "ishni bo'lib ber va boshla"; token tejash — qat'iy)
**Koordinator:** smart3d-51 chati. Boshqa chat (smart3d-68) o'z ishida; bu TZ fayllari unga tegmaydi.

## Natija (2026-10-18)
- **A — Google kirish** (027d375, 01:44–01:50):
  - `POST /api/auth/google`: imzo RS256, aud, iss, muddat, `email_verified` tekshiriladi.
  - Email bor — bog'lanadi; yo'q — yangi akkaunt; boshqa Google bilan bog'langan email — 409.
  - Xato urinishlar chegarasi: 20 ta / 15 daqiqa. Client ID yo'q — 503.
  - Xato kodlari `S3D-AUTH-016..020`, matnlar 3 tilda.
  - Tugma faqat `GOOGLE_CLIENT_ID` bo'lsa chiqadi.
  - CSP: `accounts.google.com` (gsi client/style/frame). COOP → `same-origin-allow-popups` (Google oynasi uchun shart).
  - Yo'riqnoma: `server/DEPLOY.md` 8a.
- **B — VR** (1f78236, 01:44–02:02):
  - `web/src/services/vr.js`: ildiz 0,001 masshtab va −90° (Z→Y), `local-floor`, xona markazida turish.
  - Pult: nur chizig'i; polga bosish — teleport; modulga bosish — tanlash va eshik ochish (mavjud amal).
  - VR'dan chiqqach kamera, near/far, FOV va boshqaruv tiklanadi; VR vaqtida yorliqlar yashiriladi; VR yo'q bo'lsa — xabar.
  - Testlar: IWER 2.5.0 (Quest 3), `verify_vr`.
- **Test (testchi + koordinator):**
  - run-all yashil, server 86/86, build ok;
  - `web.sh` 38/38, `web_yangilanish` (alohida) ok;
  - auth-google 6/6, `web_kirish` va `web_vr` ok.
  - Testchi ko'rgan 2 ta yiqilish sinash usulidan bo'lgan: testlar bir vaqtda yurgan / `yangilanish` noto'g'ri yurgizilgan. Alohida qayta yurgizilganda o'tdi.
- **Qoldi:**
  - admin `GOOGLE_CLIENT_ID` qo'yadi va haqiqiy Google bilan sinaladi;
  - haqiqiy shlemda: pult tugmalari, devorlarni yashirish, tezlik (`preserveDrawingBuffer`);
  - production'ga yangi versiyani qo'yish (admin).

## A. Google bilan kirish
- Kirish ekranida (email bo'limi) **"Google bilan kirish"** tugmasi. Server `GOOGLE_CLIENT_ID` bilan sozlangan bo'lsagina ko'rinadi (SMS, Telegram kabi).
- Server: `POST /api/auth/google` — Google ID token tekshiriladi: imzo (Google ochiq kalitlari), `aud` = bizning Client ID, `iss`, muddat, `email_verified`.
  - Email bazada bor — shu akkauntga kiradi (Google bog'lanadi). Yo'q — yangi akkaunt (oddiy foydalanuvchi, ism Google'dan).
  - Sessiya — mavjud cookie tartibi. So'rov chegarasi, xato kodlari `S3D-AUTH-…`, 3 tilda matn.
- CSP: faqat `accounts.google.com` qo'shiladi.
- Admin: Google Cloud'da OAuth Client ID (manzil `https://smart.bittada.uz`) → serverga `GOOGLE_CLIENT_ID`. Yo'riqnoma `server/DEPLOY.md` da.
- **Fayllar:** `server/routes/auth.js` (yoki yangi `auth-google.js`), `server/lib/*` (kerak bo'lsa), `server/himoya.js` (CSP), `web/src/features/auth/*`, lug'atlar, `server/DEPLOY.md`, testlar (`server/test/`, `tests/ui/`).

## B. VR (WebXR, shlemda)
- "VR" bosilganda xona **haqiqiy o'lchamda**: mm → m, Z-yuqori → Y-yuqori. Foydalanuvchi pol ustida, xona ichida turadi.
- Pult: polga ko'rsatib bosish — o'sha joyga o'tish (teleport). Modulga ko'rsatib bosish — tanlash va eshik/tortma ochish (mavjud amal).
- VR'dan chiqqanda oddiy ko'rinish o'zgarishsiz qaytadi.
- Sinov: shlem emulyatori (Meta IWER, faqat testda). Yakuniy tekshiruv — haqiqiy shlemda (egasi).
- **Fayllar:** `app/js/scene.js` (XR qismi), `web/src/features/editor/scene/sahna.js`, kerak bo'lsa yangi `web/src/services/vr.js`, `web/package.json` (faqat devDependency), test `tests/ui/web_vr.mjs`.

## Bu TZ'ga kirmaydi
- Teshik, rang va kromka — savol egasida (#196).
- Rover / ArtCAM — savol egasida.
- Stanok sinov kuni — texnolog.
- ERP `.xlsx` ni repodan olish — egasining "ha"si kerak.
- Server yangilash yo'li — admin.
- Telegram — PAUZA.
- SketchUp — S5.

## Xavf, moliya, orqaga qaytarish
- **A — O'RTA:** kirish va CSP'ga tegadi. Client ID bo'lmasa, tugma ham, API ham o'chiq — hozirgi kirish o'zgarmaydi.
- **B — PAST:** faqat VR sessiyasi ichida ishlaydi.
- **Moliya:** narx, hisob va buyurtmaga tegilmaydi.
- **Orqaga qaytarish:** `git revert`.

## Jamoa (token tejash)
- **Backend+Frontend · Google kirish** — Sonnet, o'rta.
- **Frontend · VR** — Sonnet, o'rta.
- **Test · TZ-31** — Haiku, ikkalasi tugagach.
- Har agent o'z git nusxasida ishlaydi (`agent/k2-*`). Birlashtirish — koordinator.

## Qabul
- Client ID yo'q bo'lsa — tugma yo'q, API 503. Soxta Google kaliti bilan server testi: to'g'ri token kiradi; noto'g'ri `aud`, eskirgan yoki imzosiz token rad etiladi.
- Emulyatorda VR: xona haqiqiy o'lchamda, teleport va modul tanlash ishlaydi. VR'dan chiqqach, ko'rinish o'zgarmagan.
- Barcha eski testlar yashil.
