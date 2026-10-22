# TZ-48 — Narx qoidalari: egasi qarorlari (sukut siyosati, furniturasiz ko'rinish, Bazis/prisadka/raspil, narx tarkibi)

**Sana:** 2026-10-22 · **Navbat:** 48 · **Holat:** **BAJARILDI** 2026-10-22 (tarmoq `agent/narx48`; push va `main`ga o'tkazish — egasi ruxsati bilan); natija — §5. (TASDIQLANDI: egasi #301, #302.)
**Asos:** narx auditi (14 real buyurtma, o'rtacha +33%; `47-natija-haqiqiy-solishtirish.md` bilan birga), egasi javoblari + fayllar `PRISADKA-USLUGA-2026-10-22.txt`, `STANOK-VA-HDF-NARXLARI-2026-10-22.txt`.
**Xavf:** O'RTA (narx hisobi o'zgaradi; saqlangan buyurtma summasi o'zgarmaydi). **Moliya:** to'lov/yechish yo'q. **Orqaga qaytarish:** `git revert`; ustama va stavkalar admin "Narxlar" da sukutga qaytariladi.
**Diqqat:** boshqa chat TZ-44/47 (ERP jonli narx, haqiqiy buyurtmalar) ustida — `cutlist.js`, `narxStavka.js`, `hisob.js` bo'yicha uning commitlarini ol, ustidan yozma.

## 1. Egasi qarorlari (so'zma-so'z ma'no)
| № | Qaror |
|---|---|
| 1 | **Ustama** sukutda QO'SHILMAYDI (0%). Ixtiyoriy: narx panelida qo'lda yoqish va foizni o'zgartirish (35% — taklif qiymati). |
| 2 | **Furnitura** sukutda narxga QO'SHILADI. Narx panelida **"Furniturasiz"** tugmasi: bosilganda furniturasiz jami narx ko'rinadi (ko'rinish; hisob buzilmaydi). |
| 3 | **Prisadka va Bazis xizmati** sukutda YOQILGAN (S3 qoidasining sukuti egasi tomonidan o'zgartirildi; usta o'chira oladi). |
| 4 | **Bazis xizmati:** detal soni bo'yicha; **HDF hisobga olinmaydi**; faqat **16, 18, 19 mm** detallar soni × stavka (§3, Q2). **Prisadka xizmatlari** — `PRISADKA-USLUGA` faylidagi 12 xizmat (ЕВРО 1 600, ЕВРО 2 1 200, МЕТКА 300, ОВАЛ КАТТА 10 000, ОВАЛ КИЧИК 3 000, ОВАЛ КИЧИК 5 5 000, ПЕТЛЕ 900, ПОЛКАДЕРЖАТЕЛЬ 800, РУЧКА 800, ШКАНТ 800, ЭКСЕРТРИК 1 400, Паз 4 000 so'm/dona; furnitura nomi → xizmat moslash qoidasi faylning 3.5 bandida). **"Xizmat qo'shish" oynasi:** narx panelida istalgan ERP xizmatini (arra, kromka, prisadka, Rover…) miqdor bilan qo'shish. |
| 5 | **Stoleshnitsa va akril narxga KIRADI** (mijoz materiali belgisi qo'lda qoladi). **Raspil:** hisobga HAR DOIM +1 qo'shimcha raspil qo'shiladi (§3, Q3). |
| 6 | **Raspil — Holzma bo'yicha** (`STANOK-VA-HDF-NARXLARI` 1-bo'lim: Holzma 1 / 2 / 3 = 25 000 / 43 000 / 48 000 so'm/list; sukut Holzma 2 — eng ko'p sotilgan). HDF uchun alohida arra xizmati yo'q (fayl 7-bo'lim) — umumiy Holzma tarifi. |
| 7 | **"Narx aniqligi"** nomi o'zgarmaydi. Qo'shimcha: **narx tarkibi** — nima qancha va nimadan qanchadan hisoblangani ko'rinsin (qator: nom, miqdor × birlik narx = summa, manba: ERP/taxmin/qo'lda; bo'limlar yig'indisi: plita, kromka, raspil, prisadka, Bazis, furnitura, ustama, jami; "Furniturasiz" jami). |

## 2. Tegadigan fayllar
`app/js/engine/cutlist.js` (productionCost: ustama sukuti, bazisXizmat, +1 raspil, mijoz materiali sukuti), `narxStavka.js` (sukut hujjat: ustama 0, xizmatlar yoqilgan, Holzma stavkalari), `app/data/materials.json`/`services.json` (prisadka xizmatlari, Holzma 1/2/3), `web/src/services/hisob.js`, `web/src/features/editor/pricing/*` (narx paneli: Furniturasiz, ustama bloki, narx tarkibi, xizmat qo'shish oynasi), lug'atlar uz/ru/en, testlar (`verify_narx*`, `verify_hisob`, yangi `verify_narx_qoida`, UI `web_narxlar`).
**Tegilmaydi:** tasdiqlangan dizayn tokenlari (yangi bloklar mavjud komponent uslubida), saqlangan buyurtmalar summasi, ERP'ga yozish.

## 3. Savollarga javoblar (egasi #302)
- **Q1 Plita narxi:** "ERP'da bormi, bor bo'lsa ko'r va o'rtacha narxni ol". Tekshirildi (`Smart3D_malumot/erp-plitalar-2026-10-18.json`, 144 mahsulot): ERP ro'yxat narxi tannarxdan o'rtacha ×1,13 (mediana ×1,14); real sotuvlarda (14 buyurtma, `47-natija…`) o'rtacha sotuv narxi tannarxdan ×1,156 va ERP ro'yxatdan 25 000 past. **Qaror:** plita narxi = ERP o'rtacha sotuv narxi: `price_list_uzs − 25 000` (ro'yxat narxi bo'lsa), yo'q bo'lsa tannarx (`display_price_uzs`) × 1,156; manba narx tarkibida ko'rinadi; admin "Narxlar" da "plita narx rejimi" (sotuv / tannarx) va 25 000 chegirma qiymati o'zgartiriladi.
- **Q2 Bazis:** **5 000 so'm / detal**, faqat 16, 18, 19 mm detallar (HDF hisobga olinmaydi). (Egasi xabarida eslangan "6 000" — aniqlashtirishda 5 000 deb tasdiqlandi.)
- **Q3 "+1 raspil":** butun loyihaga 1 ta qo'shimcha list raspil (tanlangan Holzma stavkasida); narx panelida ustaga **ogohlantirish** ("1 ta qo'shimcha raspil qo'shildi") va usta xohlasa **olib tashlay** oladi (qayta qo'shish ham).

## 4. Qabul
- Sukutda: ustama 0, furnitura bor, prisadka va Bazis yoqilgan, stoleshnitsa/akril kirgan, raspil Holzma 2 + 1.
- "Furniturasiz" tugmasi to'g'ri jami ko'rsatadi; ustama foizi o'zgarsa narx darhol yangilanadi.
- Narx tarkibida har qator manbasi va formulasi ko'rinadi; yig'indi = jami.
- 14 real buyurtma bo'yicha oldin/keyin sapma jadvali (`47`-TZ vositasi bilan); barcha eski testlar yashil.

## 5. Natija (agent/narx48, 2026-10-22)

**Band bo'yicha** (hammasi bajarildi; hisob — `app/js/engine/cutlist.js productionCost`, `narxStavka.js`, yangi `narxTarkib.js`, `xizmatKatalog.js`; ko'rinish — `web/src/features/editor/pricing/*`):
1. **Ustama sukutda 0%** (`materials.json pricing.markup_pct = 0`, taklif `markup_taklif = 0,35`). Narx panelida «Ustama» bloki (yoqish/o'chirish, foiz, «Taklif: 35%»), loyiha bilan saqlanadi (`doc.ustama`); Sozlamalardagi usta qiymati va admin «Narxlar» dagi qo'lda qiymat avvalgidek ustun. Admin sukut ustamasi — 0.
2. **Furnitura sukutda narxda**; «Furniturasiz» tugmasi jami, tannarx va kotirovka satrlarini furniturasiz ko'rsatadi (`clientFurnsiz`; hisob o'zgarmaydi, satrlar yig'indisi ikkala jamga teng).
3. **Prisadka va Bazis sukutda YOQILGAN** (usta o'chiradi: `doc.xizmatlar.teshik/bazis = false`). S3 sukuti shunga o'zgardi: `03-xizmatlar-S3.md` va `qoidalar_qatiy_amalqilinsin.md` S3 izohi yangilandi; testlar moslandi (§5.3). Saqlangan loyihadagi aniq tanlov (`teshik: false`, `bazis: null`) saqlanadi; tanlanmagan joy yangi sukutga o'tadi.
4. **Bazis: 5 000 so'm/detal** (ERP Bazis5, kod `01`), faqat 16/18/19 mm detallar (`Math.round(qalinlik)`), HDF va boshqa qalinlik hisobga olinmaydi. **Prisadka xizmatlari 12 ta** (`sukut_narx.xizmatlar`): mavjud 8 ta + ОВАЛ КАТТА 10 000, ОВАЛ КИЧИК 3 000, ОВАЛ КИЧИК 5 5 000, Паз 4 000 qo'shildi; narxlar egasi fayllari (207 qator) va ERP 2026-10-18 xizmatlar jadvali bilan SO'ZMA-SO'Z mos (farq yo'q). ОВАЛ/Паз teshik sifatida avtomatik tanilmaydi (texnolog javobi; boshqa agent) — faqat «Xizmat qo'shish» orqali. **«Xizmat qo'shish» oynasi**: ERP xizmatlar (`app/data/erp-xizmatlar.json`, 192 ta: arra 15, kromka 147, prisadka 12, Rover 12, Bazis 4, VR 2) + Smart3D katalogi (`services.json`, «taxmin»), qidiruv va guruhlar, miqdor, olib tashlash; narx hujjatidagi yangi narx ustun; `doc.qoshXizmat` bilan saqlanadi.
5. **Stoleshnitsa va akril sukutda narxga kiradi** (dvigatel avvaldan shunday edi — testda mustahkamlandi); `mijozMat` belgisi qo'lda chiqaradi. **+1 raspil**: butun loyihaga 1 list (tanlangan stanok stavkasida) alohida qator `raspil_qosh`; narx panelida «1 ta qo'shimcha raspil qo'shildi» ogohlantirishi, «Olib tashlash»/«Qaytarish» (`doc.xizmatlar.raspil1`), asosiy list soni o'zgarmaydi; katalog kartasi narxida va plitasiz loyihada yo'q.
6. **Raspil Holzma**: 25 000 / 43 000 / 48 000, sukut Holzma 2. HDF = stanokning 1-darajasi (Holzma 1, 25 000) — **TASDIQLANDI**: 14 real buyurtmaning HDF sotilgan 9 tasida HDF listlari soni aynan Holzma 1 / Altendorf 1 miqdoriga teng. Usta narx panelida stanokni tanlaydi (Holzma 1/2/3, Altendorf 1/2/3); Altendorf tanlansa HDF — Altendorf 1 (18 000).
7. **Narx tarkibi** (`prod.tarkib`, panelda «Narx tarkibi»): bo'limlar plita, kromka, raspil (+1), prisadka (teshik turlari bo'yicha), Bazis, furnitura, ish haqi, qo'shilgan xizmatlar, ustama; har qator: nom, miqdor × narx = summa, manba (ERP / egasi qarori / qo'lda / taxmin / mijoz), qoida; jami va «Furniturasiz» jami. Yig'indi = mijoz narxi (testda 9 sozlamada tekshiriladi).
8. **Plita narxi** = ERP o'rtacha sotuv narxi: ro'yxat narxi (`lst`, katalogga ERP `price_list_uzs` dan yozildi: 584 plita) − 25 000; ro'yxat yo'q bo'lsa tannarx × 1,156; admin «Narxlar» da rejim (sotuv/tannarx), chegirma va koeffitsient (server: `plita` bo'limi, tarix, «sukutga qaytarish»). Faqat narx — kroy va list soni o'zgarmaydi; admin qo'lda narxi va taxminiy/xlsx narx o'zgarmaydi. **Taglik:** ro'yxat − 25 000 tannarxdan past chiqsa (195 plita, asosan «Акрил AGT»: ro'yxat = tannarx) tannarx olinadi — egasi qarori kerak (§5.4).

### 5.1 Haqiqiy buyurtmalar (14 ta, `scripts/haqiqiy_solishtir.mjs`): mijoz narxi (furniturasiz) ↔ ERP sotuv
| ko'rsatkich | OLDIN (main, 35% ustama) | KEYIN (0% ustama, yangi qoidalar) |
|---|---:|---:|
| o'rtacha abs(xato) | 36,7% | **32,0%** |
| mediana abs(xato) | 30,8% | **24,0%** |
| yig'indi (Σbiz/ΣERP − 1) | +25,1% | **+16,9%** |
Plita narx qoidasining o'zi (ERP SKU lari va varaq sonida) ERP sotuvidan Σ +0,3% farq qiladi (qoida to'g'ri); qolgan xato: varaq soni (+14%, Bazis≠sex versiyasi, nesting), Bazis xizmati (+8%: ERP Bazis miqdori/stavkasi boshqacha, §5.4), +1 raspil va stanok. `tests/ui` / `scripts/narx_b3d.mjs` — Dilnoza va BIG ONE jadvallari hisobotda.

### 5.2 Eski testlarga o'zgartirishlar (sabab bilan; qoida yumshatilmadi)
`verify_narx_stavka` (sukut ustama 35→0, prisadka/Bazis yoqilgan, +1 raspil qatori; «hammasi tasdiqlangan» bo'limi prisadkasiz, aniqlik solishtirish 35% asosida), `verify_narx_erp` (Bazis5 5 000, 16/18/19 mm, oflayn endi admin bog'laganda), `verify_narx_kalibrovka` (+1 raspil qatori), `verify_narx_yakuniy` (35% → admin qo'yadi), `verify_xizmat`, `verify_hisob` (o'chirilgan holat), `verify_mc` (mijoz = tannarx), `verify_modul85` (katalog modullarining umumiy burg'ilash teshigi «kutilmoqda»), `verify_mat100`, `verify_admin_qatlam`, `verify_narx_moslash` (plita narxi = ERP o'rtacha sotuv narxi; admin qo'lda — o'zgarishsiz), server `narxlar` va `admin-faza3` (ustama 0, Bazis `{onlayn:'01'}`), UI `web_sozlamalar`, `web_material` (bir xil ro'yxat narxli dekor — bir xil narx), `web_muharrir` (egasi #300 dan qolgan «varaq» → «list» matni). Yangi: `verify_narx_qoida` (88), `ui/web_narxTarkib`, server «plita narx rejimi» testi.

### 5.3 Saqlangan loyiha va serverdagi narx hujjati
Saqlangan buyurtma summasi (`total_price`) o'zgarmaydi. Serverda admin avval narx hujjatini saqlagan bo'lsa (`settings.narx_stavkalari`), u eski qiymatlarda qoladi (qo'lda kiritilgan qiymat ustun) va yangi xizmatlar (Bazis5, 4 prisadka xizmati, `plita` bo'limi) unda bo'lmaydi — admin «Narxlar → Hamma stavkani sukutga qaytarish» ni bosadi (u endi `plita` ni ham qaytaradi). Stavka bo'lmasa Bazis/+1 raspil qo'shilmaydi (narx o'ylab topilmaydi).

### 5.4 Egasi qarori kerak
1. **Bazis soni va stavkasi**: 13 ERP buyurtmasida Bazis miqdori 16/18/19 mm detallar soniga 5 tasida aynan teng (3808: 72, 3812: 25, 3877: 96, 4034: 98, 4204: 13), qolganida ancha kam (3832: ERP 57, biz 385; 3860: 10 ↔ 139; 3888: 25 ↔ 62; 3978: 129 ↔ 189; 3770 va 3975: doimiy 10; 4250: yo'q). ERP stavkasi 10 buyurtmada Bazis4 (4 000), 3 tasida Bazis5 (5 000 × 10), 4250 da yo'q. Qoida (16/18/19 mm × 5 000) bajarildi, lekin 14 buyurtmada Σ +4,9 mln (jami xatoning 8,2%) — haqiqiy hisob qoidasi (stavka 4 000 yoki 5 000, son qachon kamayadi) aniqlansinmi?
2. **Taglik** (ro'yxat − 25 000 < tannarx): 195 plitada tannarx olindi — to'g'rimi yoki ro'yxat − 25 000 qat'iy?
3. Umumiy burg'ilash teshigi (`drill`, 52 katalog modulida) — qaysi ERP prisadka xizmati? Hozir 300 so'm «taxmin».
4. Stoleshnitsa/akril sukutda narxda: mijoz o'zi olib kelgan holda usta belgilashi shart (BIG ONE da akril + stoleshnitsa = +1,72 mln).
