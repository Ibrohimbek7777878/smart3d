# TZ-05 — 83 ta umumiy modul geometriyasini to'g'rilash

**Sana:** 2026-10-15 · **Navbat:** 5 · **Holat:** TASDIQ KUTILMOQDA · **Bog'liq:** egasi konstruksiya qoidasini tasdiqlaydi.

## Muammo (tekshirilgan, `app/data/fragments.json`)
1. **42 ta modulda polka `"w-36"`** deb qattiq yozilgan (2 × 18 mm). 16 mm plita tanlansa, polka yon devorlar orasida 4 mm qisqa bo'ladi.
2. **49 ta modulda yon devor `h`, qopqoq va tub `w`** — hammasi to'liq o'lchamda. Burchakda ikki qalinlik ustma-ust tushadi (masalan, SP-K-001: yon 720, qopqoq 600 — ikkalasi to'liq).
   - Natija: detal o'lchami noto'g'ri, plita ortiqcha hisoblanadi.
3. **MebelCity'ning 38 modulida bu muammo yo'q** — formulalar `t` bilan, Bazis bilan solishtirilgan.

## Bajariladigan ishlar
1. **`"w-36"` → `"w - 2*t"`** (42 modul). `t` — tanlangan korpus qalinligi.
2. **Konstruksiya qoidasi** — MebelCity'ning haqiqiy modullaridagi amaliyot (egasi tasdiqlaydi):
   - **pastki shkaf va tumba:** tub — to'liq eni (`w`); yon devor tub ustida (`h − t`); tepada qopqoq yoki planka yon devorlar orasida (`w − 2t`);
   - **ustki shkaf, penal, shkaf:** qopqoq va tub to'liq (`w`); yon devorlar ular orasida (`h − 2t`).

   Qoida 49 modulga skript bilan qo'llanadi: `scripts/geometriya_tuzatish.py` — bir martalik, natija hisoboti bilan.
3. **Divan, stul, deraza, eshik** kabi panel bo'lmagan modullarga tegilmaydi — ro'yxati hisobotda.

## Tegadigan fayllar
- `app/data/fragments.json`
- `scripts/geometriya_tuzatish.py` (yangi)
- Testlar: `verify.mjs`, `test_all_30.js`, yangi tekshiruv.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — 91 ta modul (42 + 49, kesishadi) detallari o'zgaradi.
  - Tekshiruv: har modul standart va max o'lchamda — ustma-ust yo'q, polka + 2t = eni, detal soni o'zgarmagan.
  - Har modul uchun eski/yangi plita maydoni hisobotda.
- **Moliya:** bu modullarning narxi bir oz kamayadi — ortiqcha plita yo'qoladi. Narx haqiqiy geometriyaga yaqinlashadi. ERP'ga yozilmaydi.
- **Orqaga qaytarish:** `git revert`.

## Egasidan kerak
- 2-banddagi konstruksiya qoidasini tasdiqlash. Bu sex konstruktiv standartining (D6) bir qismi.

## Qabul
- 0 ta `w-36`.
- Burchakda ustma-ust detal yo'q.
- Testlar yashil.
- Hisobotda har modulning eski/yangi maydoni.
