# TZ-11 — Stanok fayllarini haqiqiy stanokka moslash

**Sana:** 2026-10-15 (2-tahrir: 2026-10-16) · **Navbat:** 11 · **Holat:** JARAYONDA — egasi "boshla" (#119-13, #124)
- **2-tahrirning 1–3-bandlari bajarildi:** `dizayn` tarmog'i, cd63495 (pastda "Natija").
- **Kutilmoqda:**
  - D6 jadvali — texnolog tasdig'i; ma'lumotdan olingan taklif pastda;
  - sinov kuni — GibLab'ga import va 1 ta detal;
  - G-code (Rover) tuzatishlari — 5-band, ustuvorligi past.
**Bog'liq:** TZ-01, TZ-06.

## Muammo (tekshirilgan, `app/js/engine/cnc.js`)
| # | Muammo | Joyi |
|---|---|---|
| C2 | G-code kesish chuqurligi doim 16 mm — 18 mm plita oxirigacha kesilmaydi | `cnc.js:289` |
| C3 | Detallar orasidagi tirqish arra uchun 4 mm, freza esa Ø6 — qo'shni detalga kirib ketadi | nesting + cnc |
| C4 | Biesse (.cix) va Homag (.mpr) — loyiha emas, "Sample_Panel" | `cnc.js:761` |
| C5 | Hamma teshik bitta Ø6 freza bilan; burg'ilash sikli yo'q; yon teshik yuza teshigi deb chiqadi | `cnc.js` |
| C8 | G-code: G54/G43 yo'q, bir o'tishda to'liq chuqurlik, kirish rampasi yo'q | `cnc.js` |
| C9 | Har stanok uchun alohida post-protsessor tuzilmasi yo'q | — |

## Bajariladigan ishlar
1. **Serverdan namunalarni o'rganish** — serverdagi haqiqiy fayllar:
   - Homag `.LC4`, Altendorf `.gibcut`, Rover `.tap`, GibLab `.project`;
   - formatini, o'lchov birligini, sarlavhasini va kesim tartibini aniqlash.
2. **Post-protsessorlar:** `app/js/engine/post/<stanok>.js` — har stanok alohida fayl (C9):
   - avval sexda borlari (Q7) — Altendorf, Homag (Holzma), Rover;
   - Biesse va Homag WoodWOP sexda bo'lsagina.
3. **G-code tuzatishlari:**
   - chuqurlik = plita qalinligi + "o'tib kesish" (sex parametri);
   - bir necha o'tish;
   - G54/G43;
   - kirish rampasi;
   - CNC rejimida detallar orasidagi tirqish ≥ freza diametri.
4. **Teshik sikllari:** diametr bo'yicha asbob; yon teshiklar alohida (TZ-06 teshiklari asosida).
5. **Birinchi sinov (C10):** 1 ta arzon detalda sexda kesish, texnolog tasdig'i. Tasdiqlangan stanok faylidan `SINOV` belgisi olinadi.

## Tegadigan fayllar
- `app/js/engine/cnc.js`, yangi `app/js/engine/post/*`
- `app/js/app.js`, `app/index.html` (TZ-01 da yashirilgan tugmalar qaytadi)
- testlar: namunalar bilan solishtirish

## Xavf, moliya, orqaga qaytarish
- **Xavf: YUQORI** — stanok va plita.
  - Texnolog tasdig'igacha hamma fayl `SINOV`.
  - Sinov faqat arzon detalda, egasining ruxsati bilan (5.1).
- **Moliya:** noto'g'ri kesim — plita isrofi. Shuning uchun bosqichma-bosqich sinov.
- **Orqaga qaytarish:** har stanok alohida commit.

## Egasining javobi (2026-10-15)
- **Sexda:** Altendorf (formatli arra), Homag / Holzma (arra markazi), Biesse Rover (CNC), kromka va prisadka stanoklari.
- **Namunalar:**
  - Altendorf `.gibcut`, Homag `.LC4`, Rover `.tap` — serverda;
  - kromka va prisadka — sexdagi kompyuterlarda.

## Egasidan kerak
- **D7** — serverdagi namuna fayllar. Server agenti uchun matn tayyor.
- **Q7** — stanok turlari aytildi (4 tur). Post-protsessor uchun aniq model nomlari ham kerak bo'ladi — namuna fayllarning sarlavhasidan ham aniqlash mumkin.
- Texnolog bilan sinov kuni.

## Qabul
- Har stanok fayli namuna bilan formati bo'yicha bir xil.
- Sinov detali to'g'ri kesildi; texnolog tasdiqladi.

---

## 2-tahrir (2026-10-16) — namunalar o'rganildi, yondashuv o'zgaradi

### Namunalardan nima chiqdi
Manba: `Smart3D_toplam_2026-10-16/01_buyurtma_fayllari`. 30 ta haqiqiy buyurtma, faqat o'qildi. Gitga qo'shilmaydi — mijoz ma'lumoti.

Sexdagi haqiqiy zanjir:
1. **Bazis → GibLab `.project`** (`importBMV 1.84`, windows-1251). 30 buyurtmaning hammasida bor. Tarkibi:
   - mahsulot va detallar — tayyor o'lcham `dl/dw`, nomi, tekstura;
   - kromka — har qirra uchun `@operation#N` havolasi orqali;
   - plita — `good sheet`: qalinlik, ERP nomi va kodi, list o'lchami;
   - arra operatsiyasi `CS` va kromka operatsiyasi `EL` (band: eni, qalinligi, nomi);
   - har detalning prisadka dasturi `XNC`, ichida XML. 3888 ta dastur, teglari: `bf` — yuza teshigi, `bl/br/bt/bb` — qirra teshiklari, `var` — chuqurlik formulasi.
2. **GibLab** kesishni o'zi optimallashtiradi va arra fayllarini o'zi chiqaradi: Altendorf `.gibcut`, Homag/Holzma `.LC4`. Bu turdagi 31 ta fayl — GibLab saqlagan, kesim xaritasi bilan.
3. **Prisadka** — har detalga bitta KDT `.xml` (2044 fayl): kontur, kromka (`Banding`), teshiklar (turi, diametri, chuqurligi).
4. **CNC (Rover)** — `.ncc` / `.tap`. Faqat frezalanadigan detallar uchun, kam.
5. Kromka stanogi uchun alohida fayl yo'q — kromka `.project` va KDT ichida.

**Xulosa.** Altendorf va Homag uchun alohida post-protsessor yozish shart emas — ularni sexda GibLab yaratadi. Smart3D'ning ishi — GibLab'ga Bazis'nikidek `.project` va prisadkaga KDT `.xml` berish. Hozirgi `giblab.js` boshqa narsa qiladi: o'z kesim xaritamizni GibLab'ning saqlangan fayli shaklida yozadi.

### Bajariladigan ishlar (2-tahrir)
1. **`.project` — Bazis eksportidek** (`importBMV 1.84`):
   - detallar (tayyor o'lcham, tekstura);
   - kromka (`EL` + band — haqiqiy kromka nomi, eni, qalinligi);
   - plita (`sheet` — ERP nomi va kodi, list o'lchami);
   - `CS` va har detal uchun `XNC` dasturi (teshiklar, TZ-06).
   - Kesimni GibLab o'zi optimallashtiradi. Hozirgi fayl (bizning kesim xaritasi bilan) — tanlov sifatida qoladi.
2. **KDT `.xml` (prisadka)** — har detalga bitta fayl, haqiqiy KDT shaklida (kontur, `Banding`, teshiklar), ZIP qilib beriladi.
3. **Haqiqiy buyurtmalar bilan tekshiruv** — avtomatik test, fayllar gitda emas. 30 buyurtmaning Bazis fayli TZ-21 orqali Smart3D loyihasiga o'tadi, bizning `.project` va KDT chiqariladi va sexdagi asl fayllar bilan detalma-detal solishtiriladi:
   - soni, o'lchami, materiali, kromka tomonlari;
   - teshiklar: soni, diametri, joyi.

   Farqlar ro'yxat bilan ko'rsatiladi.
4. **Teshiklar.** Bazis faylidan (TZ-06 usuli — mahkamlagichlardan) va KDT statistikasidan (`07_teshiklar_prisadka`). Petlya, polka ushlagich va ruchka teshiklari D6 jadvali bo'yicha — texnolog tasdiqlaydi.
5. **G-code / Rover** — avvalgi tuzatishlar (C2, C3, C5, C8). Ustuvorlik pastroq: Rover faqat frezalanadigan detallar uchun.
6. **Sinov (C10)** — avval sexda GibLab'ga bizning `.project` import qilinadi. Ko'rinishi Bazis faylidagidek bo'lishi kerak. Keyin 1 ta arzon detal kesiladi va prisadka qilinadi, texnolog tasdiqlaydi. Shundan keyin `SINOV` belgisi olinadi.

### Xavf
- **YUQORI** — stanok va plita. Hamma yangi fayl `SINOV` belgisi bilan, faqat admin uchun.
- Haqiqiy buyurtmalarda farq 0 bo'lmaguncha sexga berilmaydi.
- Kesish faqat egasining ruxsati bilan (5.1).

### Egasidan kerak
1. **"Boshla"** — 2-tahrir bo'yicha.
2. Texnolog — D6 jadvali (petlya, polka ushlagich, ruchka teshiklari). Asosi — `Teshiklar_KDT_statistika.xlsx`.
3. Sinov kuni: GibLab'ga import, keyin 1 ta detal.

### Muddat (taxmin)
- `.project` + KDT + 30 buyurtma bilan solishtirish — taxminan 2–3 ish kuni. Sinov kuni alohida. Bu taxmin.

### Natija (2026-10-16, cd63495)
- **`.project` (Bazis eksportidek)** — `app/js/engine/post/project.js`:
  - o'qish va yozish: detallar, kromka, plita, XNC (teshiklar; frezalash va paz o'zgarishsiz saqlanadi);
  - 30/30 sex faylida o'qish → yozish → o'qish aynan.
- **KDT** — `app/js/engine/post/kdt.js`. Sex fayllaridan kalibrlangan:
  - o'qlar, kromka tomonlari, qirra teshigi kvadrantlari;
  - o'tuvchi chuqurlik — qalinlik + 0,5;
  - yuza tanlash (_1/_2), ikki tomonlama teshikni birlashtirish.
  - Natija: 1776 ta detal yuzasida sex KDT bilan **99,2%** mos (aynan yoki 180° burilgan). Qolgan 14 tasi — maxsus detallar.
- **Smart3D loyihasidan** (`post/smart3d.js`):
  - sex Bazis birikmalari (MC modullar) va qo'lda chizilgan modullar konfirmatlari;
  - MC-KP-02 "pol" teshiklari sexdagi `.project` bilan aynan;
  - MC-KP-01/02, MC-KU-07 qo'lda chizilsa — teshiklar aynan.
- **Interfeys:** Fayllar qadamida "GibLab (Bazis)" va "KDT prisadka (ZIP)" — faqat admin, SINOV. Eski GibLab fayli qoladi.
- **Kirmagan, sababi bilan:**
  - umumiy SP modullar teshiklari (geometriya TZ-05 da, pauza) — ogohlantirish bilan;
  - egri kontur (frezalash) — 141 ta detal, keyingi bosqich.
- **Topildi (TZ-21):** sexdagi `.project` da `dl` — tekstura yo'nalishi. Bazis yuklashda biz uzunlikni kontur X dan olamiz, shuning uchun dekor plitada ba'zi detallarning teksturasi noto'g'ri chiqishi mumkin. Bazis faylidagi tekstura maydoni topilmadi: maydon raqamlari har faylda boshqa. Alohida tuzatish kerak.

### D6 — sex ma'lumotidan olingan taklif (texnolog tasdiqlaydi)
| Teshik | Qiymat (sex fayllarida eng ko'p) |
|---|---|
| Petlya kosasi | Ø35, chuqurligi 13 (ba'zan 12); markazi eshik chetidan 21–22 mm; uchidan 105 mm |
| Kosa vintlari | 2 × Ø3 × 2, kosa markazidan ±24 mm, chetdan 6 mm ichkarida |
| Petlya plankasi (yon devorda) | Ø3 × 2–3, old qirradan 37 mm (System 32); 2 ta, oralig'i 32 mm |
| Polka ushlagich | Ø5 × 9; old/orqa qirradan masofa modulga qarab — 40–80 mm (eng ko'p 45, 50, 65, 70) |
| Konfirmat | Ø7 o'tuvchi + qirrada Ø4,5 × 35 (planka — Ø8 + Ø5) — kodda bor |
| Ruchka | Ø5 o'tuvchi, oralig'i ruchkaga qarab (128 / 160) |

Petlya soni (eshik bo'yi bo'yicha) — sex fayllaridagi bilan bir xil: ≤ 900 mm — 2 ta.
