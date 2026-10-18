# TZ-37 — Universal admin panel (`smart.bittada.uz/admin`) va standart konstruksiya

**Sana:** 2026-10-18 · **Navbat:** 37 · **Holat:** 1-FAZA BAJARILDI 2026-10-18 (`main` f42a318; backend 43161a5, frontend 02b9475; admin API real serverda tekshirildi). Qoldi: 2–3-fazalar (materiallar, modullar katalogi, foydalanuvchilar, tizim). Asos — 1-faza (egasi #254, #257 "boshla unda"; asos: #254: "admin panel linkini ber, kod yozmasdan hamma narsani tuzata olay; ideal va universal; smart.bittada.uz/admin")
**Koordinator:** smart3d-51 chati.

## Maqsad
Egasi (admin) koddan va fayllardan foydalanmay, brauzerdagi bitta panelda narx, furnitura bog'lanishi, materiallar, katalog, tayyor promptlar va sozlamalarni o'zgartiradi. Hammasi bazada saqlanadi, o'zgarish tarixi bor, orqaga qaytarish mumkin.

## Hozir bor (qayta ishlatiladi, dublikat qurilmaydi)
- Sozlamalar → Narxlar (stavkalar, `/api/narxlar`), Sex standartlari, Qoldiqlar, Xatolar jurnali — faqat admin. Panel shularni bitta joyga yig'adi.

## Bo'limlar
| № | Bo'lim | Nima qiladi |
|---|---|---|
| 1 | **Narxlar** | plita, kromka, xizmatlar (raspil, prisadka, Bazis), ustama; manba va sana; ERP'dan yangilash |
| 2 | **Furnitura bog'lash** | Bazis kodi → ERP mahsulot; **birlik va koeffitsient** (juft = 0,5; kg → dona); narxsizlar ro'yxati |
| 3 | **Materiallar** | "Asosiy 100", rang, rasm, narx |
| 4 | **Modullar katalogi** | 130 modul: nom, ko'rinish (yashirish), o'lcham chegarasi, narx rejimi |
| 5 | **Tayyor promptlar** | 50 ta sinalgan prompt: qo'shish, tahrir, tartib, xona turi |
| 6 | **Standart konstruksiya** | eng ko'p ishlatiladigan standart (korpus, qalinlik, fasad, ruchka, birikma, oyoq) — AI va konstruktor shundan boshlaydi |
| 7 | **Foydalanuvchilar, loyihalar, buyurtmalar** | ko'rish, qidirish, bloklash |
| 8 | **Tizim** | AI (kalit holati, model), Google, SMS, xatolar jurnali, zaxira, o'zgarishlar tarixi |

## Manzil va kirish
- `https://smart.bittada.uz/admin` (alohida subdomen emas — shu domen, `/admin` yo'li). Server yo'li `ILOVA_YOLI` ga qo'shiladi.
- Faqat `role=admin`; boshqalarga 404. Sessiya cookie, CSRF (Origin) tekshiruvi, so'rov chegarasi, har yozuv — `audit` jurnaliga (kim, qachon, eski → yangi).

## Fazalar
- **1-faza (birinchi navbat):** `/admin` qobig'i + 1 Narxlar (mavjud sahifa ko'chadi) + 2 Furnitura bog'lash (koeffitsient bilan) + 5 Tayyor promptlar + 6 Standart konstruksiya.
- **2-faza:** 3 Materiallar, 4 Modullar katalogi, 7 Foydalanuvchilar/buyurtmalar.
- **3-faza:** 8 Tizim, ERP sinxronlash, o'zgarishlar tarixi va orqaga qaytarish.

## Tegadigan fayllar
`server/routes/*` (yangi `admin-*.js`), `server/lib/sxema.js` (jadvallar), `server/routes/sahifalar.js` (`/admin`), `web/src/features/admin/*` (yangi), `web/src/app` (sahifa tanlash), `app/js/engine/cutlist.js` (koeffitsient), `app/data/furnitura-boglash.json` (bazaga ko'chadi, fayl zaxira bo'lib qoladi), lug'atlar (uz, ru, en), testlar.
**Tegilmaydi:** tasdiqlangan dizayn (ilova ekranlari), server sozlamalari (nginx, systemd), mijoz ma'lumotlari.

## Xavf, moliya, orqaga qaytarish
- **Xavf: YUQORI** — yozish huquqi bor yangi API; narx hisobiga ta'sir qiladi. Yumshatish: faqat admin, tarix, tasdiq oynasi, har o'zgarishni qaytarish, testlar, bazaning nusxasi bilan sinov.
- **Moliya:** narx stavkalari o'zgaradi — faqat egasi o'zi o'zgartiradi, sukut qiymatlariga qaytarish tugmasi bor.
- **Orqaga qaytarish:** `git revert` va panel ichida har qiymatning oldingi holati.

## Qabul
- Admin kiradi, narx stavkasini o'zgartiradi — kalkulyatsiya darhol yangilanadi; admin bo'lmagan foydalanuvchi `/admin` ga kira olmaydi (404).
- Furnitura bog'lash: yo'naltiruvchi juft (0,5 koeffitsient), samorez kg → dona; narxsizlar ro'yxati bo'sh.
- Tayyor promptlar: 50 ta, har biri bosilganda sinalgan natija beradi.
- Barcha testlar yashil.

## API shartnomasi (1-faza) — backend va frontend agentlari shu bo'yicha ishlaydi
Hamma `/api/admin/*` — faqat `role=admin` (aks holda 404 `S3D-AUTH-006`), yozuvchi so'rovlar CSRF (Origin) tekshiruvidan o'tadi, har yozuv `admin_audit` jadvaliga (kim, qachon, bo'lim, kalit, eski, yangi) yoziladi. Xato kodlari `S3D-ADM-xxx` (app/js/xatolar.js, 3 tilda).
1. **Furnitura bog'lash** (jadval `furn_boglash`: kod PK, erp_id, koef REAL sukut 1, izoh):
   - `GET /api/admin/furnitura-boglash` → `{links:[{kod, erp_id, koef, izoh, nom, narx, manba:'baza'|'fayl'}], narxsiz:[kod,...]}` (fayl `app/data/furnitura-boglash.json` + baza birlashtirilgan, baza ustun).
   - `PUT /api/admin/furnitura-boglash/:kod` `{erp_id, koef, izoh}` (erp_id katalogda bor bo'lishi shart, koef 0<x≤1000), `DELETE` shu yo'l (faylga qaytadi).
   - Ochiq (autentifikatsiyasiz) `GET /api/furnitura-boglash` → `{links:{kod: erp_id}, koef:{kod: koef}}` — hisob (hisob.js loadData) shuni o'qiydi, internet/server yo'q bo'lsa — `data/furnitura-boglash.json` zaxira. Furnitura narxi = katalog narxi × koef (app/js/engine/cutlist.js; koef yo'q = 1). Namuna: yo'naltiruvchi SO CLASS 55 625 (juft narxi) BZ-sharikovie_napravl_400_pr/_lev ga koef 0.5; samorez kg narxi uchun koef = 1 kg dagi dona soni ga teskari (admin kiritadi).
2. **Tayyor promptlar** (jadval `promptlar_admin`: id PK, kat, nom_uz/ru/en, matn_uz/ru/en, tartib INT, faol 0/1):
   - `GET/POST /api/admin/promptlar`, `PUT/DELETE /api/admin/promptlar/:id`; ochiq `GET /api/promptlar` (faol, tartib bo'yicha; `app/data/promptlar.json` + baza birlashtirilgan, baza ustun) — ilovadagi "Tayyor so'rovlar" kutubxonasi (features/editor/ai, promptlar.js) shuni oladi, zaxira — statik fayl. Dastlabki to'plam: mavjud 13 + tests/ui/web_qabul50.mjs dagi 48 ta OK prompt (xona turi bo'yicha guruhlangan, matni aynan sinalgan; maxsus noto'g'ri/kutilgan-xato promptlar kirmaydi) — jami kamida 50 ta.
3. **Standart konstruksiya** (sozlama `standart_konstruksiya` — `settings` jadvali):
   - `GET/PUT /api/admin/standart` → `{korpus:{nom,qalinlik}, fasad:{nom,qalinlik}, orqa:{nom,qalinlik}, polka:{nom,qalinlik}, ruchka:{tur,uzunlik}, birikma, tag:'oyoq'|'sokol', oyoqBalandlik}`; ochiq `GET /api/standart`. Konstruksiya tahlilchisi (app/js/engine/konstruksiyaTili.js specTekshir/matndanSpec) va AI matn qurilishi matnda aytilmagan qiymatlar o'rniga SHUNI ishlatadi (aytilgan qiymat ustun). Sukut: korpus LDSP 16, fasad MDF 16, orqa HDF 3, polka LDSP 16, birikma konfirmat, oyoq 100 mm (sex standartlari app/data/sex-standartlari.json bilan tekshirilsin, dublikat qurilmasin).
4. **Narxlar:** mavjud `/api/narxlar` (TZ-20/36) o'zgarmaydi; panel shu API'ni ishlatadi.
5. **Audit:** `GET /api/admin/audit?bolim=&limit=` → so'nggi o'zgarishlar; `POST /api/admin/qaytar/:auditId` — shu o'zgarishni eski qiymatga qaytaradi.
6. **Sahifa:** server `/admin` va `/admin/(narxlar|furnitura|promptlar|standart|tarix)` ni ilova sahifasiga yo'naltiradi (ILOVA_YOLI); frontend (`web/src/features/admin/*`, lug'at uz/ru/en) `/api/me` orqali admin ekanini tekshiradi, admin bo'lmasa — mavjud 404 ko'rinishi. Dizayn: mavjud dizayn tokenlari/komponentlari (Varaq, Toggle, tugmalar), emoji yo'q, Ikon.
