# TZ-44 — ERP narxlari jonli: har 2 daqiqada avtomatik yangilanish

**Sana:** 2026-10-22 · **Navbat:** 44 · **Holat:** BOSHLANDI 2026-10-22 (egasi #295: "narxni to'g'irlab qo'y, katta ERPni tekshir, real timeda to'ladigan qil, har 2 daqiqada narxlar yangilanib tursin")
**Koordinator:** smart3d-51 chati. **Diqqat:** boshqa chatlar ishlayapti — faqat o'z fayllaringiz; push yo'q.

## ERP haqida tekshirilgan faktlar (2026-10-22, faqat GET)
- `GET /api/v2/products/` — **19 924 mahsulot**, sahifa **50 tadan** (sahifa hajmi oshmaydi) → to'liq o'qish ≈ 400 so'rov ≈ 7 daqiqa. Filtrlar: `category=<id>` ISHLAYDI, `search=` ISHLAYDI; `updated_after`, `ordering`, `sku`, `ids` — ISHLAMAYDI (e'tiborsiz qoldiriladi). Kategoriyalar: `GET /api/v2/products/categories/` (50 tadan sahifa).
- Mahsulot maydonlari: `price` (so'm, = `price_usd` × kurs; kurs ≈ 11 773,68), `price_usd`, `display_price_uzs`, `price_list_uzs` (sotuv narxi, masalan 7045 BS: 380 000 ≈ tannarx 282 568 × 1,35 — bizning ustama bilan mos), `updated_at`, `last_synced_at` (ERP o'zi bosh ERP (1C) dan oxirgi marta qachon yangilagani — 7045 BS uchun 2026-10-21 18:05: ya'ni **bizning yangilanishimiz ERP'ning o'z yangilanishidan tezroq bo'la olmaydi**).
- Xizmatlar: `GET /erp/services/api/manage/services/`. Kirish: Django forma (GET /login/ → csrfmiddlewaretoken → POST /login/), sessiya cookie.
- Mavjud tizim (TZ-37 3-faza): narx qatlamlari: fayl narxi < **ERP qatlami (`erp_narx` jadvali)** < admin qo'lda narxi (`mat_narx`). Ochiq `GET /api/erp-narx` → { plita:{ERP-kod: so'm}, furnitura:{ID: so'm}, sana }; brauzer uni fayl narxi ustiga qo'yadi (web/src/services/hisob.js, engine/adminQatlam.js). Hozir `erp_narx` ni faqat admin qo'lda yuklagan JSON to'ldiradi (server/routes/admin-erp.js, engine/erpSinxron.js: tekshirish, farq, tasdiq, qo'llash, qaytarish). **Shu quvur qayta ishlatiladi, dublikat qurilmaydi.**

## Bajariladigan ishlar
### Server (Backend agent)
1. `server/lib/erp-jonli.js` — fon poller. Sozlama faqat **muhit o'zgaruvchilari** (repoga YOZILMAYDI): `ERP_JONLI=1`, `ERP_URL` (sukut https://mebelcity.bittada.uz), `ERP_LOGIN`, `ERP_PASSWORD`. Yo'q bo'lsa — o'chiq (xato emas). Login — Django forma; sessiya tugasa (login sahifasiga yo'naltirish) qayta kirish. **Faqat GET** (login POST dan tashqari); `User-Agent: Smart3D-sync`; taym-aut; xatoda eksponensial kechikish (2→4→8… max 15 daqiqa); bir vaqtda faqat bitta aylanish; ERP ishlamasa — oxirgi yaxshi narxlar qoladi, sayt to'xtamaydi.
2. **Nimani o'qiydi (ERP yukini o'lchab):** ilova ishlatadigan to'plam (plita, kromka, stoleshnitsa, furnitura, xizmat; mavjud kataloglar: sheet-catalog, furnitura-catalog, stoleshnitsa-erp, services, furnitura-boglash bog'langanlari) — kategoriya (`category=`) bo'yicha. Jadval: **qaynoq to'plam** (materials.json plitalari, sukut ERP plitalari, bog'langan furnitura, xizmatlar — taxminan ≤ 60 so'rov) **har 2 daqiqada**; **to'liq to'plam** (kategoriyalar bo'yicha aylanma, ≤ 1 so'rov/soniya) **har 15 daqiqada**; admin "Hozir" tugmasi. 19 924 ta hamma mahsulotni har safar O'QIMA.
3. **Qo'llash — mavjud quvur orqali (`erpSinxron.js` farq/qo'llash mantig'i, `erp_narx` qatlami):**
   - narx ±30% (sozlanadi) ichida o'zgarsa — avtomatik qo'llanadi;
   - >30% o'zgarish, 0/yo'q/manfiy narx, noaniq moslik (bir nechta mos, SKU farqi) — **qo'llanmaydi**, admin "tasdiq kutadi" ro'yxatiga tushadi (mavjud tasdiq oqimi);
   - admin qo'lda narxi (`mat_narx`) ustun — o'zgarmaydi;
   - USD narx va kurs (`price/price_usd`) saqlanadi; kurs o'zgarsa hamma so'm narxi bir vaqtda siljiydi — bu normal, lekin kurs >10% sakrasa — tasdiq.
   - Har o'zgarish `admin_audit` ga ("tizim: ERP jonli", eski → yangi) va mavjud qaytarish mexanizmiga yoziladi.
4. **API (shartnoma):**
   - `GET /api/erp-narx` (ochiq, mavjud) shakli o'zgarmaydi + qo'shimcha maydonlar: `versiya` (butun son, har qo'llashda +1), `yangilangan` (ISO), `jonli: { yoqilgan, oxirgi_muvaffaqiyat (ISO|null), manba_sana (ERP last_synced_at eng yangisi), xato_soni, kurs }`; `ETag` / `If-None-Match` → 304 (arzon so'rov).
   - `GET /api/admin/erp/jonli` → holat + oxirgi 50 o'zgarish + tasdiq kutayotganlar soni; `POST /api/admin/erp/jonli/hozir` (admin, 30 soniyada 1 marta); `PUT /api/admin/erp/jonli` `{ pauza: bool, chegara_foiz: 5..100 }` (admin). Xato kodlari `S3D-ERP-xxx` (app/js/xatolar.js, 3 tilda).
5. Baza: faqat yangi jadval/ustun (holat, tarix); migratsiya ikki marta ishlasa zararsiz; zaxira (backup.js) yangi jadvalni ham oladi.
6. Testlar: **soxta ERP serveri** (lokal http: login + sahifalangan products + services) — haqiqiy ERP'ga HECH QACHON so'rov yuborilmaydi testda. Tekshiriladi: login, sessiya yangilanishi, qaynoq/to'liq jadval, ±30% qoidasi, tasdiq kutish, `mat_narx` ustunligi, ETag/304, ERP o'chganda oxirgi narx qolishi, env yo'q bo'lsa o'chiq, parol logga/javobga/xatoga CHIQMAYDI.

### Brauzer va admin (Frontend agent)
7. `web/src/services/hisob.js` va narx oqimi: ilova ochiq va tab ko'rinib turganda har **120 soniyada** `GET /api/erp-narx` (ETag); `versiya` o'zgarsa narx qatlamini yangilab narxni **qayta hisoblaydi** (foydalanuvchi ishini buzmasdan: tanlov, chizma, bosilgan joy o'zgarmaydi), qisqa xabar "Narxlar yangilandi (N ta)". Tab yashirin bo'lsa to'xtaydi, qaytganda darrov bir marta tekshiradi. Tarmoq xatosi — jimgina keyingisiga.
8. **Narx panelida "ERP narxlari: HH:MM" ko'rsatkichi:** yangi (≤10 daqiqa) — oddiy; eski (>10 daqiqa) yoki `jonli.yoqilgan=false`/ERP xatosi — ogohlantirish "ERP bilan aloqa yo'q — oxirgi narx HH:MM". Mavjud dizayn tokenlari/komponentlari, emoji yo'q, 3 til.
9. **Tasdiqlangan buyurtma/kotirovka narxi qotib qolishi kerak:** hozir buyurtma narxi qanday saqlanishini tekshir (server saqlaydimi yoki ochilganda qayta hisoblanadimi). Qayta hisoblansa — tasdiqlash vaqtidagi narx saqlansin (snapshot), jonli yangilanish eski buyurtmani o'zgartirmasin. Allaqachon snapshot bo'lsa — faqat tasdiqlab hisobotga yoz.
10. **Admin panel (`/admin/erp`, admin3 yaratgan bo'lim):** "Jonli sinxronlash" kartasi: holat (yoqilgan/pauza/o'chiq), oxirgi muvaffaqiyat, xato soni, kurs, "Hozir sinxronla" tugmasi, pauza almashtirgich, chegara (%) maydoni, oxirgi o'zgarishlar jadvali, tasdiq kutayotganlar (mavjud tasdiq oqimiga havola). 
11. Testlar: mock API (brauzer testi: versiya o'zgarsa narx yangilanadi va xabar chiqadi; tab yashirinda so'rov yo'q; eski narx ogohlantirishi), admin UI (haqiqiy server testi + soxta ERP).

## Qabul
- Soxta ERP'da narx o'zgardi → 2 daqiqa ichida brauzerdagi narx yangilandi, xabar chiqdi, eski buyurtma narxi o'zgarmadi.
- Katta o'zgarish/0 narx/noaniq — qo'llanmadi, adminda "tasdiq kutadi".
- ERP o'chiq → oxirgi narx qoladi, ogohlantirish chiqadi, sayt ishlaydi. Env yo'q → o'chiq, xato yo'q.
- Parol hech qayerda (log, javob, fayl, commit) yo'q.
- Barcha eski testlar yashil (run-all, server, UI admin va narx).

## Tegadigan fayllar
`server/lib/erp-jonli.js` (yangi), `server/routes/admin-erp.js`, `server/lib/sxema.js`, `server/index.js`, `app/js/engine/{erpSinxron,adminQatlam}.js` (faqat zarur bo'lsa), `app/js/xatolar.js`, `server/.env.example`, `server/DEPLOY.md`, `web/src/services/hisob.js`, narx paneli (web/src/features/editor/pricing/*), `web/src/features/admin/*` (ERP bo'limi), lug'atlar, testlar. **Tegilmaydi:** tasdiqlangan dizayn, engine narx formulalari, ustama.

## Egasi uchun eslatma
Serverga qo'yganda `.env` ga `ERP_JONLI=1`, `ERP_LOGIN`, `ERP_PASSWORD` qo'shing (alohida, faqat o'qish huquqli ERP akkaunti tavsiya etiladi). ERP'ning o'zi bosh ERP (1C) dan narxni har safar emas, vaqti-vaqti bilan oladi (`last_synced_at`) — jonli yangilanish shundan tezroq bo'lmaydi.

## Xavf: YUQORI (narx hisobi + tashqi tizim). Yumshatish: ±30% chegara, tasdiq, qo'lda narx ustun, tarix va qaytarish, faqat GET. Orqaga qaytarish: `ERP_JONLI` ni o'chirish yoki `git revert`.

---

## Server natijasi (2026-10-22, `agent/erpjonli`)
**Server 1–6 bandlar bajarildi** (poller, qaynoq/to'liq jadval, ±30% qoidasi va tasdiq, API, baza, soxta ERP testlari). Frontend/Admin UI (7–11) — alohida agent. ERP'ga haqiqiy so'rov YUBORILMADI (faqat lokal soxta ERP). Haqiqiy ERP login formasi va javob shakllari **sinalmagan** (parser maydon nomlarini sahifadan o'qiydi, sahifalash `page` yoki `next` so'rov qatori bilan ishlaydi) — egasi birinchi yoqishda Admin → ERP holatini kuzatsin.

### API shartnomasi
**`GET /api/erp-narx`** (ochiq, `Cache-Control: no-cache`, `ETag`, `If-None-Match` → `304` bo'sh tana). Sarlavhalar (304 da ham): `X-Erp-Versiya`, `X-Erp-Oxirgi` (oxirgi muvaffaqiyatli sinxron ISO yoki bo'sh).
```json
{ "plita": {"ERP-3g31ig": 341761}, "furnitura": {"90000001": 76800}, "sana": "2026-10-22",
  "versiya": 17, "yangilangan": "2026-10-22T07:12:00.000Z",
  "jonli": { "yoqilgan": true, "pauza": false, "oxirgi_muvaffaqiyat": "2026-10-22T07:14:01.000Z", "manba_sana": "2026-10-21T18:05:00Z",
             "xato_soni": 0, "xato_kodi": "", "kurs": 11773.68, "eski": false } }
```
- `versiya` — har qo'llashda +1 (avtomatik, admin tasdig'i, sukutga qaytarish, qaytarish); `eski` — server soatida oxirgi muvaffaqiyat >10 daqiqa (o'chiq bo'lsa doim false); `yoqilgan:false` — ERP_JONLI yo'q.
- **ETag** narxlar + versiya + jonli holatning qo'pol ko'rinishi (oxirgi muvaffaqiyat 5 daqiqalik bo'lak bilan): narx o'zgarmasa har 2 daqiqada o'zgarmaydi → 304 ishlaydi. 304 da tana yo'q — `jonli.oxirgi_muvaffaqiyat` eskirmasligi uchun brauzer `X-Erp-Oxirgi` sarlavhasini ham o'qisin yoki `eski` bayrog'iga tayansin (u ETag'ga kiradi: o'zgarsa 200 keladi).
**Admin** (faqat admin, aks holda 404 `S3D-AUTH-006`):
- `GET /api/admin/erp/jonli` → `{ yoqilgan, sabab ('' | ochirilgan | env_yoq | url_yaroqsiz), manzil, pauza, chegara_foiz, band, versiya, yangilangan, oxirgi_urinish, keyingi_urinish, oxirgi_muvaffaqiyat, manba_sana, xato_soni, xato_jami, oxirgi_xato:{kod,matn,vaqt}|null, eski, kurs, kurs_qabul, kurs_kutadi:{eski,yangi}|null, keyingi_qaynoq, keyingi_toliq, oxirgi_qaynoq, oxirgi_toliq (aylanish natijasi: sorov, kategoriya, mahsulot, mos, qollandi, kutadi, noaniq, rad, davomiyligi_ms, xato), kategoriyalar:{jami,kashf,bizniki}, sozlama:{qaynoq_soniya,toliq_soniya,taym_aut_soniya,eski_daqiqa}, tasdiq_kutadi:{soni, ogohlantirish, partiya_id, sabab:{katta_ozgarish:n,…}}, ozgarishlar:[≤50 × {id,vaqt,tur,kalit,nom,eski,yangi,foiz,harakat (qollandi|kutadi|rad|qaytarildi),sabab,partiya_id}] }`
- `POST /api/admin/erp/jonli/hozir` `{ toliq?: bool, kut?: bool }` → `202 { ok, boshlandi, tur }` (kut=true — tugaguncha ≤25 s kutadi → `200 { ok, boshlandi, tur, tugadi, natija }`). 30 soniyada 1 marta.
- `PUT /api/admin/erp/jonli` `{ pauza?: bool, chegara_foiz?: 5..100 }` → `{ ok, pauza, chegara_foiz }`.
- Tasdiq kutayotganlar — mavjud `erp_partiya` qoralamasi (`manba:'jonli'`, `fayl_nom:'ERP jonli — tasdiq kutadi'`): `GET /api/admin/erp` ro'yxatida `manba` maydoni bor; `GET /api/admin/erp/:id`, `POST /api/admin/erp/:id/qollash`, `DELETE /api/admin/erp/:id` (o'chirish = shu narxlar rad etildi) o'zgarmagan. Qator `sabab`: `katta_ozgarish | kurs_sakradi | birinchi_narx | narx_yoq`.
- Audit/Tarix: avtomatik qo'llash — bo'lim `erp`, `kim: 'tizim: ERP jonli'`, odatdagi "Qaytarish" ishlaydi; sozlama/hozir — bo'lim `erp_jonli`.
- Xato kodlari (uz — `app/js/xatolar.js`; ru/en `web/src/i18n/{ru,en}.json` da `xato.S3D-ERP-…` Frontend agenti qo'shadi): `S3D-ERP-001` o'chiq (409), `-002` ERP'ga kirib bo'lmadi, `-003` ERP javob bermadi, `-004` ERP javobi tushunarsiz, `-005` band (409), `-006` pauzada (409), `-007` "Hozir" tez-tez (429), `-008` sozlama noto'g'ri (400). 101+ — brauzer uchun band.
- Muhit: `ERP_JONLI=1`, `ERP_URL`, `ERP_LOGIN`, `ERP_PASSWORD` (`server/.env.example`, `server/DEPLOY.md` §12).
- **Frontend agenti uchun (web/ ga server agenti tegmadi):** `bash tests/run-all.sh` dagi `verify_til --qatiy` shu 8 kod ru/en lug'atida bo'lishini talab qiladi — `web/src/i18n/ru.json` va `en.json` ga qo'shing:
```json
"xato.S3D-ERP-001": "Живая синхронизация ERP отключена (на сервере не заданы ERP_JONLI, ERP_LOGIN, ERP_PASSWORD)",
"xato.S3D-ERP-002": "Не удалось войти в ERP — проверьте логин и пароль",
"xato.S3D-ERP-003": "ERP не отвечает — сохраняются последние цены",
"xato.S3D-ERP-004": "Непонятный ответ ERP — сохраняются последние цены",
"xato.S3D-ERP-005": "Синхронизация уже выполняется — дождитесь завершения",
"xato.S3D-ERP-006": "Живая синхронизация ERP на паузе — сначала возобновите",
"xato.S3D-ERP-007": "Кнопку «Синхронизировать сейчас» можно нажимать не чаще раза в 30 секунд",
"xato.S3D-ERP-008": "Неверная настройка живой синхронизации (пауза: да/нет, порог: 5…100 %)"
```
```json
"xato.S3D-ERP-001": "Live ERP sync is off (ERP_JONLI, ERP_LOGIN, ERP_PASSWORD are not set on the server)",
"xato.S3D-ERP-002": "Could not sign in to ERP — check the login and password",
"xato.S3D-ERP-003": "ERP is not responding — the last prices are kept",
"xato.S3D-ERP-004": "ERP returned an unreadable response — the last prices are kept",
"xato.S3D-ERP-005": "A sync is already running — wait for it to finish",
"xato.S3D-ERP-006": "Live ERP sync is paused — resume it first",
"xato.S3D-ERP-007": "The \"Sync now\" button can be pressed once every 30 seconds",
"xato.S3D-ERP-008": "Invalid live-sync setting (pause: yes/no, threshold: 5…100 %)"
```
- Tasdiq qatorining `sabab` kodlari (`katta_ozgarish`, `kurs_sakradi`, `birinchi_narx`, `narx_yoq`) va `harakat` qiymatlari (`qollandi`, `kutadi`, `rad`, `qaytarildi`) UI'da 3 tilga o'giriladi. Eski `GET /api/erp-narx` sinovlari (`admin-faza3.test.js erpNarx`, `tests/ui/web_admin3Haqiqiy.mjs`) yangi maydonlarni e'tiborsiz qoldiradigan qilib moslangan.

