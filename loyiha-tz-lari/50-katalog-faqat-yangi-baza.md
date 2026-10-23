# TZ-50 — Ilova katalogi FAQAT yangi baza (ERP 2026-10-23) narxlari asosida

**Sana:** 2026-10-23 · **Navbat:** 50 · **Holat:** BOSHLANDI 2026-10-23 (egasi #325: "shundan kerakli larni ol va qo'sh, sayt shu narxlar asosida ishlasin"; avval #311: "eski bazadan olmasin, to'liq yangi bazadan olsin")
**Manba (LOKAL, maxfiy, repoga KO'CHIRMA):** `Smart3D_malumot/YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv` (3 063 ta FAOL mahsulot; ustunlar: guruh, ERP_id, artikul, nomi, birlik, sotuv_UZS+sana, tannarx_UZS+manba (O/K/B), oxirgi_kirim_UZS, qoldiq, ilovada, faol, ishonch (YUQORI/O'RTA/PAST), belgilar). Qo'shimcha o'lcham/qalinlik/kategoriya uchun: `Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json` (ERP id bo'yicha; narx maydonlarini ISHLATMA — ular eski). Tushuntirish: `Smart3D_malumot/00-NARX-FAYLLARI-RO'YXATI.txt`, `KERAKLI-HAMMA-NARXLAR-2026-10-23.txt`.
**Qoida (egasi):** narx FAQAT shu fayldan; "Eski katalog" narxi (ishonchsiz) ishlatilmaydi; narx o'ylab topilmaydi (qoida 4.3). **Furnituraga TEGILMAYDI** (`furnitura-catalog.json`, `furnitura-boglash.json`).

## Nima kerak (qamrov)
1. **Plita va list materiallari** (`app/data/sheet-catalog.json` + `materials-index.json` — ikkalasi bir xil; guruhlar `plita`, `akril`, shuningdek `boshqa` ichidagi list materiallari: МДФ/ЛМДФ/ЛХДФ/HPL/akril/oyna — nom bo'yicha aniqla):
   - **Mavjud** yozuvlar (nom+SKU bir qiymatli moslik; `scripts/katalog_erp_moslash.mjs`/`erpSinxron.js nomKalit` qoidasi): narx yangi fayldan: `uzs` (xarid/tannarx asosi) = tannarx (manba O yoki K) → bo'lmasa oxirgi kirim → bo'lmasa tannarx (B) ("O'RTA" belgisi bilan); `lst` = sotuv_UZS; `usd` — mavjud mantiq; `src` = `yangi_baza_2026-10-23`; `th`, `l`, `w` — mavjud qoida (th O'ZGARMAYDI: erpKod kaliti; l,w — ERP length/width bo'lsa).
   - **Yangi** yozuvlar (ilova katalogida yo'q — taxminan 341 plita + akril va boshqalar): qo'shiladi: `sku`, `name`, `cat` (ERP kategoriya), `type` (LDSP/LMDF/MDF/HDF/AKRIL/OYNA — nomdan), `th`, `l`, `w` (ERP, bo'lmasa nomdagi maydon qoidasi: 4,575→2500×1830, 5,0325→2750×1830, 5,175→2500×2070, 5,796→2800×2070), narx maydonlari yuqoridagidek.
   - **Faqat `ishonch` = YUQORI va O'RTA** qatorlar kiradi. **PAST** (186 plita: sotuv narxi ombor balansidan, yoki sotuv<tannarx, yoki faqat kirim) — katalogga KIRMAYDI, hisobotda ro'yxat.
   - Yangi fayldan **topilmagan yoki narxsiz** mavjud katalog yozuvlari (taxminan 696 plita) — katalogdan CHIQARILADI (ilovada ko'rinmaydi), hisobotga to'liq ro'yxat (CSV, Smart3D_malumot/ ichiga) yoziladi. Saqlangan loyihalar `doc.erpMat` nusxasidan ochiladi — buzilmasligini tekshir.
2. **Stoleshnitsa** (`stoleshnitsa-erp.json`): mavjud yozuvlarning `narx_m2` — yangi sotuv/tannarx asosida (birlik: faylda dona/list narxi bo'lsa m² ga o'tkazish formulasi mavjud `narx_m2` ma'nosiga mos — avval 2–3 mavjud yozuvda qanday hosil bo'lganini tekshir; o'ylab topma), yangilari qo'shiladi (~81, o'lcham nomdan "3050*600*26"), faqat YUQORI/O'RTA; `materials.json` STOL26-3050, STOL38-3050 narxlari shundan.
3. **Sukut plitalar** (`materials.json` `sukut_erp` LDSP16 → ERP 10807, MDF16 → 11578, HDF3 → 11750): narx yangi fayldan (tannarx va sotuv). Boshqa umumiy materiallar (LDSP18, MDF18, LMDF16, MDF8, oyna, OSB12, mato) — egasi tanlamaguncha O'ZGARTIRMA (hisobotda eslat).
4. **Xizmatlar** — allaqachon fayl bilan mos (tegilmaydi). **Kromka** — ilovada kromka katalogi UI yo'q; qo'shilMAYDI (hisobotda: 1 276 ta narxli kromka bor, qaror kerak).
5. **«Asosiy 100» dekorlar** (`dekor-asosiy.json`, kodlar erpKod() xeshi — erpKod O'ZGARMAYDI): katalogdan chiqqan plitalar sababli ba'zi dekorlar (taxminan 26 ta) qisman/to'liq narxsiz bo'ladi — bunday dekor/kodlar tanlovda ko'rinmasligi yoki "narxsiz" belgilanishi kerak (xato bermasdan); mavjud `verify_mat100` kabi testlar shu yangi haqiqatga moslanadi (qiymat o'ylab topilmaydi); hisobotda dekorlar ro'yxati (to'liq/qisman/yo'q).
6. **Narx hisobi** (cutlist/narxStavka/hisob.js) mantig'i o'zgarmaydi; faqat ma'lumot. Jonli ERP qatlami (TZ-44) va admin qo'lda narxi ustun — o'zgarmaydi. Server `materials` jadvali `materials-index.json` dan to'ladi — deploy eslatmasi hisobotda.

## Qabul
- Katalogdagi har plita/list va stoleshnitsa narxi yangi fayldagi qiymatga TENG (yangi test `verify_katalog_yangi_baza.mjs`: har qator manbasi `yangi_baza_2026-10-23`; narx > 0; `ishonch` PAST kirmagan; takror kalit yo'q; l,w musbat; ERP formatlari).
- Furnitura fayllari baytma-bayt O'ZGARMAGAN (`git diff` bo'sh).
- Barcha testlar yashil (run-all, server npm test, vite build, UI: narxlar narxMoslash material mat100 bazis varaq zapchast admin til). Test kutuvlari faqat yangi haqiqiy ma'lumotga moslanadi.
- Hisobot: nechta saqlandi/yangilandi/qo'shildi/chiqarildi (guruh bo'yicha), chiqarilganlar CSV, Asosiy-100 ta'siri, 14 ta haqiqiy buyurtma (scripts/haqiqiy_solishtir.mjs) oldin/keyin jami xato.

## Tegadigan fayllar
`app/data/{sheet-catalog,materials-index,stoleshnitsa-erp}.json`, `app/data/materials.json` (faqat sukut_erp), skript `scripts/katalog_yangi_baza.py` (yangi, qayta ishga tushiriladigan, idempotent), testlar, hujjat. **Tegilmaydi:** furnitura fayllari, narx formulalari, erpKod, dizayn, server/admin kodi.
## Xavf: O'RTA–YUQORI (katalog hajmi qisqaradi, ko'p test kutuvlari o'zgaradi). Orqaga qaytarish: `git revert`.
