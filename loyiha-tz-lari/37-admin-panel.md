# TZ-37 — Universal admin panel (`smart.bittada.uz/admin`) va standart konstruksiya

**Sana:** 2026-10-18 · **Navbat:** 37 · **Holat:** 1-FAZA BAJARILDI 2026-10-18 (`main` f42a318; backend 43161a5, frontend 02b9475; admin API real serverda tekshirildi). **2-FAZA BAJARILDI 2026-10-21** (tarmoq `agent/admin2`, `main`'ga hali o'tkazilmagan — koordinator birlashtiradi): 3 Materiallar, 4 Modullar katalogi, 7 Foydalanuvchilar/loyihalar/buyurtmalar. Qoldi: 3-faza (tizim, ERP sinxron, tarix/qaytarish kengaytmasi). Asos — 1-faza (egasi #254, #257 "boshla unda"; asos: #254: "admin panel linkini ber, kod yozmasdan hamma narsani tuzata olay; ideal va universal; smart.bittada.uz/admin")
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
- **2-faza (BAJARILDI 2026-10-21):** 3 Materiallar, 4 Modullar katalogi, 7 Foydalanuvchilar/buyurtmalar — pastdagi "2-faza natijasi" va "API shartnomasi (2-faza)".
- **3-faza (kutilmoqda):** 8 Tizim, ERP sinxronlash, o'zgarishlar tarixi va orqaga qaytarish.

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

---

## 2-faza natijasi (2026-10-21, `agent/admin2`)
Umumiy qoida (1-fazadagidek): fayllar (`app/data/*.json`) **o'zgarmaydi**; admin qiymati bazada, brauzer ochiq GET'dan olib fayl ustiga qo'yadi (`app/js/engine/adminQatlam.js`, `web/src/services/hisob.js loadData/createHisob`) — **baza ustun**; admin qatorni o'chirsa ("Fayldagiga qaytarish") fayldagi qiymat qaytadi. Server yo'q/xato bo'lsa — jim, fayldagi qiymatlar. O'zgarish ilovada sahifa qayta ochilganda ko'rinadi. Hamma yozuv `admin_audit` ga (kim, qachon, eski → yangi), "Tarix" bo'limidan qaytariladi.

| Bo'lim | Nima qilinadi | Hisobga ta'siri |
|---|---|---|
| **3 Materiallar** ("Asosiy 100", `dekor-asosiy.json`) | **rang** (#rrggbb; admin bergan rang "aniq" hisoblanadi), **rasm** (PNG/JPEG/WebP, 600 KB gacha, bazada; 3D va plitkada rang o'rniga), **varaq narxi** (har ERP varag'i uchun, so'm/varaq, 1…50 000 000) | rang/rasm — 3D va plitka (bir manba); **narx — HISOBGA to'g'ridan-to'g'ri** (tanlangan ERP plitasining `sheet_price`, raskroy list narxi) |
| **4 Modullar katalogi** (`fragments*.json` + texnika: 130 modul; dizayn tarmog'i qo'shilgach 191 — kod fayl ro'yxatini o'zi oladi) | **nom** (uz/ru/en), **ko'rinish** (yashirish), **o'lcham chegarasi** (eni/chuqurligi/bo'yi min–max, butun mm 1…20000), **narx rejimi** (unit/m2/mm) | yashirish — faqat tanlash ro'yxatida va AI/konstruktor tanlovida (`H.korinadiKatalog`); ochiq loyihalar, 3D va narx **o'zgarmaydi** (qoida 2.7). Chegara — `clampSize`, ogohlantirish, AI. **Narx rejimi** hozirgi narxga ta'sir qilmaydi (narx detal+furnituradan; `price_mode` faqat eski `price.js` o'lcham ogohlantirishlarida) — UI shuni aytadi |
| **7 Foydalanuvchilar / loyihalar / buyurtmalar** | ro'yxat + qidirish (ism, email, telefon raqamlari, sex, #id) + holat/rol filtri + sahifalash; foydalanuvchi tafsiloti (loyiha va buyurtmalari); **bloklash/ochish** (sabab bilan); loyihalar va buyurtmalar umumiy ro'yxati (hujjatsiz) | bloklangan: parol/SMS/Google/Telegram bilan kira olmaydi (`S3D-AUTH-021`), ochiq kaliti yaroqsiz (401 — sayt chiqaradi); ma'lumoti saqlanadi. Telefon ekranda `+998 XX XXX XX XX` |

**Ustunlik (modul chegarasi):** modulga admin chegarasi > sex standarti (TZ-14, `engine/standart.js`, server o'zgartirsa ham) > fayl. **Cheklovlar (ataylab):** o'rnatma texnika uchun faqat nom va ko'rinish; yuklangan rasm almashtirilsa eskisini qaytarib bo'lmaydi (faqat yangi qo'shilganni olib tashlash), rang/narx/katalog/bloklash — qaytariladi; adminni va o'zini bloklab bo'lmaydi (`S3D-ADM-017`).

### API shartnomasi (2-faza)
Hamma `/api/admin/*` — `role=admin` (aks holda 404 `S3D-AUTH-006`), yozuvchi so'rov CSRF (Origin) dan o'tadi, har yozuv `admin_audit` ga. Jadvallar: `mat_admin`, `mat_rasm`, `mat_narx`, `katalog_admin`, `users.bloklangan/blok_sabab/blok_vaqt` (`server/lib/sxema.js adminSxema2`).
1. **Materiallar** (`server/routes/admin-materiallar.js`): ochiq `GET /api/materiallar` → `{dekor:{kalit:{rang_hex?, rasm?}}, narx:{ERP-kod: uzs}}`; ochiq `GET /api/materiallar/rasm/:kalit` (rasm baytlari, ETag, nosniff); `GET /api/admin/materiallar` → `{dekorlar:[{kalit, dekor, rang, rang_fayl, rang_manba, rasm, variantlar:[{kod, nom, narx, narx_fayl, narx_manba}], tahrir}]}`; `PUT|DELETE /api/admin/materiallar/dekor/:kalit` `{rang_hex}`; `PUT|DELETE …/dekor/:kalit/rasm` `{data: base64}`; `PUT|DELETE /api/admin/materiallar/narx/:kod` `{uzs}`. Xatolar: `S3D-ADM-011` (topilmadi), `-012` (rang/narx), `-013` (rasm), `-016` (qaytariladigan narsa yo'q).
2. **Katalog** (`admin-katalog.js`): ochiq `GET /api/katalog` → `{modullar:{kod:{nom_uz?, nom_ru?, nom_en?, yashirin?, min_w…max_h?, price_mode?}}}`; `GET /api/admin/katalog` → `{modullar:[{kod, nom_fayl, nom:{uz,ru,en}, yashirin, chegara, chegara_fayl, chegara_baza, narx_rejim, narx_rejim_fayl, texnika, tahrir}]}`; `PUT /api/admin/katalog/:kod` (qisman; `null` — shu maydon fayldagidek), `DELETE` (butunlay faylga). Xatolar: `S3D-ADM-014` (modul yo'q), `-015` (qiymat noto'g'ri).
3. **Foydalanuvchilar** (`admin-foydalanuvchilar.js`): `GET /api/admin/foydalanuvchilar?q=&rol=&holat=&limit=&offset=` → `{jami, items, limit, offset}`; `GET …/:id` (+ `loyihalar_royxat`, `buyurtmalar_royxat`); `PUT …/:id/blok` `{bloklangan, sabab}`; `GET /api/admin/loyihalar?q=&user=&arxiv=`; `GET /api/admin/buyurtmalar?q=&holat=`. Xatolar: `S3D-ADM-017` (bloklab bo'lmaydi), `S3D-AUTH-007` (topilmadi), `S3D-AUTH-021` (bloklangan kirish).
4. **Audit/qaytarish:** `bolim` = `materiallar` (kalit `dekor:|rasm:|narx:`), `katalog` (kalit = modul kodi), `foydalanuvchilar` (kalit = id); `POST /api/admin/qaytar/:auditId` (qaytaruvchilar `admin-panel.js` registri orqali).
5. **Sahifa:** `/admin/(materiallar|katalog|foydalanuvchilar)` (server `ILOVA_YOLI`, `web/src/app/marshrutlar.js`), `web/src/features/admin/{Materiallar,Katalog,Foydalanuvchilar}.jsx`, lug'at uz/ru/en.

**Testlar:** `server/test/admin-faza2.test.js`; `tests/verify_admin_qatlam.mjs` (qatlam, hisobga ta'sir, ustunlik, AI tanlovi); `tests/ui/web_admin2Haqiqiy.mjs` (haqiqiy server: yuklash, bloklash, ilovadagi ta'sir, 3 til, 390 px).

**Egasi qarori kerak:** (1) "narx rejimi" hisobga ta'sir qilsinmi (hozir faqat eski ogohlantirish) — yoki bo'limdan olib tashlansinmi; (2) bloklash adminni qamramaydi — admin akkauntini ham bloklash kerakmi; (3) rasm almashtirilganda eskisini saqlab qaytarish kerakmi (hozir yo'q — baza hajmi); (4) o'rnatma texnika (7 ta) uchun o'lcham chegarasi kerakmi.

