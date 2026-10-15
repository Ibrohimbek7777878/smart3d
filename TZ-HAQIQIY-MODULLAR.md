# TZ — Haqiqiy MebelCity modullari, sex standartlari va ID orqali narx

**Sana:** 2026-10-15 · **Holat:** egasi "tz yoz va ishni boshla" dedi (2026-10-15) — bajarilmoqda
**Asos:** `TZ-QOLGAN-ISHLAR.md` M7 (haqiqiy modullar importi) va S1 (zapchastni ERP ga bog'lash — yangi modullar uchun) bandlarining batafsil rejasi. Eski 83 fragmentni tuzatish (M1–M4) u yerda qoladi.
**Ma'lumot:**
- `data1/modulniy/` — 38 ta Bazis `.fr3d` moduli;
- `Smart3D_malumot/Sex_olchamlari_taklif.xlsx` — min/max, **egasi tasdiqladi 2026-10-15, keyin o'zgartirish mumkin bo'lishi shart**;
- ERP katalog JSON'lari.

## 0. Maqsad

Usta MebelCity'ning haqiqiy modullaridan oshxona chizadi. Modul o'lchami sex standarti (min/max) ichida o'zgaradi va undan chiqib ketmaydi. Natijada:
- detallar va kroy;
- material va zapchast ro'yxati;
- narx — ERP mahsulotidan ID orqali olinadi; narx bo'lmasa "narx yo'q";
- eksportlar.

**Bu TZ ga kirmaydi:** dizayn (dark/light) — egasi keyin ko'radi; stanok namunalari va serverdan fayllar — pauzada; Bazis teshiklari (parserda hali ochilmagan); LLM.

## 1. Bosqichlar

### A1 — Sex standartlari (o'zgartiriladigan ma'lumot fayli)
- **Yangi `app/data/sex-standartlari.json`:** Excel'ning "Taklif chegaralar" varag'idan olinadi. Har bir modul turi uchun eni, bo'yi va chuqurligi bo'yicha min/max va standart o'lcham.
  - Manba va tasdiq sanasi faylning o'zida yoziladi.
  - Shaxsiy ma'lumot ("Xom detallar" varag'i) olinmaydi.
- **O'zgartirish:** faqat shu faylni tahrirlash kifoya, kodga tegilmaydi. Interfeysdan o'zgartirish server ulanganda (keyingi TZ).
- **Bog'lanish:** fragmentda `standart: "<tur>"` maydoni bo'lsa, min/max shu fayldan olinadi. Eski 83 ta fragmentga tegilmaydi (qoida 2.1).
- **Bo'yi ham cheklanadi:** mebel kartasida bo'yi ham min/max bilan cheklanadi (hozir faqat eni va chuqurligi). Yangi `min_h/max_h` ishlatiladi.
- **Fayllar:** yangi JSON, `app.js` (yuklash va cheklash), `sw.js` (kesh). **Xavf: PAST** — faqat `standart` maydoni bor modullarga ta'sir qiladi.

### A2 — 38 ta Bazis modulini import qilish
- **Yangi `scripts/fr3d_import.py`** (faqat standart Python): Bittada parseridan (`mebelcity-platform/.../b3d_full_parser.py`) **faqat o'qish** uchun foydalanadi.
  - Natija: yangi `app/data/fragments-mc.json`. Qayta ishga tushirilsa, xuddi shu natija chiqadi.
- **Har bir modul uchun:**
  - **Gabarit (W×D×H):** panellarning global koordinatalaridan.
  - **Detal roli** — panel tekisligidan aniqlanadi: yon / tub va qopqoq / polka / orqa / eshik va tortma / planka.
  - **Formula** — detal butun modul bo'ylab cho'zilsa: `o'q − k·t − c` (masalan, `w - 2*t`). Kichik qismlar (planka eni, tortma yoni) o'zgarmas o'lchamda qoladi. Standart o'lchamda formula natijasi Bazis'dagi bilan aynan teng bo'lishi shart.
  - **Slot:** korpus / fasad / orqa (material nomi va detal roli bo'yicha).
  - **Kromka** — qoida bo'yicha: korpus detalida old cheti, fasadda 4 tomoni, orqa devorda yo'q. Jami uzunlik Bazis BOM bilan solishtiriladi va farq hisobotda chiqadi.
  - **Furnitura va mahkamlagich** — Bazis BOM'idan (nom, soni) va A3 dagi ID bilan.
  - **Stoleshnitsa bo'lagi chiqarib tashlanadi** — F2 butun qator uchun yaxlit stoleshnitsa quradi, aks holda u ikki marta hisoblanadi.
  - **Teshiklar:** `[]` — parser cheklovi, hisobotda belgilanadi.
  - **Guruh** `kuxnya-pastki` / `kuxnya-ustki` / `kuxnya-kolonna` va hokazo — `kitchen.js` stoleshnitsa va sokolni shu guruh bo'yicha quradi.
  - **Kod va nom:** kod `MC-<bo'lim>-NN`, nom — fayl nomidan.
  - **Standart:** eshik soni nomdan aniqlanadi ("1 fasad" / "2 fasad"). Krovat va parta uchun standart yo'q — ular o'zgarmas o'lchamda qoladi va bu belgilanadi.
- **Ilova** `fragments-mc.json` ni katalogga qo'shib yuklaydi (`app.js`, `sw.js`).
- **Xavf: O'RTA** — katalog kengayadi; eski fragmentlar va oqimlar o'zgarmaydi.

### A3 — ID va bog'lash
- **Furnitura ID'si:** `furnitura-catalog.json` dagi har bir mahsulotga 8 xonali ID beriladi. Prefiks `90` (FUR) + 6 xonali tartib raqam; mavjud format `{prefiks}{6 xona}` saqlanadi.
  - ID barqaror: bir marta berilgan ID o'zgarmaydi, yangilariga keyingi raqam beriladi. Skript: `scripts/id_berish.py`.
- **Kromka:** ERP katalogida kromka **yo'q**, shuning uchun ID bo'lmaydi. Narx `materials.json` dagi kromka narxidan qalinlik mos kelganda olinadi, aks holda "narx yo'q" (ma'lumot D3 kerak).
- **Yangi `app/data/id-links.json`:** Bazis'dagi har bir material va zapchast nomi → ERP mahsuloti.
  - Holat `aniq` — nom yoki artikul aynan mos.
  - Holat `taklif` — o'xshash; **narxga kirmaydi**, egasi tasdiqlaydi.
  - Holat `yoq` — mos mahsulot topilmadi.
- **Xavf: O'RTA.** Qoida 4.3: noaniq moslik narxga kirmaydi.

### A4 — Narx ID orqali
- **Tannarx:** `productionCost` furnitura narxini ID bo'yicha ERP katalogidan oladi. Narx 0 yoki yo'q bo'lsa → "narx yo'q" va smeta "to'liq emas" deb belgilanadi.
- **Ilova** `furnitura-catalog.json` ni yuklaydi.
- **Fayllar:** `cutlist.js`, `app.js`, `sw.js`. **Xavf: O'RTA** — faqat yangi modullar smetasi o'zgaradi; eski modullar avvalgidek.

### A5 — Sinov va tekshiruv
- **Yangi `tests/verify_mc.mjs`** — har modul standart o'lchamda:
  - detallar soni va har bir material bo'yicha maydon Bazis BOM bilan solishtiriladi;
  - furnitura soni Bazis bilan bir xil;
  - min/max cheklovi ishlaydi (eni, bo'yi, chuqurligi).
- **Sinov oshxonasi** (3 m, haqiqiy modullardan): detallar → kroy → tannarx → mijoz narxi → material va zapchast → eksportlar xatosiz; stoleshnitsa bir marta hisoblanadi.
- **Brauzer:** katalogdan modul qo'shish, o'lchamini o'zgartirish, narxning o'zgarishi.
- **Regressiya:** `bash tests/run-all.sh`, `bash tests/ui/run.sh`, `cd server && npm test`.

## 1a. Bajarilish holati (2026-10-15) — A1–A5 BAJARILDI
- **A1:** `sex-standartlari.json` + `engine/standart.js`; bo'yi (h) cheklovi qo'shildi (`app.js`, `rules.js`).
- **A2:** 38 modul (KP 11 · KU 10 · KA 3 · KK 1 · SH 6 · KR 5 · PA 2). Sinov paytida topilib, importerda tuzatildi:
  - detallar material bo'yicha ham guruhlanadi (ikki rangli krovatda hammasi "oq" bo'lib qolardi);
  - shisha → alohida `oyna` sloti (OYNA 4 mm), LDSP kroyiga tushmaydi; 10 mm dan yupqa plita (ЛМДФ 5,5) → `orqa` sloti, izoh bilan;
  - korpusdan boshqa slotdagi formulada `t` → `t_korpus` (cutlist `t` ni detal sloti qalinligi qiladi; polka "w − 2·t" korpus yon devoriga bog'liq);
  - `manba.zagotovka_m2` (to'g'ri to'rtburchak) va `manba.kontur_farq` — shaklli/parser konturini o'qiy olmagan panellar soni.
- **A3:** 1978 ta furnituraga ID (90000001–90001978). Bog'lanish: aniq 1 · taklif 3 · yo'q 69.
- **A4:** `productionCost` furnitura narxini ID bo'yicha oladi; narxsizi 0 va "narx yo'q".
- **A5:** `tests/verify_mc.mjs` 34/34 (`run-all.sh` ga qo'shildi), brauzer `tests/ui/mc.mjs` (`run.sh` ga qo'shildi). Barcha regressiya yashil.
- **Ma'lum cheklovlar:** Bazis BOM maydoni (parser kontur bo'yicha) 4 modulda farq qiladi — egri panellar va 2 ta o'qilmagan kontur; kroy to'g'ri to'rtburchak bo'yicha (to'g'ri). Kromka qoida bo'yicha Bazis'dan ±20% farq qiladi (D3 kerak). Krovat gabariti taxminiy (ichma-ich bloklar).

## 1b. B — Kamchiliklarni tuzatish (2026-10-15, egasi: "kamchiliklarni to'g'irla … boshla") — BAJARILDI
- **B1. O'lcham chegarasi ogohlantirishi.** Inspektorda (eni/chuqurligi/bo'yi) chegaradan tashqari qiymat kiritilsa, dastur uni jim siqib qo'yardi — ogohlantirish siqilgandan keyingi qiymat bilan tekshirilgani uchun hech qachon chiqmasdi.
  - Tuzatish: ogohlantirish usta kiritgan qiymat bo'yicha chiqadi va nimaga siqilgani yoziladi ("eni 1500 mm > max 1070 → 1070 ga siqildi").
  - Fayllar: `app/js/app.js` (`numPatch`, `checkClamp`). Boshqa joyda o'lcham siqilmaydi (tekshirildi). **Xavf: PAST** — faqat ekrandagi matn; hisob o'zgarmaydi.
- **B2. Noto'g'ri taklif (plita).** "ЛХДФ 3мм 2800*2070 Белый … Standart" → "ЛХДФ … Кашемир" deb taklif qilingan — rangi boshqa.
  - Tuzatish: plita uchun Bazis nomidagi barcha so'zlar (rang, dekor) ERP nomida bo'lishi shart; bo'lmasa — "yo'q". Furnitura qoidasi o'zgarmaydi.
  - Fayllar: `scripts/fr3d_import.py`, qayta import → `app/data/id-links.json`. `fragments-mc.json` o'zgarmasligi tekshiriladi. **Xavf: PAST** — taklif baribir narxga kirmaydi.
- **Sinov:** `tests/ui/mc.mjs` ga ogohlantirish tekshiruvi; `verify_mc` ga "plita taklifida rang mos"; to'liq regressiya.
- **Moliya:** narx hisobi o'zgarmaydi, ERP'ga hech narsa yozilmaydi.
- **Egasidan kerak bo'lib qoladi:** 69 ta zapchast moslashtirish, kromka narxlari (D3), krovat/parta min/max.

## 1c. C — Krovat va parta min/max (dunyo standartlari) — BAJARILDI (2026-10-15, egasi: "pauzadagi ishlarni davom ettir")
Egasi: "krovat va parta min/max ni dunyo standartlaridan ol va o'zgartirish ham bo'lsin" (2026-10-15).

**Manbalar (tekshirilgan):**
- **ГОСТ 13025.2-85** (amalda), 3-jadval — krovat va matras: bir kishilik uzunligi **1860–2050**, eni **700 / 800 / 900**; ikki kishilik eni **1100–1800** (100 mm qadam).
- **ГОСТ 19301.3-2022** (0–3 yosh bolalar krovati): asos uzunligi **900–1400**, eni **500–800**, poldan asosgacha ≥ 300.
- **ГОСТ 11015-93 (= ISO 5970)** — o'quvchi partasi, 1–7 guruh: balandligi **460 / 520 / 580 / 640 / 700 / 760 / 820**; stol usti chuqurligi ≥ 450 (1-guruh) va ≥ 500; uzunligi bir o'rinli **600**, ikki o'rinli **1200**.
- Yevropa **EN 1729-1** — 3–6 o'lcham belgisi uchun 590 / 640 / 710 / 760 (solishtirish uchun; asosiy manba — ГОСТ).
- **Topilmadi:** krovat balandligi uchun raqamli standart (ГОСТ 13025.2 dagi chizma o'qilmadi) — **o'ylab topilmaydi**, bo'yi Bazis'dagidek o'zgarmas qoladi.

**Muammo:** krovat standarti **matras asosiga** (tub panel) tegishli, modul gabaritiga emas. Har modulda tub paneli boshqa formula va o'qda:

| Modul | Bazis gabariti | Tub panel formulasi | Tub (Bazis) | Taklif |
|---|---|---|---|---|
| MC-KR-02 spalni 001 | 458×968 | `w` × `d − 10` | 458×958 | shablon kichik o'lchamda saqlangan → standart **900×2000** |
| MC-KR-03 spalni 002 | 458×968 | `w` × `d − 10` | 458×958 | xuddi shunday → **900×2000** |
| MC-KR-04 spalni 003 | 1708×2068 | `w` × `d − 10` | 1708×2058 | uzunlik 2058 > 2050 → **2000**; eni 1708 qoladi |
| MC-KR-05 spalni 005 | 1968×900 | `w − 5` × `d − 2t − 5` (uzun tomoni X) | 1963×863 | ichida — o'zgarmaydi |
| MC-KR-01 krovat detski | 1468×1484 | tub panel yo'q, ikki ko'zgu yarmi | — | geometriya aniq emas → **o'zgarmas** qoladi |
| MC-PA-01 Парта _1 | 500×390×500 | ustki `w` × `d + 110` | 500×500, h 500 | eni 500 < 600 → **600**; h 500 qoladi |
| MC-PA-02 Парта тумба | 800×490×730 | ustki `w` × `d + 110` | 800×600, h 730 | ichida — o'zgarmaydi |

**Bajariladigan ishlar:**
- **C1. `sex-standartlari.json`** — yangi yozuvlar `krovat`, `krovat_bolalar`, `parta`. Manba va sana bilan. Qiymatlar matras/stol usti o'lchamida yoziladi — usta shu faylda o'zgartiradi (A1 dagidek).
- **C2. `engine/standart.js`** — standart o'lchami modul o'lchamiga **o'q va siljish** orqali o'tkaziladi (masalan, KR-05: matras uzunligi → `w`, +5 mm). Eski oshxona/shkaf yozuvlari avvalgidek ishlaydi.
- **C3. `scripts/fr3d_import.py`** — krovatda tub panel, partada ustki panel topiladi; formulasidan o'q va siljish olinadi; Bazis o'lchami standartdan tashqarida bo'lsa — standart qiymat va izoh. Qayta import → `fragments-mc.json`.
- **C4. Sinov** (`verify_mc.mjs`): har krovat/parta min, standart va max o'lchamda — formula xatosi yo'q, barcha detal > 0, tub/ustki panel standart o'lchamga teng, kroy sig'adi; eski 31 modul natijasi o'zgarmagan; brauzer va to'liq regressiya.

**Tegadigan fayllar:** `app/data/sex-standartlari.json`, `app/js/engine/standart.js`, `scripts/fr3d_import.py`, `app/data/fragments-mc.json`, `tests/verify_mc.mjs`. Min/max'ni o'qiydiganlar: `app.js` (cheklash, katalog), `rules.js` (ogohlantirish) — o'zgarmaydi, faqat qiymat oladi.

**Xavf: O'RTA.** Bazis shabloni (masalan, 458×968) 900×2000 gacha cho'ziladi — formulalar mos, lekin bunday o'lchamda Bazis'da tekshirilmagan. Sinov har detal musbat va tub panel to'g'ri ekanini tasdiqlaydi; 3D'da ko'rib chiqish kerak.

**Moliya:** narx faqat kroy orqali o'zgaradi (katta krovat → ko'p plita). ERP'ga hech narsa yozilmaydi, narx o'ylab topilmaydi.

**Orqaga qaytarish:** alohida commit, `git revert`.

**Natija:** jadvaldagidek. `verify_mc` 41/41: 6 modul har standart o'lchamning min / std / max qiymatida — formula xatosi yo'q, hamma detal > 0, tub/ustki panel aynan standart qiymat (KR-02: matras asosi 900×2000). Qolgan 31 modul JSON'da aynan o'zgarmagan; krovat/partalarning detal va zapchastlari ham o'zgarmagan (faqat o'lcham va chegara).
- **Yon ta'sir (o'zgarishga bog'liq emas):** `tests/verify.mjs` [5] GibLab tekshiruvi `/tmp/opencode/giblab_check.py` ga bog'liq — kompyuter qayta yuklanganda `/tmp` tozalandi, skript repoda yo'q. Test shu joyda to'xtaydi.

## 2. Moliya, xavf, orqaga qaytarish
- **Moliya:** ERP va moliyaga hech narsa yozilmaydi, faqat lokal JSON fayllar o'qiladi. Pul harakati yo'q.
- **Umumiy xavf: O'RTA.** Faqat yangi modullar va yangi fayllar; eski 83 fragment, kroy dvigateli va eksportlar o'zgarmaydi.
- **Orqaga qaytarish:** har bosqich alohida git commit, `git revert` bilan qaytariladi.
- **Git'ga kirmaydi:** `data1/` va `Smart3D_malumot/` — egasi qaror qilmagan, ichida mijoz ismlari bor.

## 3. Egasidan kerak (ishni to'xtatmaydi)
- `id-links.json` dagi `taklif` holatidagi mosliklarni tasdiqlash.
- Kromka narxlari (D3).
- Krovat va parta uchun min/max — kerak bo'lsa, `sex-standartlari.json` ga qo'shiladi.
