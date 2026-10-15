# TZ-10 — Saytni ishga chiqarish (deploy) va zaxira nusxa

**Sana:** 2026-10-15 · **Navbat:** 10 · **Holat:** REPO QISMI BAJARILDI 2026-10-15 — serverga o'rnatishni admin `server/DEPLOY.md` bo'yicha qiladi; L1 (yurist) kutilmoqda. **Bog'liq:** TZ-07.

## Muammo
- **Sayt hech qayerda ishlamayapti** (B4).
  - Server qayerda turishi aniqlanmagan (Q4): `smart3d.bittada.uz` tunnel orqalimi yoki alohida serverdami.
- **Zaxira nusxa, log va monitoring yo'q** (B5).
- **Mijozlarning shaxsiy ma'lumotlari O'zbekistondagi serverda saqlanishi talabi** — yurist bilan tekshirilmagan (L1).

## Bajariladigan ishlar (repoda tayyorlanadi; serverda egasi yoki server admini bajaradi)
1. **Ishga tushirish yo'riqnomasi** `server/DEPLOY.md`:
   - muhit o'zgaruvchilari: `JWT_SECRET`, `ADMIN_PASSWORD`, `TRUST_PROXY`, `NODE_ENV`;
   - HTTPS;
   - port;
   - tekshiruv ro'yxati.
2. **Zaxira skripti** `server/backup.sh` — SQLite'ning kunlik nusxasi, oxirgi 14 kunlik saqlanadi. Ishga tushirishdan oldin sintaksis tekshiruvi (5.4).
3. **Sog'liq tekshiruvi** (`/api/health`) va xatolar logi — fayl, aylanadigan.

## Tegadigan fayllar
- `server/DEPLOY.md` (yangi)
- `server/backup.sh` (yangi)
- `server/index.js` — log, agar kerak bo'lsa

**Serverdagi** nginx, systemd va konfiguratsiya **tahrirlanmaydi** (5.5). Men deploy va restart qilmayman (5.3).

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — jonli sayt.
  - Yo'riqnoma "avval test serverda" tartibida yoziladi.
  - Zaxira nusxadan tiklash sinab ko'riladi.
- **Moliya:** pul harakati yo'q. To'lov va obuna — keyin, alohida TZ (B9).
- **Orqaga qaytarish:** git; serverda — oldingi versiyaga qaytish yo'riqnomada.

## Egasining qarori (2026-10-15)
- **Server: Bittada serveri, `smart3d.bittada.uz`.**
  - Ishga tushirishni server admini yoki server agenti yo'riqnoma bo'yicha bajaradi.
  - Umumiy nginx va systemd'ni men tahrirlamayman (5.5).
  - Boshqa tizimlarga xalaqit bermasligi uchun alohida port va alohida jarayon.

## Egasidan kerak
- ~~Q4 — server qayerda~~ — javob berildi: Bittada serveri.
- **L1** — yurist xulosasi.

## Qabul
- Test serverda yo'riqnoma bo'yicha noldan ishga tushdi.
- Zaxira nusxadan tiklandi.

## Natija (2026-10-15)
- **`server/DEPLOY.md`** — Bittada serveri (`smart3d.bittada.uz`) uchun tartib:
  - talablar, kodni ko'chirish (`git archive`), muhit fayli (gitga kirmaydi);
  - baza, PM2 yoki systemd, nginx (namuna), HTTPS;
  - tekshiruv, zaxira (cron), tiklash, yangilash va orqaga qaytish.
  - Hammasi "avval test" tartibida. Server sozlamalarini admin qo'yadi (5.5).
- **`server/backup.js`:**
  - server ishlab turganda ham xavfsiz nusxa (better-sqlite3 backup API);
  - nusxa butunligi tekshiriladi, bitta fayl (WAL'siz);
  - oxirgi `KEEP` (14) tasi saqlanadi.
- **PM2:** `ecosystem.config.js` → `.cjs` (`package.json` ESM bo'lgani uchun PM2 eskisini yuklay olmasdi). `ARCHITECTURE.md` dagi ishoralar ham yangilandi.
- **Testlar:**
  - `server/test/backup.test.js` — nusxa, butunlik, rotatsiya, baza yo'q bo'lsa xato;
  - `server/test/prod.test.js` — production'da `JWT_SECRET` yo'q yoki qisqa bo'lsa ishga tushmaydi; to'g'ri sozlamada `/api/health` ok, Eskiz'siz SMS 503 va `dev_code` yo'q.
  - Server 34/34.
- **Sinalmadi:** Docker image qurilishi (internetdan `node:20` image tortadi). Haqiqiy serverga o'rnatish — admin ishi.

