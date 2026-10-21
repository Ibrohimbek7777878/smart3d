# TZ-32 — Narx aniqligi 95%, stoleshnitsa narxi, 85 umumiy modul

**Sana:** 2026-10-18 · **Navbat:** 32 · **Holat:** egasisiz bandlar (A1–A6, B1–B7) **BAJARILDI** 2026-10-21 (`agent/narx32`; asosiy qismi 2026-10-18…20 da `main` ga kirgan) — egasi javobi kutayotganlar 6-bo'limda
**Asos:** egasi #194 ("narx aniqligini 95% ga ko'tar; stoleshnitsa narxi mening fayllarimda yo'qmi; 85 modulni to'g'irla; narx aniq bo'lsin").
**VR** — TZ-31 da (boshqa chat, egasi #196–197). Bu TZ VR'ga tegmaydi.

## 0. Tahlil natijasi (3 agent, faqat o'qish, 2026-10-18 01:32–01:45)

**Stoleshnitsa.** Egasining 12 ta faylida stoleshnitsa listining (26/38 mm × 3050/4200) narxi yo'q. Ko'rib chiqilgan fayllar:
- NARX.pdf, NARXLAR.xlsx;
- ikkita "Mahsulotlar katalog";
- material va xizmat narxlari;
- 30 ta buyurtma (u yerda `cost="0"`);
- ombor qoldig'i.

Fayllarda faqat quyidagilar bor:

| Nom | Narx |
|---|---|
| Стяжка столешницы | 20 000 |
| Распил Столешница | 10 000 |
| Ровер "Stalechni 26/38 mm" | 35 000 / 50 000 (m²) |

**Narx aniqligi.** Hozirgi foizlar (sukut sozlamalar):

| Loyiha | Aniqlik |
|---|---|
| Tez oshxona | 74% |
| AI shkaf | 92% |
| 3 MC modul | 89% |
| 5 umumiy modul | 79% |
| Stoleshnitsali oshxona | 73% |

Ikki muammo bor:
1. **Foiz oshirib ko'rsatilgan.** Sukut plitalar `LDSP16` (499 600) va `MDF16` (484 895) narxi hech bir narx faylida yo'q, lekin dastur ularni "ERP — tasdiqlangan" deb hisoblaydi (`cutlist.js:609`, `materials.json`). Halol belgilansa, foiz 43–51% ga tushadi.
2. **Eng katta taxmin — ish haqi.** Oshxonada narxning 21–25% i shu. Manba: `materials.json` (12 000 / detal, 40 000 / modul), sex jadvalida yo'q.
   - Raspil va kromka sex xizmatidan tanlansa, ular ish haqi ichida yana bir marta hisoblanadi.

Simulyatsiya (tahlilchi o'lchovi):

| Qadam | Aniqlik |
|---|---|
| Plita halol belgilansa | 43–51% |
| + sukut plita ERP mahsulotiga bog'lansa (2-savol) va sex xizmati tanlansa (3-savol) | 74–94% |
| + ish haqi javobi (1-savol) | 99–100% |

**95% ga yetish uchun shart — ish haqi bo'yicha egasining javobi.**

**85 modul.**
- Hammasi `fragments.json` dagi SP- modullar, Bazis asli yo'q.
- Faqat 4 tasi toza (oddiy plankalar).
- Narx aniqligi: eng yaxshisi 92%, o'rtachasi 68%.

| Kamchilik | Modul soni | Asosiy sabab |
|---|---|---|
| Teshik | 72 | Bir koordinatada bir necha teshik; petlya teshigi eshik o'rtasida; 16 modulda teshik yo'q |
| Narx (taxmin furnitura) | 63 | NOG-90, TS-1730, GD-04 ERP'ga bog'lanmagan |
| Furnitura yo'q | 59 | Polkaderjatel 38; konfirmat 17; osma modulda naves yo'q 6 |
| O'lcham | 54 | Korpus 18 mm (sexda 16); sex chegarasidan tashqari 32 |
| Kromka | 50 | Old qirra kromkasiz, orqa qirrada ortiqcha |
| Qurilish | 20 | 12 tasi (stol, krovat, divan, stul) yopiq quti; nomi va tarkibi mos emas 2; listga sig'maydi 1; detalsiz 1; tortma sig'maydi 5 |

**Topilgan kod xatolari (dalil bilan):**
- `TS-1730` modullarda petlya sifatida ishlatilgan: 45 moduldan 43 tasida soni = 2 × eshik. Katalogda esa uning nomi "Styajka", narxi 6 000 (taxmin). Shu sababli haqiqiy petlya qo'shilmaydi.
- `cutlist.js:382` — soni 0 bo'lgan qator narxga 1 dona bo'lib kiradi (13 modul).
- Petlya soni ikki joyda ikki xil hisoblanadi:
  - `cutlist.js:88` — 900 mm gacha 2 ta;
  - `d6.js:45` — sex ma'lumoti bo'yicha, 1000 mm gacha 2 ta.
- `narxStavka.js:21,199` — 6 ta teshik turi (`evrovint`, `d6_polka` …) sex jadvali qatoriga bog'lanmaydi.
- 38 MC moduldan 16 tasida eshik bor, lekin petlya qatori yo'q.

## 1. Vazifalar

### A. Narx (Backend · Narx aniqligi, Opus, 2–3 soat)

**Egasisiz qilinadi:**
- A1. Sukut plitalar uchun:
  - har birining narx manbasi tekshiriladi;
  - faylda yo'q narx "taxmin" deb belgilanadi (foiz halol bo'ladi);
  - egasi tanlagan ERP mahsulotiga bog'lanadi (2-savol).
- A2. Teshik turlarini sex jadvali qatorlariga bog'lash (`narxStavka.js`).
- A3. Soni 0 bo'lgan qator narxga kirmaydi (`cutlist.js:382`).
- A4. Petlya soni bitta qoida bo'yicha — sex ma'lumoti (`d6.js` dagi).
- A5. Ish haqi qatori faqat yig'ish uchun: raspil va kromka sex xizmatidan tanlangan bo'lsa, ish haqi ichida qayta hisoblanmaydi.
- A6. MC modullarida eshik bo'lsa va petlya bo'lmasa, petlya avtomatik qo'shiladi.

**Egasi javobidan keyin:**
- A7. Ish haqi stavkasi — 1-savol.
- A8. Sex jadvali sukut tanlovi — 3-savol.
- A9. Stoleshnitsa narxlari — 6-savol.
- A10. Furnitura bog'lanishi — 5-savol.

### B. 85 modul (Backend · 85 modul, Opus, 2–3 soat)

**Egasisiz qilinadi:**
- B1. Polkaderjatel: har polkaga 4 ta (ERP 90002019).
- B2. 16 yangi modulda kromka sex formatida: korpus — old qirra, fasad — 4 tomon.
- B3. 31 modulga `standart` maydoni (sex o'lcham chegaralari).
- B4. Konfirmat — MC modullaridagi uzunlik jadvali bo'yicha.
- B5. Teshiklar D6 qoidasi bo'yicha. Teshik joyi sexdagidek bo'ladi: petlya teshigi eshik chetidan 105 mm, ustma-ust teshik yo'q.
- B6. Xato modullar tuzatiladi:
  - S-006 listga sig'maydi;
  - ST-005 da h=100 bo'lsa detal o'lchami 0;
  - S-003 da detal yo'q;
  - 5 modulda tortma chuqurlikka sig'maydi.
- B7. Yangi test `tests/verify_modul85.mjs`. U 85 modulni yuqoridagi 7 kamchilik turi bo'yicha har safar tekshiradi.

**Egasi javobidan keyin:**
- B8. TS-1730 → petlya — 4-savol.
- B9. 12 ta quti-shablon modul — 7-savol.
- B10. Korpus 16 mm — 8-savol.
- B11. Nomi tarkibiga mos kelmaydigan modullar: K-004 ("3 eshik", eshik 0), BD-005 ("4 chexol", fasad 0) — 9-savol.

### C. Test (Test · Yakuniy, Sonnet)
- Barcha node, server va web testlari.
- 5 loyihada aniqlik qayta o'lchanadi.
- 38 MC modulda Bazis bilan narx mosligi: oldin va keyin.
- Natija: O'TDI / O'TMADI, dalil bilan.

## 2. Tegiladigan fayllar
- `app/js/engine/cutlist.js`, `narxStavka.js`;
- `app/data/materials.json`, `fragments.json`, `expand_fragments.js`, `furnitura-boglash.json`;
- testlar.

Boshqa chatning TZ-31 fayllariga tegilmaydi: `scene.js`, `sahna.js`, `auth*`.

## 3. Xavf — O'RTA
- Hamma loyihada narx o'zgaradi: plita narxi, petlya va polkaderjatel qo'shiladi, ortiqcha ish haqi olib tashlanadi.
- Saqlangan buyurtmalar o'z summasini saqlaydi — o'zgarmaydi.
- **Pul:** to'lov yoki yechish amali yo'q. Faqat hisob o'zgaradi va har bir o'zgarish testda solishtiriladi.
- **Orqaga qaytarish:** `dizayn` da alohida commitlar — `git revert`.

## 4. Egasiga savollar
1. **Ish haqi** (95% shu javobga bog'liq): detal va modul boshiga stavka qancha? Yoki ish haqi narxga kirmaydimi? Raspil va kromka sex xizmatidan olinadi — ish haqi faqat yig'ish uchunmi?
2. **Sukut plita:** korpus uchun sexda eng ko'p ishlatiladigan "ЛДСП Ультрадекор Белый гладкий 16 мм" (ERP 309 184; 8 buyurtmada 30 list) bo'lsinmi? Fasad (MDF 16) uchun qaysi ERP mahsulot?
3. **Sex xizmati sukut tanlovi:**
   - raspil — ERP xizmatlarida (2026-10-18, boshqa chat o'qidi) list boshiga Holzma 1/2/3 = 25 000 / 43 000 / 48 000 va Altendorf 1/2/3 = 18 000 / 33 000 / 38 000. Boshqa chat ERP'dagi haqiqiy buyurtmada "Распила Holzma 2" (43 000) ishlatilganini aytdi. Sukut Holzma 2 bo'lsinmi? 1/2/3 darajalar nimani bildiradi?
   - kromka — korpus "ПВХ 19/0,4" 3 000 / m, fasad "ПВХ 19/2" 4 900 / m;
   - prisadka — sex jadvalidan.
   Rozimisiz?
4. **TS-1730:** petlya, shundaymi? Modullarda soni doim eshik × 2.
5. **NOG-90** (oyoqcha 90 mm) → ERP 90002491 "NOSHKA 10 LIK" 3 500 bog'lansinmi? Narxsiz 18 ta furnitura kodi uchun ERP ID yoki narx kerak: KUPE-SYS-02, KUPE-SYS-03, TRUBA-OVAL, CONFIRMAT, PETLYA-MUZ, SLIDER-MUZ, TANDEM-500, TANDEM-400-NAM, KARGO-200, NAVES-REG, NAVES-OGIR, NAVES-CAMAR, LIFT-HF, GILDIRAK-ROLIK, ZAMOK-MARKAZIY, KRYUCHOK-3TALIK, PETLYA-NAM, TIP-ON.
6. **Stoleshnitsa:** 4 ta narx (26/38 mm × 3050/4200). Ровер "Stalechni 26/38 mm" 35 000 / 50 000 m² — bu stoleshnitsaga ishlov berish xizmatimi?
7. **12 ta modul** (stol, krovat, divan, stul) yopiq quti bo'lib chiziladi. Ularni qayta chizamizmi yoki katalogda yashiramizmi?
8. **Korpus 16 mm** (sex standarti): 85 modulni 18 mm dan 16 mm ga o'tkazaymi?
9. K-004 va BD-005 nomlari to'g'rimi?

## 5. Kutilgan natija
- Egasisiz tuzatishlardan keyin: foiz halol, 85 modul sex qoidasiga mos, test bilan himoyalangan.
- Foiz avval pasayadi (43–51%), chunki narxi faylda yo'q plita endi tasdiqlangan deb hisoblanmaydi.
- 2–3-savollarga javob kelsa — 74–94%.
- 1-savolga ham javob kelsa — 95% dan yuqori.

## 6. Natija (2026-10-21, agent/narx32) — egasisiz bandlar

| Band | Holat | Dalil |
|---|---|---|
| A1 sukut plita manbasi | bor edi | e6e9035 (price_src, "taxminiy"), e31a72f/86fd744 (LDSP16 = ERP 10807, MDF16 = ERP 11578, HDF3 = ERP); `verify_narx_halol`, `verify_narx_erp` |
| A2 teshik turi → sex qatori | bor edi | e6e9035 `TESHIK_UMUMIY` (evrovint, evrovint_torets, d6_polka, d6_ruchka, d6_vint, d6_planka, d6_napr); 11 ta teshik kalitidan 10 tasi sex qatoriga bog'langan, `drill` (eski shablon) — sex qatori yo'q |
| A3 soni 0 qator narxga kirmaydi | bor edi | e6e9035, `cutlist.js` `.filter(hw => hw.qty > 0)` |
| A4 petlya soni bitta qoida | bor edi | e6e9035: hamma yo'l `d6.petlyaSoni` (cutlist 4b, SP D6, MC, chizish.js) |
| A5/A6 ish haqi faqat yig'ish uchun | bor edi | e6e9035 (nom, `sex_xizmati`), c29ae98 (egasi #223: ERP'dagidek — ish haqi qatori yo'q); ikki marta hisob yo'q |
| B1 polkaderjatel | bor edi | 6bcdc6b (ERP 90002019), `verify_modul85` FURN |
| B2 kromka | bor edi | 7a8034e, `verify_modul85` KROMKA |
| B3 `standart` | bor edi (30 modul) | db7516d; TZ "31" — 31-chisi aniqlanmadi (nomzod SP-K-012 deraza osti, SP-W-008 poyabzal shkafi: tur qoidasi egasi/texnologdan) |
| B4 konfirmat | bor edi | 62ca3e0 (MC jadvali: chetdan 60, qadam 32) |
| B5 teshiklar | **qisman edi → bajarildi** | petlya D6 — 1496cdc; konfirmat teshik joyi — e7e67d3 (14 modul, sex generatori bilan teshikma-teshik bir xil); GD-04 vintli 56 modulda eski shablon teshiklar qoldi (mahkamlagich turi egasidan) |
| B6 xato modullar | bor edi | 7d02211, b6c7a5c |
| B7 `verify_modul85.mjs` | bor edi → kengaytirildi | a63a01b; e7e67d3: KONF va NARX turlari (jami 8 tur) |

**Hali egasi javobini kutadi:** TS-1730 → petlya (31 modul), NOG-90 va 18 narxsiz furnitura kodi ERP bog'lanishi (63 modulda narx taxmin), 12 quti-shablon modul, K-004/BD-005 nomlari, GD-04 vintli modullarda mahkamlagich turi (konfirmat/vint), tsarga/texnika polkasi/burchak/g'ildirakli tumba konfirmat joyi (texnolog).
