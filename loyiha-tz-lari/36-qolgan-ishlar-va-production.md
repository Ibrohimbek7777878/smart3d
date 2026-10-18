# TZ-36 — Qolgan ishlar va productionga tayyorlash

**Sana:** 2026-10-18 · **Navbat:** 36 · **Holat:** BAJARILMOQDA (egasi #252: "qolgan ishlar bo'yicha TZ yozib ol va loyihani productionga tayyorlash kerak, tez")
**Asos:** `dizayn` 3a732a9 = `main` (sinxron), GitHub CI yashil. Serverga o'tkazishni egasi qo'lda qiladi (#222) — bu TZ faqat repo ichidagi tayyorgarlik; serverga hech narsa yozilmaydi.

## 1. Production tayyorgarligi (repo ichida — agent/prod, Sonnet, 22:00 gacha)
| # | Vazifa | Natija |
|---|---|---|
| P1 | **Maxfiylik tekshiruvi**: repo daraxtida (tarix emas) kalit, parol, token, mijoz ismi/telefoni, ichki host/IP, `/home/` yo'li | hisobot; topilsa — olib tashlanadi |
| P2 | **Bog'liqliklar**: web va server `npm audit --omit=dev --audit-level=high` (0), `npm ci` toza o'rnatish, `openskp` 1.3.0 qotirilgan, lock fayllar mos | hisobot |
| P3 | **Toza yig'ish**: yangi klonda `npm ci` + `vite build` + server testlari + `tests/run-all.sh` (CI bilan bir xil tartib) | hisobot |
| P4 | **DEPLOY.md yangilash** (server/DEPLOY.md): yangi manzillar (`/loyihalar`, `/loyiha/:id`, `/sozlamalar/narxlar`, `/buyurtmalar`, `/kirish`, `/royxat`, `/tg`) uchun nginx; `GOOGLE_CLIENT_ID`; `npm ci` majburiy (openskp); rasmlar keshi; yangilash tartibi (zaxira → yangilash.sh → tekshiruv → qaytarish) | hujjat |
| P5 | **nginx namunasi** (server/nginx.conf): SPA yo'llari `app.html` ga, `/api` proksi, `/data/rasm/` kesh sarlavhasi, `/sw.js` kesh yo'q, CSP bilan mos; faqat repo fayli (serverda tahrirlanmaydi) | fayl |
| P6 | **Production sozlama tekshiruvi** (server/production.js): JWT_SECRET (≥32), SMS/Google/AI ixtiyoriy, NODE_ENV; `.env.example` to'liq (sirlarsiz) | kod + test |
| P7 | **Eski narx sozlamalari**: serverda admin avval saqlagan ish haqi (12 000/40 000) bazada qoladi. Admin uchun "Sukut stavkalarga qaytarish" (Sozlamalar → Narxlar) yoki yangilash skriptida ogohlantirish | kod + test |
| P8 | **Yangilashdan keyingi tekshiruv skripti** (`server/tekshiruv.sh`): `/api/health`, `/`, `/app.html`, `/loyihalar`, `/kirish`, `/api/narxlar` (401), CSP sarlavhasi, `/sw.js` — faqat GET | skript + test |
| P9 | **Zaxira va qaytarish**: backup.js tekshiruvi (baza nusxasi tiklanadi), yangilash.sh qaytarish bosqichi | hisobot |
| P10 | **Yakuniy hisobot**: "production'ga o'tkazish ro'yxati" — egasi uchun qadamlar, buyruqlar, kutilgan natija (qo'lda bajariladi) | hujjat |

Xavf — PAST (serverga tegilmaydi). Orqaga qaytarish: `git revert`.

## 2. Qolgan ishlar (egasi qarori yoki alohida ish)
**A. Haqiqiy tekshiruv (egasi/texnolog):**
1. GibLab'ga `.project` import qilish va 1 arzon detalni kesish/prisadka.
2. Ustaga `.bpj` va `.b3d` ni Bazis'da ochtirish; natijani yuborish.
3. **Narxni haqiqiy buyurtma bilan solishtirish** — ERP'dagi 3–5 buyurtma bilan qator bo'yicha (Sonnet agent, ERP faqat GET). Bu "narx to'g'ri" deyishning asosi.

**B. Egasi javobini kutayotgan savollar:**
1. G-code qaysi stanokka (dialekt, kengaytma); NC (Excellon) o'qiladimi; PTP/XNC jadvalmi.
2. Katalogga qo'shiladigan modullar: krovat yon tumbasi, ochiladigan klassik shkaf, yumshoq oyoq (futbord), ramkali ko'zgu, shkaf ustiga antresol, ofis hujjat shkafi.
3. Narxsiz furnitura: TS-1730 (petlyami), nojka 90 mm, vint 4×40, shtanga, BZ-furnitura (evro 51, salazka, sharikli yo'naltiruvchi, samorez 16), push (Tip-On).
4. Hisobot PDF'da "ishlab chiqarish xarajati" ko'rinishi (mijoz ustamani hisoblay oladi) — yashirish tavsiyasi.
5. Xona o'lchami aytilmasa mebel sig'maganda xona avtomatik kattalashishi to'g'rimi.
6. Stoleshnitsa sukut dekori (hozir eng ko'p qoldiqli); `server/src` (eski variant, sukut kalit bor) o'chirilsinmi.

**C. Alohida ishlar:**
1. Miltillash (pastki qism) — loyiha fayli bilan takrorlash.
2. 2 xonali uy (bir nechta xona, devor, eshik) — katta ish, alohida TZ.
3. GibLab `.project` da detal nomi va kromka tomoni; teshiklar JSON to'liq (186 teshik).
4. Pauzada: Telegram mini ilova, huquqiy masala, git tarixini tozalash (egasi #226: "yo'q").

## 3. Tartib
1. P1–P10 (agent/prod) → `dizayn` → testchi → `main` → egasi serverga qo'lda.
2. A.3 (narxni buyurtma bilan solishtirish) — parallel, boshqa agent.
3. B va C — egasi javoblari bilan.
