# TZ-38 — Zapchastlar (furnitura) 3D da ko'rinsin: detal kartasi, "Ichini ko'rish", rentgen

**Sana:** 2026-10-19 · **Navbat:** 38 · **Holat:** BOSHLANDI 2026-10-19 11:01 (egasi #274: "ishni boshla, ruxsat beraman"; asos: egasi #273, #274, skrinshot: "Tortma fasadi" detal kartasida teshik va karkas ko'rinadi, zapchast yo'q)
**Koordinator:** smart3d-51 chati.

## Sabab (kodda tekshirilgan, 2026-10-19)
1. **Detal kartasi** (`web/src/features/editor/scene/useSahna.js`, miniViewer) va **"Ichini ko'rish"** (`web/src/features/editor/inside/useIchiniKorish.js`) belgi qatlamiga `zapchast: []` — ya'ni bo'sh ro'yxat — beradi. Shuning uchun u yerda zapchast hech qachon chizilmaydi.
2. **Rentgen** (butun xona): zapchast belgilari faqat shu holatda va faqat 4 turda chiqadi (`app/js/engine/teshik3d.js`): petlya, polka ushlagich, ruchka, yo'naltiruvchi (teshik turidan hosil bo'ladi). Qolgan furnitura (konfirmat, ekssentrik, oyoq, tortma relsasi, gaz lift va h.k.) belgi emas, faqat teshik.
3. Chizilgani **soddalashtirilgan belgi** (disk, pin, planka, relsa), haqiqiy furnitura shakli emas.
4. **Tortma fasadi** — bitta detal. Relsa va ruchka modulga tegishli, detalga emas, shuning uchun detal kartasida ko'rinmasligi tabiiy: kartada shu detalga tegishli zapchast (ruchka, petlya) chiqishi kerak.
5. Narx panelidagi "1 ta zapchastning narxi bazada yo'q — 0 deb olindi" alohida (5 ta narxsiz Bazis furnitura), bu TZ ga kirmaydi.

## Bajariladigan ishlar
1. **Detal kartasi:** shu detalga tegishli zapchast (petlya, ruchka, polka ushlagich, relsa) kartada ham teshik bilan birga chiqadi (`zapchast` ro'yxati bo'sh emas).
2. **"Ichini ko'rish":** xuddi shunday, modul ichida zapchast ko'rinadi.
3. **Rentgen:** zapchast turlari kengayadi (konfirmat/ekssentrik/oyoq/relsa), har belgiga nom va miqdor (bosilganda: "Petlya Blum, 4 dona").
4. **Yoqish/o'chirish:** mavjud "Belgilar" tugmalarida zapchast alohida (egasi #167) — shu qoladi.
5. **Haqiqiy shakllar (ixtiyoriy, 2-bosqich):** ruchka va petlya uchun oddiy 3D shakl (belgi o'rniga) — egasi qaror qiladi.
6. Testlar: zapchasti bor modulda detal kartasi va ichini ko'rishda `zapchast > 0`; zapchastsiz detalda 0; ranglar `RANG` dan.

## Egasi #274 qo'shimchasi (majburiy)
Maqsad ko'rinish — `Smart3D_malumot/Smart3D-korgazma-slayd.pdf` 6-slayd ("Teshik, kromka, furnitura — rentgenda"), lekin **undan ham aniqroq**:
- **Bitta tugma** ("Zapchastlar") ko'rinish panelida: bosilganda modulning barcha zapchasti (petlya, polka ushlagich, ruchka, relsa, oyoq, konfirmat va h.k.) **aniq joyida** chiziladi (teshik koordinatasi bo'yicha, mm aniqlikda). Qayta bosilsa yashiriladi.
- **Ro'yxat ko'rinishi:** shu tugma bilan yonida ro'yxat paneli ochiladi: zapchast nomi (ERP/Bazis kodi), miqdori, qaysi detalga tegishli, joyi (mm), narxi (narx yo'q bo'lsa — belgi). Ro'yxatdagi qatorga bosilsa 3D da shu zapchast ajralib ko'rinadi (va aksincha: 3D da zapchastga bosilsa — ro'yxatda shu qator).
- Ro'yxat narx panelidagi furnitura bilan **mos** bo'lishi shart (jami son/narx farq qilmasin).
- Mobil va kompyuterda ishlaydi; dizayn tokenlari, Ikon (emoji yo'q), lug'at uz/ru/en.

## Tegadigan fayllar
`web/src/features/editor/scene/useSahna.js`, `web/src/features/editor/inside/useIchiniKorish.js`, `web/src/services/belgi3d.js`, `app/js/engine/teshik3d.js`, lug'atlar (uz, ru, en), `tests/ui/*`.
**Tegilmaydi:** tasdiqlangan dizayn ko'rinishi, narx hisobi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: PAST** — faqat ko'rsatish qatlami; hisob, kesim va fayllar o'zgarmaydi.
- **Moliya:** narxga tegilmaydi.
- **Orqaga qaytarish:** `git revert`.

## Qabul
- "Tortma fasadi" kartasida (ruchka teshigi bor) ruchka belgisi chiqadi; eshik kartasida petlya.
- "Ichini ko'rish" va rentgenda zapchast soni narx panelidagi furnitura bilan mos.
- Barcha testlar yashil, mobil va kompyuterda ishlaydi.
