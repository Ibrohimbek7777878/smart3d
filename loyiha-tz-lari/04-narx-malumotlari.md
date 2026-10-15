# TZ-04 — Narx ma'lumotlarini to'ldirish (egasi uchun jadval + import)

**Sana:** 2026-10-15 · **Navbat:** 4 · **Holat:** BAJARILDI (vosita qismi, 2026-10-15, egasi: "davom etaver") — endi egasi jadvalni to'ldiradi · **Bog'liq:** egasi jadvalni to'ldiradi.

## Muammo (tekshirilgan)
- **Bazis zapchastlari:** 48 tasi ERP'ga bog'lanmagan, 2 ta taklif tasdiqlanmagan ([id-links.json](../app/data/id-links.json)).
  - Avval "69" deb aytilgan edi — bu 48 zapchast, 17 Bazis plita nomi va 5 kromka nomining yig'indisi edi.
  - Plita nomlari narxga ta'sir qilmaydi: plita narxi usta tanlagan materialdan olinadi.
- **ERP narxi yo'q:** 184 ta plita va 187 ta furnitura (D1).
- **Kromka katalogi va narxi** ERP'da umuman yo'q (D3).
- **Ish haqi** (detal boshiga 12 000, modul boshiga kamida 40 000) **va teshik narxlari** (300 / 500 / 1 500 / 800) — `materials.json` da "taxminiy". Manba — bozor oralig'i, egasi tasdiqlamagan (D4).
- **Ustama (35%)** — egasi hali aytmagan (Q1).
- **Natija:** smeta "to'liq emas", tannarx past chiqadi.

## Bajariladigan ishlar
1. **"Taxminiy" belgisi** — egasi tasdiqlaguncha ish haqi va teshik narxi qatorlarida `taxminiy` belgisi bo'ladi:
   - smeta jadvali;
   - Excel;
   - chop etiladigan hisobot.

   Jami yonida `*` va izoh turadi.
2. **To'ldiriladigan jadval** — `scripts/narx_jadval.py` → `narx-toldirish-<sana>.xlsx`. Har varaqda yo'riqnoma va 1 ta misol qator:
   - **Zapchastlar** — 48 ta Bazis nomi, soni, qaysi modullarda ishlatilgani; har biriga ERP'dan 3 ta eng yaqin taklif (ID + nom + narx). Egasi ID'ni tanlaydi yoki yozadi.
   - **Takliflar** — 2 ta: `ha / yo'q`.
   - **Kromka** — turi, qalinligi, eni, metr narxi, manbasi.
   - **Ish haqi va teshik** — arralash, kromka urish, prisadka, yig'ish stavkalari.
   - **Narxsiz** — 184 plita + 187 furnitura: narx ustuni bo'sh.
   - **Ustama** — foiz.
3. **Import** — `scripts/narx_import.py` to'ldirilgan faylni o'qiydi va yozadi:
   - `id-links.json` (holat `tasdiqlangan`);
   - `materials.json` (kromka, ish haqi, teshik, ustama — `price_src: "egasi, <sana>"`);
   - plita/furnitura narxlari.

   Qoidalar:
   - **bo'sh katak hech narsani o'zgartirmaydi;**
   - har o'zgarish hisobotda: `eski → yangi`;
   - import qilingan qatordagi `taxminiy` belgisi o'zi yo'qoladi.
4. **Bazis modullarini qayta import qilish** (`fr3d_import.py`) — tasdiqlangan ID'lar zapchast kodiga tushadi.

## Tegadigan fayllar
- Yangi: `scripts/narx_jadval.py`, `scripts/narx_import.py`.
- Ma'lumot: `app/data/id-links.json`, `materials.json`, `furnitura-catalog.json`, `materials-index.json` / `sheet-catalog.json`.
- Kod: `app/js/engine/cutlist.js` (belgi), `app/js/app.js`, `app/js/engine/xlsxexport.js`.
- Testlar.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — narxlar o'zgaradi. Shuning uchun import'dan oldin va keyin sinov oshxonasining smetasi solishtiriladi va farq hisobotda ko'rsatiladi.
- **Moliya:**
  - narx **faqat egasi kiritgan qiymatdan** olinadi, o'ylab topilmaydi (4.3);
  - ERP'ga hech narsa yozilmaydi;
  - pul harakati yo'q.
- **Orqaga qaytarish:** import alohida commit, `git revert`.

## Natija (2026-10-15)
- **"Taxminiy" belgisi.** Narx manbasi `egasi, <sana>` bo'lmagan qatorga belgi qo'yiladi:
  - smetada ogohlantirish: "Taxminiy narx — Kromka, Prisadka, Ish haqi";
  - sex tannarxi jadvalida, Excel'da va hisobotda qator nomi oxirida "— taxminiy";
  - summa o'zgarmaydi.
  - **TZ'dan farq:** kromka ham belgilandi. Uning narxi (800 / 1 500 / 2 000) ham tasdiqlanmagan taxmin — TZ'da faqat ish haqi va teshik yozilgan edi.
- **`scripts/narx_jadval.py`** — 8 varaqli Excel. Sariq kataklar, yo'riqnoma va MISOL qatori bor.
  - Varaqlar: 48 zapchast (har biriga 3 tagacha ERP taklifi, o'xshashlik bahosi bilan), 2 taklif ("ha / yo'q" ro'yxati), 3 kromka, 7 stavka, 184 plita, 187 furnitura, ustama.
  - Yaratildi: `Smart3D_malumot/narx-toldirish-2026-10-15.xlsx` (gitga kirmaydi).
  - Excel'da ko'z bilan ochib ko'rilmadi (bu kompyuterda Excel/LibreOffice yo'q) — fayl tuzilmasi o'qib tekshirildi.
- **`scripts/narx_import.py`** — `--dry-run` (faqat hisobot) va yozish rejimi.
  - Bo'sh katak va MISOL o'qilmaydi; noto'g'ri qiymat o'tkazilib, hisobotda ko'rsatiladi.
  - Yozishdan oldin va keyin sinov oshxonasi smetasi solishtiriladi (`scripts/smeta_hisob.mjs`).
  - Zapchast ID'lari o'zgarsa — Bazis modullari qayta import qilinadi.
- **`scripts/xlsx_oddiy.py`** — kutubxonasiz Excel yozish va o'qish (openpyxl kerak emas). Excel'ning umumiy satrlar formati ham o'qiladi.
- **`fr3d_import.py`:**
  - `rad_etilgan` taklif qayta importda saqlanadi;
  - parser boshqa loyihada bo'lgani uchun u yerga `__pycache__` yozilmaydi. Avval yozilib qolgan 1 ta kesh fayli o'chirildi.
- **Sinov** (sinov qiymatlari bilan to'liq aylanish, keyin `app/data` git'dan qaytarildi):
  - 10 ta o'zgarish qo'llandi, 2 ta ataylab xato ushlandi;
  - tasdiqlangan ID zapchast kodiga tushdi, rad etilgan taklif saqlandi;
  - sinov oshxonasi: narxsiz 12 → 10, taxminiy guruhlardan "Ish haqi" chiqdi.
- **Testlar:** `tests/verify_narx.mjs` 8/8 (`run-all.sh` ga qo'shildi), `tests/ui/mc.mjs` (smetadagi belgi). Node 8/8, brauzer 7 to'plam yashil.

## Egasidan kerak
- Jadvalni to'ldirish (D1, D3, D4, Q1).

## Qabul
- To'ldirilgan qatorlar smetada "narx yo'q" bo'lib chiqmaydi.
- Bo'sh qatorlar avvalgidek qoladi.
- Import hisoboti har o'zgarishni ko'rsatadi.
- Testlar yashil.
