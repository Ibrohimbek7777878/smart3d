# TZ-10 — Saytni ishga chiqarish (deploy) va zaxira nusxa

**Sana:** 2026-10-15 · **Navbat:** 10 · **Holat:** MA'LUMOT KUTILMOQDA — Q4 va L1. **Bog'liq:** TZ-07.

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

## Egasidan kerak
- **Q4** — server qayerda.
- **L1** — yurist xulosasi.

## Qabul
- Test serverda yo'riqnoma bo'yicha noldan ishga tushdi.
- Zaxira nusxadan tiklandi.
