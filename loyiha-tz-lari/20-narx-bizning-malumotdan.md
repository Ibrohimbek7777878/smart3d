# TZ-20 — Narx faqat bizning ma'lumotdan (admin "Narxlar" sahifasi)

**Sana:** 2026-10-16 · **Navbat:** 20 · **Holat:** TASDIQ KUTILMOQDA
**Asos:** egasi (2026-10-16, muharrir skrinshoti bilan): "bu yerdagi narx bizning datalar asosida chiqarib berish kerak".
**Bog'liq:** TZ-04 (narx jadvali + import vositasi), TZ-14 (admin sahifa namunasi), TZ-21 (Bazis faylidan smeta shu narxlardan oladi).

---

## Hozirgi holat (tekshirilgan, 2026-10-16)
Sinov oshxonasi: 3 m, 7 modul, `scripts/smeta_hisob.mjs`.

| Qism | Summa, so'm | Manba | Bizniki? |
|---|---|---|---|
| Plita (raskroy bilan, 6 varaq) | 2 280 900 — tannarxning 69% | ERP narx katalogi, 2026-10-13 | ✅ ha |
| Ish haqi | 984 000 — 30% | 12 000 / detal, kamida 40 000 / modul — taxmin | ❌ yo'q |
| Kromka | 61 449 — 2% | 800 / 1 500 / 2 000 so'm/m — taxmin | ❌ yo'q |
| Furnitura | **0** | 10 tur, 193 dona — narxi yo'q (Bazis nomi ERP mahsulotiga bog'lanmagan) | ❌ hisobga kirmaydi |
| Teshik (prisadka) | 0 | usta tanlasa qo'shiladi; 300–1 500 so'm — taxmin | ❌ yo'q |
| Ustama 35% | 1 164 222 | kodda turgan son, egasi aytmagan | ❌ yo'q |

- **Mijoz narxi:** 4 490 571 so'm. Shundan faqat plita (taxminan 51%) bizning ma'lumotdan olinadi.
- Katalog kartalaridagi narx (masalan "~660 582 so'm") ham xuddi shu hisobdan chiqadi. Shuning uchun xato ham bir xil.
- **Furnitura narxga umuman kirmaydi.** Shu sababli narx haqiqiydan past chiqadi.
- **TZ-04 jadvali** (`Smart3D_malumot/narx-toldirish-2026-10-15.xlsx`) hali to'ldirilmagan.

## Topilgan ma'lumot manbalari
1. **ERP narx katalogi (2026-10-13).** Plita va furnitura bor. 184 plita va 187 furnituraning narxi 0.
2. **`data1/NARXLAR.xlsx`.** 2 106 qator: tartib raqami, nom, raqam. 719 qatorda raqam 0. Sarlavha yo'q.
   - ⚠ 3-ustun 1 donaning narxiga o'xshamaydi. Masalan:
     - "Кухонная ножка 10-15 см Черный" — 10 855 951;
     - "Петля Master со встроенным доводчиком" — 7 383 743.
   - Ustun ma'nosi aniqlanmaguncha bu fayl ishlatilmaydi (qoida 4.3).
3. **Kromka, ish haqi, teshik va ustama.** Bizda hech qayerda yo'q. Faqat egasi (yoki texnolog/buxgalter) beradi.

## Bajariladigan ishlar
1. **Admin "Narxlar" bo'limi** — Sozlamalar ichida, faqat admin o'zgartiradi. TZ-14 dagi "Sex standartlari" kabi. Bo'limlar:
   - **Plita:** nom, qalinlik, varaq o'lchami, varaq narxi.
   - **Kromka:** so'm/m.
   - **Furnitura:** dona yoki komplekt narxi.
   - **Ish haqi:** detal boshiga, modul boshiga, prisadka, kromka urish.
   - **Teshiklar.**
   - **Ustama, %.**
   - **Har qatorda:** manba (ERP / egasi / taxmin) va sana.
   - **O'zgarish tarixi:** kim, qachon, eski → yangi.
   - **Bazis zapchastini ERP mahsulotiga bog'lash:** 48 ta zapchast. Har biriga 3 ta taklif chiqadi (TZ-04 dagi bilan bir xil); admin bittasini tanlaydi yoki ID yozadi. Tasdiqlangan bog'lanish narxga darhol tushadi.
2. **Server:**
   - narxlar bazada (DB) saqlanadi;
   - `GET /api/narxlar` — hamma uchun;
   - `PUT /api/narxlar` — faqat admin; har o'zgarish tarixga yoziladi;
   - kiritilgan qiymat tekshiriladi: son, 0 dan katta, aql chegarasida;
   - xato kodlari `S3D-NARX-xxx`.
3. **Fayldan yuklash** — Excel faylini yuklash tugmasi. Avval ko'rib chiqish chiqadi ("eski → yangi", nechta qator o'zgaradi), keyin admin "Saqlash" bosadi.
   - Bo'sh yoki 0 katak hech narsani o'zgartirmaydi.
   - Qabul qilinadigan fayllar:
     - TZ-04 jadvali;
     - ERP katalogining yangi eksporti;
     - `NARXLAR.xlsx` — faqat ustun ma'nosi aniqlangach (Q1).
4. **Hisob faqat shu narxlardan.** Muharrirdagi jami, katalog kartalari, Narx qadami, Excel, PDF hisobot — hammasi bitta manbadan oladi. Narx kodda yozilmaydi.
5. **Narx to'liqligi** — Narx qadamida har qator yonida manba: ERP / egasi / taxmin / narxi yo'q.
   - Taxminiy yoki narxsiz qator bo'lsa, yuqoridagi jami yonida belgi chiqadi (Q3).
   - Bu yangi UI, shuning uchun avval skrinshot bilan tasdiqlanadi (3.3).
6. **Testlar:**
   - server: faqat admin o'zgartira oladi, tarix yoziladi, noto'g'ri qiymat rad etiladi;
   - hisob: o'zgartirilgan narx smetaga o'tadi, sinov oshxonasida eski va yangi narx solishtiriladi;
   - brauzer: admin bo'limi, telefon (390 px) va kompyuter.

## Tegadigan fayllar
- **Server:** `server/index.js` (yangi API), yangi jadval va migratsiya, `server/test/`.
- **Hisob:** narx manbasi `app/data/materials.json` va `furnitura-catalog.json` dan server ma'lumotiga o'tadi.
  - Fayllar zaxira bo'lib qoladi: internet yo'q bo'lsa ham hisob ishlaydi.
- **Web** (`dizayn` tarmog'i):
  - `web/src/features/settings/` — yangi bo'lim;
  - `features/editor/pricing/` — manba belgisi.
- `scripts/narx_import.py` mantig'i serverga ko'chiriladi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Barcha narxlar o'zgaradi. Har saqlashdan oldin "eski → yangi" ko'rsatiladi va sinov oshxonasi solishtiriladi.
- **Moliya:**
  - narx faqat siz kiritgan yoki ERP'dagi qiymatdan olinadi, o'ylab topilmaydi (4.3);
  - ERP'ga hech narsa yozilmaydi (2.10);
  - pul harakati yo'q.
- **Orqaga qaytarish:** narx tarixidan istalgan oldingi holatga qaytarish; kod — `git revert`.

## Egasidan kerak
1. **Q1 — `NARXLAR.xlsx` ning 3-ustuni nima?**
   - variantlar: 1 donaning sotuv narxi, kirim narxi yoki ombordagi jami summa;
   - fayl qaysi ERP hisobotidan olingan?
2. **Q2 — sexdagi haqiqiy stavkalar:**
   - ish haqi: detal yoki modul boshiga, kromka urish, prisadka;
   - kromka metr narxi;
   - ustama foizi.

   Bilmasangiz, kim beradi (texnolog, buxgalter)?
3. **Q3 — narx to'liq bo'lmaganda nima qilinadi?**
   - **A (tavsiya):** narx ko'rinadi, yonida "taxminiy" belgisi va nima yetishmayotgani;
   - **B:** narx yashiriladi.
4. **"Boshla".**

## Qabul
- Narx qadamida "manba: taxmin" yoki "narxi yo'q" qatori qolmaydi — faqat siz kiritmagan qatorlar qoladi va ular aniq ko'rsatiladi.
- Furnitura smetaga kiradi (bog'langan zapchastlar).
- Admin narxni o'zgartiradi → muharrirdagi narx darhol yangilanadi; tarixda yozuv bor.
- Usta narxni o'zgartira olmaydi (server 403 qaytaradi).
- Barcha testlar yashil.

## Muddat (taxmin)
- Taxminan **2 ish kuni**, Q1–Q3 javobidan keyin. Bu taxmin, aniq hisob emas.
