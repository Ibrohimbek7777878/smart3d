# TZ-34 — Production'ni yangi versiyaga o'tkazish va git orqali yangilash

**Sana:** 2026-10-18 · **Navbat:** 34 · **Holat:** TASDIQ KUTILMOQDA (egasi #201: "ha boshlayver"; production bo'lgani uchun tasdiq va "restart qil" alohida)
**Koordinator:** smart3d-51.

## Hozirgi holat (tekshirilgan 2026-10-18, faqat o'qish)
- Serverdagi loyiha papkasi — zip'dan ochilgan (`smart3d-dizayn-f0d1e53.zip`). Git yo'q, shuning uchun `git pull` ishlamaydi.
- U yerda f0d1e53 turibdi (17-oktabr 16:57). `dizayn` undan ancha oldinda (139209b+):
  - CI tuzatish;
  - public repo tozaligi;
  - TZ-29, TZ-30 — manzillar, server modullari;
  - TZ-31 — Google, VR.
- Repo endi ommaviy — server GitHub'dan kalitsiz oladi.

## Bajariladigan ishlar
1. **Zaxira** (admin): baza (`node server/backup.js`), `.env`, eski papka nusxasi.
2. **Yangi papka:** `git clone -b <tarmoq> https://github.com/Ibrohimbek7777878/smart3d.git <server-papka>-git`.
3. **Maxfiy fayllar** (admin): `.env` va bazani yangi papkaga ko'chirish. Claude bu fayllarga tegmaydi (Claude Code himoyasi ham to'sadi).
4. **Build:** `server/` da `npm ci --omit=dev`; `web/` da `npm ci --include=dev && npx vite build`.
5. **Sinov porti — bazaning nusxasi bilan:** `/api/health`, bosh sahifa, `/app.html`, `/loyihalar` (TZ-30 manzili), kirish oynasi.
   - Bazaga yangi ustunlar (masalan `google_sub`) server ishga tushganda o'zi qo'shiladi. Shuning uchun avval NUSXADA sinaladi.
6. **Almashtirish** — egasining "restart qil" buyrug'i bilan (qoida 5.3): eski jarayon to'xtaydi, yangi papkadan ishga tushadi (PM2 yoki systemd — qaysi biri ishlatilishini admin aytadi).
7. **Tekshiruv:** `https://smart.bittada.uz/api/health`, sahifalar, kirish, bitta loyiha ochiladi.
8. **Keyingi yangilanishlar:** `server/yangilash.sh` (yangi skript):
   - zaxira → `git pull` → `npm ci` → build → sinov porti → qayta yuklash.
   - Avtomatik (GitHub Actions) — keyin, alohida.

## Kim qiladi
- **Admin:** 1, 3, 6-qadamlar (maxfiy fayllar, servis).
- **Koordinator:** 2, 4, 5, 7, 8 — faqat egasi `<ichki-host-kod>` ga yozish ruxsatini bersa. Aks holda koordinator buyruqlar ro'yxatini tayyorlaydi, admin bajaradi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: YUQORI** — jonli sayt, haqiqiy akkauntlar, baza sxemasi o'zgaradi. Yumshatish: zaxira, avval nusxada sinov, eski papka 2 hafta turadi.
- **Moliya:** narx, buyurtma va to'lov ma'lumotlari ko'chiriladi, lekin o'zgartirilmaydi. Ustama 35% — kodda tasdiqlangan.
- **Orqaga qaytarish:** eski papkadan qayta ishga tushirish + 1-qadamdagi zaxira.

## Egasidan kerak
1. **Qaysi tarmoq:**
   - `dizayn` (tavsiya: hamma yangi ish shu yerda);
   - yoki avval PR #1 orqali `main` ga qo'shish.
2. **Kim bajaradi:** admin, yoki Claude'ga yozish ruxsati (faqat shu TZ qadamlari).
3. **Qulay vaqt** — sayt bir necha daqiqa to'xtaydi.

## Qabul
- `smart.bittada.uz` da yangi versiya: `/loyihalar` manzili ochiladi, Google tugmasi `GOOGLE_CLIENT_ID` bo'lmasa ko'rinmaydi.
- Eski akkauntlar va loyihalar joyida.
- `server/yangilash.sh` bilan keyingi yangilanish bitta buyruq.
