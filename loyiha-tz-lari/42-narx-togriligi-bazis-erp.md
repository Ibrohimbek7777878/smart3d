# TZ-42 — Narx to'g'riligi: Bazis materialini ERP mahsulotiga moslash, "varaqqa sig'madi", furnitura bog'lash, mijoz materiali

**Sana:** 2026-10-22 · **Navbat:** 42 · **Holat:** BOSHLANDI 2026-10-22 (egasi #283: "boshla to'g'irla"; asos: egasi #280–#282)
**Koordinator:** smart3d-51 chati. **Diqqat:** boshqa chatlar parallel ishlayapti (admin 3-faza, QA) — faqat o'z fayllaringiz.

## Haqiqiy taqqoslash (ERP, faqat o'qildi, 2026-10-22): sotuv hujjati 506234 "BIG ONE" — loyiha "Big one Ixtiyor bayavut oshxona"
| ERP qatori | Miqdor | Summa |
|---|---|---|
| ЛДСП Ультрадекор 4,575 Сатин BS 16мм (SKU 7045 BS) | 14 varaq × 355 000 | 4 970 000 |
| ЛХДФ 2,5мм 2800*2070 Белый (SKU 0110 PE) | 3 × 140 000 | 420 000 |
| Kromka ПВХ 19/0.8, 21/0.8, 35/0.8 | 228 + 36 + 1 m | 498 600 |
| Xizmatlar (raspil Holzma 2/1, ПВХ 19/1, 21/1, 35/1, prisadka: ЕВРО 309, ОВАЛ 29, ПЕТЛЕ 62 va h.k., Bazis5 ×10) | 16 qator | 2 227 900 |
| **Jami** | | **8 116 500** (furnitura qatorlari yo'q) |

Bizning hisob (smart.bittada.uz/loyiha/9): mijoz narxi 10 175 683, tannarx 7 977 463, aniqlik 35%, 25 qator narxsiz. Plita qatorlari: "ЛДСП, Сатин 4,6кв" 10 varaq = 3 417 610 (taxmin), "Акрил Shanghai UV 18мм Серый камень" 2 varaq = 1 042 800, "ХДФ Белый" 3 varaq = 420 000; "ЛДСП Сатин: 11 ta detal varaqqa sig'madi — tannarxga kirmagan".

## Sabablar (tekshirilgan) va vazifalar
1. **Material nomi ERP mahsulotiga mos kelmaydi.** Bazis nomi ("ЛДСП, Сатин 4,6кв") ERP "ЛДСП Ультрадекор 4,575 Сатин BS 16мм" (SKU 7045 BS, 355 000) bilan bog'lanmagan, shuning uchun narx "taxmin" va aniqlik 35%. → Bazis/loyiha material nomini ERP plitasiga moslash (SKU, nom normallashtirish: ro'yxatdagi 1281 ta ERP plita `app/data/sheet-catalog.json` / `materials-index.json`; "4,6кв"/"4,575", ishlab chiqaruvchi, dekor nomi, qalinlik). Ishonchli moslik bo'lsa — avtomatik; noaniq (bir nechta nomzod) bo'lsa — **taxmin qilmaydi**, foydalanuvchiga/adminga tanlash uchun nomzodlar ro'yxati (qoida 4.3: o'ylab topilmaydi).
2. **"11 ta detal varaqqa sig'madi — tannarxga kirmagan"** — narx jimgina kamayadi (ERP'da 14 varaq, bizda 10). → sababini aniqlash (varaq o'lchami noto'g'ri olinishi yoki detal varaqdan katta) va tuzatish; hal bo'lmagan taqdirda sig'maganlar **yuza bo'yicha taxminiy narx** bilan hisobga qo'shilsin ("taxmin" belgisi bilan) — narx kamayib ketmasin.
3. **25 ta Bazis furnitura nomi ERP bilan bog'lanmagan** (Петля прямая/полугорбатая кухня симм, Ножка регулируемая 100..125, Направляющие Салазка / Тандем / шар. полн.выдв. L300 1045-12 Z, Сушилка/Сушка SU02 + Решетки, Вытяжка 2 дв, Держатели, Евровинт 7x50 / 7x51, Эксцентрик пластик, samorez 16, Евро 51мм Алкан, POLKADERJATEL; `pr-1`, `pr-9`, `Фрагмент3` — Bazis ichki nomlari). → mavjud ERP katalogi (`app/data/furnitura-catalog.json`, 3089 ta) bo'yicha **bir qiymatli** mosliklarni `app/data/furnitura-boglash.json` ga qo'shish (birlik/koeffitsientni o'ylab topmasdan: juft/dona/quti/kg aniq bo'lmasa — bog'lamaydi, nomzod bilan hisobotga yozadi). `pr-*`, `Фрагмент*` mahsulot emasmi — tekshirib, taklif beradi (qaror egasida).
4. **Mijoz materiali.** ERP'da qator `is_customer_material` bor (mijoz o'zi olib kelgan material narxga kirmaydi). Bizda yo'q. → materialga "mijoz materiali" belgisi (narx panelida/material tanlovida): belgilangan plita narxga kirmaydi, lekin kesim, 3D va fayllar hisoblanadi; ro'yxatda "mijoz materiali" yoziladi; tannarx, ustama va aniqlikka ta'siri to'g'ri.

## Natija: 3-band — furnitura bog'lash (agent "Data · Furnitura bog'lash", 2026-10-22)
Fayl: `app/data/furnitura-boglash.json` (`_meta.tz42_2026-10-22` — bog'langanlar + asos; `_meta.savol` — bog'lanmaganlar, sabab va nomzod ID lari; admin panelning "narxsiz" ro'yxatida chiqadi). Test: `tests/verify_furn_boglash.mjs` (run-all ichida).
- **Kod qoidasi:** `'BZ-' + slug(nom).slice(0,40)` (`app/js/engine/bazis/loyiha.js`); registr, bo'shliq, tinish belgisi ta'sir qilmaydi.
- **Bog'landi (3):** Петля прямая кухня симм → 90002525 (3 000), Ножка регулируемая 100..125 мм → 90002491 (3 500), POLKADERJATEL → 90002019 (430). Asos: egasi 2026-10-17 tasdiqlagan o'sha tur (BZ-petlya_pryamaya, NOG-100, BZ-polkoderjatel_*); koef 1 (hammasi dona narxi).
- **Bog'lanmadi (21):** katalogda BIRLIK maydoni yo'q (NARX.pdf'da birlik yozilmagan) — quti/juft narxi bo'lishi mumkin, o'lcham nomda yo'q yoki bir necha narx sinfi bor (qoida 4.3). Sabab va nomzodlar `_meta.savol` da.
- **ERP'da aynan nomli, lekin narxsiz:** 90001967 «Петля прямая.», 90001966 «Петля Полугорбатый.», 90001964 «Петля горбатая.», 90001977 «Стяжка 7*50 Шестигран (1 ком = 100шт)» (bog'langanda koef 0.01), 90001959 «Направляющие 30см (Белый)». ERP'da narx kiritilsa — bir qiymatli moslik bo'ladi.
- **pr-1, pr-9, Фрагмент3:** mahsulot emas, Bazis guruhi bo'lishi ehtimoli katta (modelCode 1005 «modul (guruh)» `FITTING_CODES` ichida, `GROUP_KEYS` da `фрагмент` / `pr-N` yo'q). Taklif (engine, qaror egasida): `classifyFitting` da shu nomlarni guruh deb o'tkazib yuborish.
- Narxsiz (24 nomdan): oldin 24 → keyin 21.

## Qabul
- Satin plitasi ERP SKU bo'yicha moslanadi (narx 355 000 va "ERP" manba); aniqlik 35% dan sezilarli oshadi.
- Detallar yo'qolmaydi: sig'madi — qayta nest yoki yuza bo'yicha taxmin; Satin varaq soni ERP'dagi 14 ga yaqin.
- Narxsiz furnitura 25 dan kamayadi (bir qiymatli moslari bog'langan; qolganlari nomzod bilan hisobotda).
- Mijoz materiali belgisi: narx kamayadi, hisoblash va fayllar o'zgarmaydi; testlar.
- Barcha eski testlar yashil (run-all, server, UI narx va admin).

## Tegadigan fayllar
`app/js/engine/{cutlist,nesting,erpKod}.js`, `app/js/engine/bazis/*` (material nomi), `web/src/services/{hisob,erpMaterial}.js`, `web/src/features/bazis/*`, narx paneli (web/src/features/editor/price*), `app/data/furnitura-boglash.json`, lug'atlar (uz, ru, en), testlar. **Tegilmaydi:** tasdiqlangan dizayn, admin panel 3-faza fayllari, server sozlamalari.

## Xavf: O'RTA (narx hisobi). Orqaga qaytarish: `git revert`. Moliya: narx stavkalari/ustama o'zgarmaydi.
