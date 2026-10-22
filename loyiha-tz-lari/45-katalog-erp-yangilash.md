# TZ-45 — Lokal narx kataloglarini jonli ERP bilan tenglashtirish (narx va plita formati)

**Sana:** 2026-10-22 · **Navbat:** 45 · **Holat:** BOSHLANDI 2026-10-22 (egasi #295: "narxni to'g'irlab qo'y, katta ERPni tekshir"; TZ-44 ga hamroh — u jonli narx qatlami, bu zaxira fayl kataloglari)
**Solishtirish natijasi (jonli ERP, 19 924 mahsulot, faqat GET, 2026-10-22):**
- Plita (1281): 1046 ta narx bir xil (<1%), 32 ta 1–10%, 12 ta >10% (eng katta +22,7%), 48 ta lokalda narxsiz (ERP'da bor), 133 ta ERP'da narxsiz, 10 ta noaniq. **422 ta plitaning list formati (l×w) ERP'dan farq qiladi** (katalogda sukut 2800×2070; ERP: 4,575 → 2500×1830, 5,0325 → 2750×1830, 5,796 → 2800×2070, 5,175 → 2500×2070, PET МДФ → 2440×1220) — raskroy (varaq soni) va narxni buzadi.
- Furnitura (3089): kurs 12 800 bilan hisoblangan, ERP kursi ≈ 11 773,7 → ~1200 ta qator −6,6%; 798 noaniq, 162 ERP'da narxsiz.
- Kalit: ERP `price` = `price_usd` × kurs; `price_list_uzs` — sotuv narxi (7045 BS: 380 000 ≈ tannarx 282 568 × 1,35 — bizning 35% ustama bilan mos).
- Plita sukut: LDSP16 va MDF16 ERP bilan teng; HDF3 140 000 (2026-10-18) → ERP hozir 137 059 (jonli qatlam o'zgartiradi, fayl o'zgarmaydi).

## Vazifa (Data agent; faqat app/data/*.json va testlar)
1. `sheet-catalog.json`: bir qiymatli moslashgan plitalar uchun l, w, th, uzs, usd ERP bo'yicha; narxsiz 48 ta to'ldiriladi; noaniq/ERP'da narxsiz — tegilmaydi.
2. `furnitura-catalog.json`: bir qiymatli moslashganlarda uzs = ERP so'm narxi; kurs belgisi to'g'rilanadi; noaniq va narxsizlarga tegilmaydi.
3. `materials.json`, `furnitura-boglash.json` — tegilmaydi.
4. Yangi `tests/verify_katalog_erp.mjs`; narx/format testlari faqat haqiqiy yangi ma'lumotga moslanadi.
Manba: lokal maxfiy `Smart3D_malumot/erp-mahsulotlar-2026-10-22.json` (gitignored). Orqaga qaytarish: `git revert`. Xavf: O'RTA (narx va raskroy).
