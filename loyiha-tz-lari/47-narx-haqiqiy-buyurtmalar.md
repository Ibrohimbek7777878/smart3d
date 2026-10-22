# TZ-47 — Narxni haqiqiy ERP buyurtmalari bilan o'lchash va to'g'rilash ("100% to'g'ri" yo'li)

**Sana:** 2026-10-22 · **Navbat:** 47 · **Holat:** BOSHLANDI 2026-10-22 (egasi #299: "narxni 100% to'g'ri chiqadigan qilish kerak, nima bo'lsa ham")
**Halol chegara:** "aynan 100%" har buyurtmada mumkin emas (sex raskroy qarori, chegirma, qo'lda tuzatilgan narx, mijoz materiali). Maqsad: **haqiqiy buyurtmalarda o'lchanadigan xato** — komponentlar bo'yicha (plita varaqlari, kromka m, har xizmat turi, jami) — o'rtacha |xato| ≤ 3% va har chetlanishning **tushuntirilgan sababi**. Plita ustamasi (35%) siyosati egasiniki — o'zgartirilmaydi, lekin ERP sotuv narxi bilan farqi alohida ko'rsatiladi.

## Haqiqiy ma'lumot (hammasi LOKAL, maxfiy, repoga kirmaydi)
- `Smart3D_malumot/haqiqiy-buyurtmalar-2026-10-22.json` — ERP dan (faqat GET) olingan **14 ta buyurtmaning** haqiqiy sotuvi: mahsulot qatorlari (SKU, varaq soni, narx), xizmat qatorlari (raspil Holzma 1/2, kromka ПВХ turlari, prisadka turlari, Bazis, ...) va sotuv jami. Buyurtma id'lari: 3770, 3808, 3812, 3832, 3860, 3877, 3888, 3926, 3936, 3975, 3978, 4034, 4204, 4250. (Qolgan 16 ta eski buyurtmada sotuv ma'lumoti yo'q.)
- Shu buyurtmalarning fayllari: `Smart3D_toplam_2026-10-16/01_buyurtma_fayllari/04_bazis/<id>_<nom>/*.b3d` (Bazis), `01_arra/<id>_<nom>/` (GibLab `.project`, Homag `.LC4` — **haqiqiy raskroy**), `02_kromka_prisadka/<id>_<nom>/` (KDT prisadka `.xml`); `06_kroy_natijalari/GibLab_kroy_natijalari_30.xlsx` (haqiqiy ishlatilgan varaqlar).
- ERP mahsulot narxlari: `Smart3D_malumot/erp-mahsulotlar-2026-10-22.json` (display_price_uzs = tannarx, price_list_uzs = sotuv narxi).
- Qo'shimcha bitta sintetik misol (fayli yo'q): sotuv 506234 «Big one»: 14 ta Сатин (4,575; 2500×1830) × 355 000, 3 ta ЛХДФ × 140 000, kromka 498 600, xizmatlar 2 227 900, jami 8 116 500.

## 1-bosqich (TAHLIL, kodni o'zgartirmasdan) — shu agent
1. `scripts/haqiqiy_solishtir.mjs` (yangi, qayta ishlatiladigan): har buyurtma uchun Bazis `.b3d` ni ilovadagi YO'L bilan (b3d → bazisLoyiha → cutlist → nestProject → productionCost, hisob.js dagi sukut sozlamalar), plita sifatida **haqiqiy sotilgan SKU** (ERP mahsulot) tanlanib, hisoblaydi va ERP sotuv bilan **komponentlar bo'yicha** solishtiradi: (a) har SKU varaq soni (bizniki / ERP / GibLab haqiqiy), (b) kromka metr turlar bo'yicha, (c) raspil (Holzma 1/2 varaq soni), (d) prisadka turlari soni, (e) Bazis xizmati, (f) jami (ustamasiz tannarx va 35% li mijoz narxi ikkala holda; ERP sotuv bilan hamda `price_list_uzs` bilan).
2. Chiqish: jadval (buyurtma × komponent: bizniki, ERP, farq %), o'rtacha va mediana |xato|, eng katta 10 chetlanish; **har tizimli chetlanishning sababi** (masalan: raskroy samaradorligi — bizda varaq ko'proq; kromka chiqit %; prisadka sanash qoidasi; ERP'da bo'lmagan qatorlar — furnitura, mijoz materiali; ERP chegirmasi) va **tuzatish taklifi** (qaysi fayl/qoida, kutilgan ta'sir).
3. Natija hujjati: `loyiha-tz-lari/47-natija-haqiqiy-solishtirish.md`. Kod va ma'lumot fayllari O'ZGARMAYDI (faqat yangi skript va hujjat).

## 2-bosqich (to'g'rilash) — 1-bosqich hisobotidan keyin alohida (koordinator)
Tizimli sabablar bo'yicha engine tuzatishlari (nesting, kromka chiqit, prisadka qoidasi va h.k.) — **kalibrovka 9 ta buyurtmada, tekshiruv qolgan 5 tasida** (ortiqcha moslashtirmaslik uchun); har tuzatishga test; xato pasayishi o'lchab ko'rsatiladi.

## Tegadigan fayllar (1-bosqich): faqat `scripts/haqiqiy_solishtir.mjs` va `loyiha-tz-lari/47-natija-haqiqiy-solishtirish.md`.
## Xavf: PAST (tahlil). Orqaga qaytarish: fayllarni o'chirish.
