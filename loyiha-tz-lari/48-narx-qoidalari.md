# TZ-48 — Narx qoidalari: egasi qarorlari (sukut siyosati, furniturasiz ko'rinish, Bazis/prisadka/raspil, narx tarkibi)

**Sana:** 2026-10-22 · **Navbat:** 48 · **Holat:** TASDIQLANDI (egasi #301, #302); kod boshlandi.
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
