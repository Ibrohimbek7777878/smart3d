# TZ-37 — Universal admin panel (`smart.bittada.uz/admin`) va standart konstruksiya

**Sana:** 2026-10-18 · **Navbat:** 37 · **Holat:** 1-FAZA BAJARILDI 2026-10-18 (`main` f42a318; backend 43161a5, frontend 02b9475; admin API real serverda tekshirildi). **2-FAZA BAJARILDI 2026-10-21** (tarmoq `agent/admin2`, `main`'ga hali o'tkazilmagan — koordinator birlashtiradi): 3 Materiallar, 4 Modullar katalogi, 7 Foydalanuvchilar/loyihalar/buyurtmalar. **3-FAZA BAJARILDI 2026-10-22** (tarmoq `agent/admin3`, `main`'ga hali o'tkazilmagan — koordinator birlashtiradi): 8 Tizim, ERP sinxronlash (admin yuklagan JSON), o'zgarishlar tarixi kengaytmasi. Asos — 1-faza (egasi #254, #257 "boshla unda"; asos: #254: "admin panel linkini ber, kod yozmasdan hamma narsani tuzata olay; ideal va universal; smart.bittada.uz/admin")
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
- **3-faza (BAJARILDI 2026-10-22):** 8 Tizim, ERP sinxronlash, o'zgarishlar tarixi va orqaga qaytarish kengaytmasi — pastdagi "3-faza natijasi" va "API shartnomasi (3-faza)".

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

---

## 3-faza natijasi (2026-10-22, `agent/admin3`)
Umumiy qoida (1- va 2-fazadagidek): `/api/admin/*` — `role=admin` (aks holda 404 `S3D-AUTH-006`), yozuvchi so'rov CSRF (Origin) dan o'tadi, har yozuv `admin_audit` ga; fayllar (`app/data/*.json`) **o'zgarmaydi**; xato kodlari `S3D-ADM-xxx` (3 tilda).

| Bo'lim | Nima qilinadi | Hisobga ta'siri |
|---|---|---|
| **8 Tizim** (`/admin/tizim`) | **faqat ko'rish**: AI (yoqilganmi, provayder, model, **kalit: bor / yo'q** + qaysi o'zgaruvchida, yoqilmagan bo'lsa sababi, byudjet, oxirgi AI xatosi), Google, SMS (Eskiz), Telegram (sozlangan / yo'q, bog'langan foydalanuvchilar, 7 kunlik xatolar), xatolar jurnali (24 soat / 7 kun, eng ko'p kodlar, `rid`/kod bo'yicha qidiruv), zaxira holati (oxirgi nusxa, hajmi, yoshi; 36 soatdan eski — "eskirgan") | yo'q (o'qish). **Kalit/parol/token qiymati, uzunligi, boshi-oxiri hech qachon javobga chiqmaydi**; xato matni ichida tasodifan bo'lsa ham `lib/maxfiy.js` uni `[maxfiy]` ga almashtiradi. Model va kalit serverning muhit sozlamasida (qoida 5.5) — panelda o'zgartirilmaydi; zaxira panel orqali yaratilmaydi (cron) |
| **Tarix kengaytmasi** (`/admin/tarix`) | `admin_audit` va `narx_history` BITTA ro'yxatda; filtr: bo'lim, kim, sana oralig'i, holat (faol / qaytarilgan), kalit bo'yicha qidiruv; sahifalash ("Yana N ta"); har yozuvda eski → yangi (o'zgargan maydonlar) va **"Qaytarish"** — endi **narxlar** (xizmat, tanlov, ish haqi, ustama) ham qaytariladi | qaytarish — narx hujjati va tarix yangi yozuvlari (aynan eski qiymat, manba va sana bilan); bog'liq tozalash (o'chgan xizmatga bog'langan tanlov) ham tarixda |
| **ERP sinxronlash** (`/admin/erp`) | admin ERP'dan olingan **JSON**'ni yuklaydi → server tekshiradi va farqni ko'rsatadi (**hech narsa o'zgarmaydi**) → admin tanlab (guruh va qator belgisi) tasdiqlaydi → narxlar qo'llanadi → Tarix'dan qaytariladi yoki **"Sukutga qaytarish"** | plita varag'i va furnitura narxi — **hisobga to'g'ridan-to'g'ri** (fayl narxi ustiga ERP qatlami; admin qo'lda narxi ("Materiallar") bundan ustun); xizmat narxlari (raspil, kromka, prisadka, Bazis) — narx hujjatiga |

### ERP sinxron qanday ishlaydi (haqiqatan)
- **Jonli ERP ulanishi YO'Q.** Repoda ERP'ni xavfsiz o'qiydigan to'g'ridan-to'g'ri vosita topilmadi (`scripts/*` faqat egasi GET bilan olgan eksportni — `Smart3D_malumot/erp-*.json` — qayta ishlaydi). Shuning uchun usul: ERP'dan GET bilan olingan JSON (shu eksportlarning shakli: `_meta` + `mahsulotlar` yoki `xizmatlar`) panelga yuklanadi. Server ERP'ga ulanmaydi, ERP'ga hech narsa yozilmaydi (qoida 2.10).
- **Narx manbai:** mahsulot uchun `display_price_uzs` (materials.json va stoleshnitsa-erp.json ham shu maydondan); `price_list_uzs` (sotuv narxi) faqat ko'rsatiladi. So'm narx yo'q, dollar bor furnitura — dollar × katalogdagi kurs (`scripts/furnitura_narx_tiklash.py` qoidasi). ERP'da narx 0/yo'q — "narxsiz", mavjud narx o'zgarmaydi (o'ylab topilmaydi).
- **Moslash NOM bo'yicha** (boshidagi kod va belgilarsiz, `scripts/erp_rasmlar.py` dagi kabi), SKU ikkala tomonda bo'lsa — teng bo'lishi shart. **SKU yolg'iz yetarli emas:** haqiqiy ERP ma'lumotida bir SKU turli mahsulotda takrorlanadi (masalan `0171 PE` — ЛХДФ 3 mm va ЛДСП 16 mm; narx −47,7% xato bo'lardi). Noaniq (bir nechta mos, SKU farqi, ikki katalogga mos, birligi varaq emas — m², ERP'da takror) — **hech qachon qo'llanmaydi**, "noaniq" + sababi bilan ko'rsatiladi.
- **Holatlar:** o'zgardi · narx qo'yiladi (katalogda narx yo'q edi) · bir xil · ERP'da narx yo'q · qo'lda narx (ustun, qo'llanmaydi) · yangi (katalogda yo'q — qo'shilmaydi, faqat ro'yxat) · noaniq · faylda yo'q (fayl to'liq ro'yxat bo'lmasligi mumkin — o'zgarmaydi; soni xulosada, ro'yxat boshi 300 ta). Stoleshnitsa (m²) — faqat ko'rsatiladi (alohida fayl, `scripts/stoleshnitsa_erp.py`).
- **Qatlam tartibi** (past → yuqori): fayl narxi < ERP qatlami (`erp_narx`) < admin qo'lda narxi (`mat_narx`). Brauzer ochiq `GET /api/erp-narx` dan olib fayl ustiga qo'yadi (`engine/adminQatlam.js erpNarxQollash`, `web/src/services/hisob.js loadData`); server yo'q bo'lsa — fayldagi narxlar.
- **Xizmatlar:** ERP xizmatlar JSON'i mavjud `xizmatJadvalOqish` (Xizmat_narxlari.xlsx bilan bir xil qoidalar) orqali o'qiladi; admin qo'lda ("egasi") qo'ygan qiymat o'zgarmaydi; yangi xizmatlar faqat alohida belgi bilan qo'shiladi; hammasi `narx_history` ga ham yoziladi.
- **Qaytarish:** har qo'llash va sukutga qaytarish — `admin_audit` (`erp`, kalit `partiya:<id>` / `sukut:<id>`); qaytarilganda keyin boshqa o'zgargan qatorlar o'tkazib yuboriladi (soni tarixda). Qoralamalar: eng ko'pi 8 ta, 14 kun; oxirgi 20 yuklashning farq ro'yxati saqlanadi.
- **Xavfsizlik:** yuklangan fayl — ishonchsiz kirish: tur, uzunlik, `< >` va boshqaruv belgilari, narx chegarasi (≤ 10¹⁰), 20 000 qator, so'rov 2 MB gacha (brauzer ortiqcha maydonlarni tashlaydi).

### API shartnomasi (3-faza)
Jadvallar: `erp_partiya`, `erp_narx`, `narx_qaytar` (+ `narx_history` — `narxlar.js` dagi bilan bir xil, `IF NOT EXISTS`) — `server/lib/sxema.js adminSxema3`.
1. **Tizim** (`admin-tizim.js`): `GET /api/admin/tizim` → `{ vaqt, server, ai:{ yoqilgan, provayder, model, kalit:{ bor, manba, kerak }, sabab, byudjet, … }, google, sms, telegram, xatolar, zaxira }`. Batafsil jurnal — mavjud `GET /api/admin/xatolar?rid=|kod=`; AI sarfi — mavjud `GET /api/admin/ai-sarf`.
2. **Tarix** (`admin-tarix.js`): `GET /api/admin/tarix?bolim=&kim=&dan=&gacha=&holat=&q=&limit=&offset=` → `{ jami, items:[{ id ("a12" audit | "n5" narx), manba, bolim, kalit, eski, yangi, qaytarilgan, qaytariladi, vaqt, kim, kim_id }], bolimlar, kimlar }`; `POST /api/admin/narx-qaytar/:id` (narx_history raqami). Mavjud `GET /api/admin/audit` va `POST /api/admin/qaytar/:auditId` o'zgarmagan (eski shakl, orqaga moslik); bo'lim `erp` ham `qaytar` orqali qaytariladi.
3. **ERP** (`admin-erp.js`): `POST /api/admin/erp/yuklash {tur?, fayl_nom, json}` (201 qoralama) · `GET /api/admin/erp` · `GET /api/admin/erp/:id?guruh=&holat=&q=&limit=&offset=` · `POST /api/admin/erp/:id/qollash {tasdiq:true, guruhlar?, istisno?, yangi_xizmat?}` · `DELETE /api/admin/erp/:id` (qoralama) · `POST /api/admin/erp/sukut {tasdiq:true, guruh?}` · ochiq `GET /api/erp-narx`. Xatolar: `S3D-ADM-018` (yuklash topilmadi), `-019` (fayl noto'g'ri), `-020` (holat mos emas), `-021` (tasdiq yo'q / tanlov bo'sh), `-105` (brauzer: fayl o'qilmadi), mavjud `-001`, `-006`, `-007`, `-016`.
4. **Materiallar sahifasi** (`admin-materiallar.js`): `variantlar[].narx_erp` va `narx_manba: 'baza'|'erp'|'fayl'` (ERP qatlami ko'rinadi).
5. **Sahifa:** `/admin/(erp|tizim)` (server `ILOVA_YOLI`, `web/src/app/marshrutlar.js`), `web/src/features/admin/{Erp,Tizim,Tarix}.jsx` + `use*.js`, lug'at uz/ru/en; 10 bo'lim tabi.

**Testlar:** `server/test/admin-faza3.test.js` (25: tizim 8, tarix 8, ERP 9); `tests/verify_erp_sinxron.mjs` (43: tekshiruv, moslash, holatlar, xizmatlar, qatlam va hisobga ta'siri); `tests/ui/web_admin3Haqiqiy.mjs` (haqiqiy server: Tizim, Tarix, ERP yuklash→qo'llash→qaytarish→sukut, xizmatlar, 3 til, 390 px).

**Egasi qarori kerak:** (1) ERP narxi — `display_price_uzs` (tannarx; hozirgi qoida, materials.json va stoleshnitsa shundan) yoki `price_list_uzs` (sotuv narxi)? Sheet-catalog.json dagi narxlarning bir qismi ro'yxat narxiga teng (masalan 590 000 = list), shuning uchun ERP bilan farq ko'p chiqadi; (2) ERP'da bor, katalogda yo'q mahsulotlar (haqiqiy eksportda 157/300) hozir qo'shilmaydi (faqat ro'yxat) — katalogga qo'shish alohida ish (`scripts/id_berish.py`); (3) stoleshnitsa (m²) narxi sinxrondan tashqari (faqat ko'rsatiladi) — kerakmi; (4) zaxira "eskirgan" chegarasi 36 soat (kunlik cron, DEPLOY.md §8) — to'g'rimi; (5) AI modeli/kaliti va zaxira panel orqali o'zgartirilmaydi (server sozlamasi) — kerak bo'lsa alohida TZ.
