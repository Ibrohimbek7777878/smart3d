# TZ-05 — 83 ta umumiy modul geometriyasini to'g'rilash

**Sana:** 2026-10-15 · **Navbat:** 5 · **Holat:** BAJARILDI 2026-10-17 (egasi #134: "boshla va to'g'irla") · `dizayn` a29ff22 · **Bog'liq:** egasi konstruksiya qoidasini tasdiqladi (#134).

## Natija (2026-10-17)
- **50 modul o'zgardi**, eski → yangi plita maydoni va narx: [05-hisobot.md](05-hisobot.md).
  - `"w-36"` — 0 ta qoldi (42 modul, divan va stul qutisidagi polka ham). Polka detallari (`shift*`) endi "polka" slotida — polka materiali (TZ-23 E, 16 mm) ularga ham tegadi.
  - Burchakda ustma-ust — yo'q: pastki shkafda tub to'liq, yon h − t, qopqoq w − 2t; boshqalarda qopqoq va tub to'liq, yon h − 2t (47 modul).
  - **Qo'shimcha (tekshiruvda topildi):** varaqqa sig'maydigan detal. Katta orqa devor (HDF) — 2 bo'lak (SP-W-001/002/005/006/007, SP-G-011). Qopqog'i varaqdan uzun shkaflarning eng katta eni kamaydi: SP-W-002 va SP-W-006 3000 → 2750, SP-W-007 3600 → 2750, SP-G-011 3000 → 2800.
  - SP-W-001 — yon devordagi teshik yuqori qirradan 32 mm da qoldi.
- Narx: modullar narxi 0,3–1,5% kamaydi (ortiqcha plita yo'qoldi). SP-W-007 va SP-G-011 — oshdi: orqa devor endi haqiqiy 2 bo'lak.
- **Tegilmadi:** divan, stul, eshik, deraza konstruksiyasi (10 modul). SP-S-006 divani eng katta enida varaqdan uzun — hisobotda.
- **Testlar:** yangi `tests/verify_geometriya.mjs` (10 tekshiruv; eski ma'lumotda 7 tasi qizil) va barcha node testlari yashil. `verify_promptlar` — "to'ldir" testi yangi eng katta enga bog'landi.
- Vosita: `scripts/geometriya_tuzatish.mjs` (TZ dagi `.py` o'rniga — dvigatelning o'z formulasi bilan hisoblaydi). Qayta ishga tushirilsa — 0 o'zgarish.

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
