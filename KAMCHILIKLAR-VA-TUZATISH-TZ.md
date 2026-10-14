# Smart3D: Tizim Kamchiliklari Tahlili va To'g'rilash Bo'yicha Texnik Shartnoma (TZ)

> **Hujjat turi:** To'liq Texnik Audit & Ishlab Chiqish Shartnomasi (Audit & Remediation TZ)  
> **Sana:** 2026-10-14  
> **Loyiha:** Smart3D (Bittada mebel SaaS)  
> **Tekshirilgan komponentlar:** `Smart3D/app/` (Frontend, Engine, 3D, Export, Data), `Smart3D/server/` (Backend, DB, API, WebSocket), `data/*.json`, Texnik hujjatlar  
> **Audit xulosasi:** Demo holatda asosiy vizual oqim ishlaydi (~35%), ammo real mebel ishlab chiqarishga chiqarish uchun **30 ta jiddiy kamchilik, xato va arxitekturaviy bo'shliqlar** aniqlandi.

---

## MUNDARIJA

1. [Yig'ma Baholash va Audit Xulosasi](#1-yigma-baholash-va-audit-xulosasi)
2. [Aniqlangan 30 ta Kamchilik va Xatolar Katalogi](#2-aniqlangan-30-ta-kamchilik-va-xatolar-katalogi)
   - [Guruh A: Formula, Geometriya va Detallashtirish Dvigateli (Cutlist & Math)](#guruh-a-formula-geometriya-va-detallashtirish-dvigateli)
   - [Guruh B: Raskroy (Kroy) va Qoldiqlar Dvigateli (Nesting & GibLab)](#guruh-b-raskroy-kroy-va-qoldiqlar-dvigateli)
   - [Guruh C: Stanok Post-prosessorlari va CNC Chiqishlari (CNC & Machine Code)](#guruh-c-stanok-post-prosessorlari-va-cnc-chiqishlari)
   - [Guruh D: Narx, Smeta va Tannarx Hisobi (Pricing & ERP Integration)](#guruh-d-narx-smeta-va-tannarx-hisobi)
   - [Guruh E: 3D Sahna, Render va Vizualizatsiya (Three.js & Graphics)](#guruh-e-3d-sahna-render-va-vizualizatsiya)
   - [Guruh F: AI, Tabiiy Til va Ovoz Tizimi (AI & Natural Language)](#guruh-f-ai-tabiiy-til-va-ovoz-tizimi)
   - [Guruh G: Modullar Kutubxonasi va Materiallar Bazasining Holati (Catalogs)](#guruh-g-modullar-kutubxonasi-va-materiallar-bazasining-holati)
   - [Guruh H: Server, Ma'lumotlar Bazasi va Infratuzilma (Backend & DB)](#guruh-h-server-malumotlar-bazasi-va-infratuzilma)
   - [Guruh I: Ma'lumotlar Butunligi va Formatlar Eksporti (Integrity & Export)](#guruh-i-malumotlar-butunligi-va-formatlar-eksporti)
3. [Kamchiliklarni Bartaraf Etish Bo'yicha Texnik Shartnoma (Remediation TZ)](#3-kamchiliklarni-bartaraf-etish-boyicha-texnik-shartnoma)
   - [TZ-1: Xavfsiz Matematik Ifoda Parsyeri (Safe Math Parser)](#tz-1-xavfsiz-matematik-ifoda-parsyeri)
   - [TZ-2: Haqiqiy Ko'p Slotli Modul Konstruksiyasi (Slots: Korpus, Fasad, Orqa)](#tz-2-haqiqiy-kop-slotli-modul-konstruksiyasi)
   - [TZ-3: Haqiqiy Tannarxga Asoslangan Smeta Dvigateli (True Cost Engine)](#tz-3-haqiqiy-tannarxga-asoslangan-smeta-dvigateli)
   - [TZ-4: Raskroy Dvigatelini Yangilash (Trim, Tekstura, Altendorf, Qoldiq)](#tz-4-raskroy-dvigatelini-yangilash)
   - [TZ-5: CNC G-code va Post-prosessorlarni To'g'rilash (Offset, Tabs, Drill)](#tz-5-cnc-g-code-va-post-prosessorlarni-togrilash)
   - [TZ-6: 3D Sahna va Panellar Bo'yicha Haqiqiy Geometriya](#tz-6-3d-sahna-va-panellar-boyicha-haqiqiy-geometriya)
   - [TZ-7: AI-1 Tarjimon va AI-2 Konstruktorni Haqiqiy LLMga Ulash](#tz-7-ai-1-tarjimon-va-ai-2-konstruktorni-haqiqiy-llmga-ulash)
   - [TZ-8: Server va DB Arxitekturasini Bir Xillashtirish](#tz-8-server-va-db-arxitekturasini-bir-xillashtirish)
   - [TZ-9: Eksport Butunligi Nazorati va XLSX Format](#tz-9-eksport-butunligi-nazorati-va-xlsx-format)
4. [Amalga Oshirish Bosqichlari va Ustuvorlik (Roadmap P0, P1, P2)](#4-amalga-oshirish-bosqichlari-va-ustuvorlik)
5. [Qabul Qilish Mezonlari (Verification & Acceptance Criteria)](#5-qabul-qilish-mezonlari)

---

## 1. Yig'ma Baholash va Audit Xulosasi

| Yo'nalish | Holat | Xavf Darajasi | Asosiy Muammo |
|---|---|---|---|
| **Formula & Detallar** | ⚠️ Qisman ishlaydi | 🔴 O'TA YUQORI | Shartli ifodalar (`w>600?2:1`) va `t` (qalinlik) ishlamaydi. Qalinlik o'zgarsa mebel o'lchami xato chiqadi. |
| **Kroy (Raskroy)** | ⚠️ 70% tayyor | 🔴 YUQORI | Trim (torcovka) o'lchami hisobga olinmaydi, yog'och teksturasi yo'nalishi e'tiborga olinmaydi (brak xavfi). |
| **CNC & Stanoklar** | ⚠️ Boshlang'ich qoralama | 🔴 O'TA YUQORI | Freza radiusi kompensatsiyasi (G41/G42 offset) yo'q, detal toolDia qadar kichrayib qoladi; teshiklar G-code'ga kirmagan. |
| **Narx & Smeta** | ⚠️ 50% tayyor | 🟡 O'RTA-YUQORI | Mijoz narxi kroy natijasidagi listlar soniga bog'lanmagan; ish haqi va teshik narxi xarajatga qo'shilmaydi. |
| **3D & Render** | ⚠️ Boshlang'ich quti | 🟡 O'RTA | 3D sahnada va OBJ'da faqat yaxlit kublar chiziladi; detallar (yon, pol, eshik) alohida ko'rinmaydi. |
| **AI & Ovoz** | ⚠️ Qoidalar prototipi | 🟡 O'RTA | Faqat 1 devorga teradi, L-shaklli oshxona qura olmaydi; LLM ulanmagan; faqat brauzer ovozidan foydalanadi. |
| **Katalog & Baza** | ⚠️ Chala ma'lumot | 🔴 YUQORI | 600 ta fragmentdan 63 tasi bor; 1978 furnituraning 71% qismida narx yo'q; slotlar (fasad/korpus) yo'q. |
| **Server & DB** | ⚠️ Ikkilangan kod | 🔴 YUQORI | `server/package.json`dagi `npm start` `helmet` yo'qligi tufayli crash bo'ladi; SQLite va Postgres arxitekturasi ajralib ketgan. |
| **Ma'lumot Butunligi** | ⚠️ Yuzaki tekshiruv | 🟡 O'RTA | Eksport oldidan nazorat yig'indilari (detal soni, $m^2$, kromka, teshiklar) solishtirilmaydi; XLSX eksport yo'q. |

---

## 2. Aniqlangan 30 ta Kamchilik va Xatolar Katalogi

### Guruh A: Formula, Geometriya va Detallashtirish Dvigateli

#### 1. `evalExpr` shartli ifodalar va mantiqiy amallarni qo'llab-quvvatlamaydi
* **Fayl:** `app/js/engine/cutlist.js` (17-satr)
* **Muammo:** 
  ```javascript
  if (!/^[0-9+\-*/(). ]+$/.test(s)) {
    throw new Error('E_BAD_EXPR: ' + s0);
  }
  ```
  Regex faqat raqamlar va oddiy arifmetikani o'tkazadi. TZ §3.1 dagi `"w>600?(w/2-3):(w-4)"` yoki `"soni": "w>600?2:1"` kabi ifodalar `?`, `:`, `>`, `<`, `=`, `!` belgilariga ega bo'lgani uchun darhol `E_BAD_EXPR` xatosi bilan to'xtaydi.
* **Oqibat:** Eshiklar soni, tokchalar miqdori yoki modul kengligiga qarab o'zgaruvchi murakkab mebel detallarini formulalashtirib bo'lmaydi.

#### 2. Detal soni (`qty`) formula bilan hisoblanmaydi
* **Fayl:** `app/js/engine/cutlist.js` (45-satr)
* **Muammo:**
  ```javascript
  const qty = Math.max(1, Math.round(+p.qty || 1));
  ```
  Agar `p.qty` formulasi `"w > 600 ? 2 : 1"` bo'lsa, `+p.qty` amali `NaN` beradi, `NaN || 1` esa `1` ga teng bo'lib qoladi. Kengligi 800 mm bo'lgan shkafga 2 ta eshik o'rniga 1 ta eshik chiqariladi!
* **Oqibat:** Kesim listida va smetada detallar soni kam chiqadi.

#### 3. Material qalinligi (`t`) formulalarda mavjud emas
* **Fayl:** `app/js/engine/cutlist.js` (37-satr)
* **Muammo:**
  ```javascript
  const vars = { w: +w, d: +d, h: +h };
  ```
  O'zgaruvchilar orasida `t` (panel qalinligi) yo'q! Natijada `"w - 2 * t"` ifodasi `E_BAD_EXPR` beradi. Hozirgi `fragments.json`da esa bu `w - 36` deb qattiq yozilgan (18 mm LDSP hisobidan: $18 \times 2 = 36$). Agar foydalanuvchi 16 mm LDSP tanlasa, tub va tokcha detallari $w - 32$ bo'lishi kerak edi, lekin $w - 36$ bo'lib, detal 4 mm ga qisqa kesiladi.
* **Oqibat:** Ishlab chiqarishda mebel yig'ilmaydi — brak bo'ladi!

#### 4. `bpj.js` ichida formula hisobi dublikat qilingan va soxta xavfsiz
* **Fayl:** `app/js/engine/bpj.js` (77, 254-satrlar)
* **Muammo:** `bpj.js` `cutlist.js`dagi hisoblangan detallarni ishlatmasdan, o'zining ichida alohida `evalF` funksiyasi orqali formulalarni boshqatdan hisoblaydi:
  ```javascript
  function evalF(expr, vars) { ... if (!/^[0-9+\-*/(). ]+$/.test(s)) return 0; ... }
  ```
  Murakkab formula bo'lsa, xato berish o'rniga jimgina `0` qaytaradi!
* **Oqibat:** Cutlist'da boshqa o'lcham, BPJ (Bazis) eksportida esa 0 yoki boshqa o'lcham paydo bo'ladi. Yagona Manba (Single Source of Truth) tamoyili buzilgan.

#### 5. JS `Function(...)` orqali eval xavfsizlik talablariga zid
* **Fayl:** `app/js/engine/cutlist.js` (20-satr), `bpj.js` (260-satr)
* **Muammo:** `Function('"use strict";return (' + s + ')')()` ishlatilmoqda. TZ §1.8 da bu xavfli deb baholangan va maxsus tokenizator/AST parser bilan almashtirilishi belgilangan.

---

### Guruh B: Raskroy (Kroy) va Qoldiqlar Dvigateli

#### 6. Chetki kesim — Trim (torcovka / obrezka) hisobga olinmaydi
* **Fayl:** `app/js/engine/nesting.js` (125–175-satrlar), `app/js/app.js` (998-satr)
* **Muammo:** Foydalanuvchi interfeysdagi sozlamalar modalida `trimL = 10mm`, `trimW = 10mm` kiritadi, lekin `nestPanels` funksiyasi bu parametrlarni umuman qabul qilmaydi va ishlatmaydi. Varaq `(0, 0)` nuqtadan boshlab to'liq `sheetL x sheetW` bo'yicha kesiladi.
* **Oqibat:** Real plita chetidagi zavod shikastlari, chipiqlar va egriliklar toza kesib tashlanmasdan detallarga tushadi.

#### 7. Yog'och teksturasi (tekstura / grain direction) e'tiborga olinmaydi
* **Fayl:** `app/js/engine/nesting.js` (37–65, 87–100-satrlar)
* **Muammo:** `maxRot = 2` bo'lsa, barcha detallar avtomatik 90° ga aylantirilib joylanadi. Detalning teksturasi bormi yo'qmi tekshirilmaydi (`p.texture` / `p.tekstura` maydoni yo'q).
* **Oqibat:** Yog'och naqshli fasad yoki eshik vertikal emas, gorizontal kesilib qoladi — mebel ko'rinishi buziladi va mijoz rad etadi.

#### 8. Altendorf (qo'lda ishlaydigan formatli arra) uchun kesim ketma-ketligi yo'q
* **Fayl:** `app/js/engine/nesting.js` (80–118-satrlar)
* **Muammo:** `packSheet` (BSSF) algoritmi erkin to'rtburchaklar maydonini ixtiyoriy ravishda bo'ladi. Natijada plitani og'ir holda 5-6 marta aylantirish talab qilinadigan murakkab chiziqlar hosil bo'ladi. Altendorf ustasi bu chizmani ko'rib, qaysi polosa birinchi kesilishini tushunolmaydi.
* **Oqibat:** Sexda arra operatori xato qiladi yoki kroy kartasidan voz kechib o'zi qo'lda hisoblaydi.

#### 9. Delovoy qoldiqlar (remnants) bazasi yo'q
* **Fayl:** `app/js/engine/nesting.js` (165–172-satrlar)
* **Muammo:** Qoldiqlar ekran statistikasi uchun ekranda sanaladi, lekin ular alohida identifikator (QR) bilan saqlanmaydi va keyingi kroy hisobida qayta ishlatilmaydi.
* **Oqibat:** Sunpina modelidagi asosiy iqtisodiy tejamkorlik (qoldiqlarni keyingi buyurtmaga birinchi bo'lib kiritish) ishlamaydi.

#### 10. Bir nechta buyurtmani birgalikda kroy qilish (Multi-order batching) yo'q
* **Fayl:** `app/js/engine/nesting.js` (199–250-satrlar)
* **Muammo:** `nestProject` faqat joriy bitta loyihaning detallarini oladi. Bir xil materialdagi 3 ta turli buyurtmani birlashtirib umumiy varaqqa terish imkoniyati yo'q.

---

### Guruh C: Stanok Post-prosessorlari va CNC Chiqishlari

#### 11. G-code kesimida freza radiusi kompensatsiyasi (Offset) yo'q
* **Fayl:** `app/js/engine/cnc.js` (246–253-satrlar)
* **Muammo:**
  ```javascript
  L.push('G1 X' + (x + len).toFixed(2) + ' Y' + y.toFixed(2) + ' F' + feed + ';');
  ```
  Freza to'g'ridan-to'g'ri detal koordinatasining ustidan yuradi. Agar freza diametri $\varnothing = 4\text{ mm}$ bo'lsa, freza detalning ichiga 2 mm kirib ketadi va tayyor detal bo'yidan ham, enidan ham 4 mm ga kichik bo'lib chiqadi!
* **Oqibat:** CNC stanokda kesilgan barcha detallar yaroqsiz (brak) bo'ladi!

#### 12. Detallarni ushlab turuvchi ko'priklar (Tabs / Bridges) yo'q
* **Fayl:** `app/js/engine/cnc.js` (245–254-satrlar)
* **Muammo:** Butun kontur to'liq qalinlikda (masalan, $Z = -16\text{ mm}$) oxirigacha aylanib kesiladi. Oxirgi nuqtada detal ajralib chiqib, aylanayotgan frezaga uriladi yoki vakuum stoldan uchib ketadi.
* **Oqibat:** Detal shikastlanadi, stanok frezasi sinishi yoki operatorga xavf tug'ilishi mumkin.

#### 13. Teshiklar G-code kontur kesimiga birlashtirilmagan
* **Fayl:** `app/js/engine/cnc.js` (125, 209-satrlar)
* **Muammo:** Teshiklar alohida `drillNC` (Excellon fayli) orqali chiqadi, kontur kesish esa alohida `cutGCode` orqali chiqadi. Zamonaviy CNC Rover yoki Nesting stanoklarida avval teshiklar burg'ilanadi, so'ngra kontur kesiladi. Alohida ikkita faylni bitta stanokda koordinatasiz ishlatib bo'lmaydi.
* **Oqibat:** Sex operatori fayllarni stanokda alohida-alohida yuklashga va nollarni qayta sozlashga majbur bo'ladi.

#### 14. Biesse (.cix) va WoodWOP (.mpr) post-prosessorlari mavjud emas
* **Fayl:** `app/js/engine/cnc.js`
* **Muammo:** Sexda mavjud Biesse Rover va Homag stanoklari uchun mahalliy formatlar (`.cix`, `.bpp`, `.mpr`) yo'q, faqat umumiy Fanuc ISO G-code bor.

---

### Guruh D: Narx, Smeta va Tannarx Hisobi

#### 15. Mijoz narxi kroy natijasidagi haqiqiy varaqlar soniga mutlaqo bog'lanmagan
* **Fayl:** `app/js/app.js` (133, 159, 189-satrlar), `app/js/engine/price.js`
* **Muammo:** `priceRes` hisobi faqat `price.js` orqali `fragments.json`dagi sun'iy bazaviy narxni koeffitsientga ko'paytirish bilan cheklanadi. Kroyda 2 ta list ketadimi yoki 6 ta list ketadimi — mijoz narxi va tannarx bir xil turaveradi!
* **Oqibat:** TZ §5 va §16 dagi eng asosiy shart ("Tannarx kroy natijasidagi HAQIQIY listlar soni bilan hisoblanadi") bajarilmagan. Sex zararga kirishi mumkin.

#### 16. `productionCost` funksiyasida plita narxi, teshiklar va ish haqi yig'indiga qo'shilmaydi
* **Fayl:** `app/js/engine/cutlist.js` (136–184-satrlar)
* **Muammo:** Funksiya ichida faqat `edgeAgg` (kromka) va `hwAgg` (furnitura) `total`ga qo'shiladi:
  ```javascript
  total += amount; // faqat kromka va furnitura
  ```
  `groups` (plitalar), `holeByKind` (burg'ilash) va `materials.labor` (ish haqi) obyektlari yuklanadi, lekin ularning narxi `total`ga qo'shilmaydi!
* **Oqibat:** Ishlab chiqarish tannarxi real narxdan 3-4 baravar past ko'rinadi (chunki plita va ish haqi hisobda yo'q).

#### 17. 1,403 ta furnitura tovarining narxi 0 bo'lib turibdi
* **Fayl:** `app/data/furnitura-catalog.json`
* **Muammo:** 1,978 ta mahsulotdan faqat 575 tasida narx bor. Qolgan 1,403 tasida `uzs: 0, usd: 0`.
* **Oqibat:** Smetaga qo'shilgan furnituralar hisobda narxsiz (0 so'm) o'tib ketadi.

#### 18. Xizmat narxlari bazasi (`services.json`) yo'q
* **Fayl:** `app/data/`
* **Muammo:** Bittada ERP tizimidagi 211 ta xizmat (arra narxi, kvadrat metri, kromka urish, prisadka, yetkazib berish) JSON formatda chiqarilmagan va `app`ga ulanmagan.

---

### Guruh E: 3D Sahna, Render va Vizualizatsiya

#### 19. 3D sahnada detallar ko'rinmaydi — faqat bitta bo'yalgan quti
* **Fayl:** `app/js/materials3d.js` (46–52-satrlar)
* **Muammo:**
  ```javascript
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  ```
  Mebel detallar (yon devorlar, tub, qopqoq, tokcha, eshiklar) sifatida yig'ilmaydi. Faqat tashqi gabarit qutisi ko'rsatiladi.
* **Oqibat:** Eshikni ochib bo'lmaydi, ichki tokchalar ko'rinmaydi, mijoz mebelning ichki tuzilishini ko'ra olmaydi.

#### 20. OBJ eksportida ham faqat gabarit qutisi eksport qilinadi
* **Fayl:** `app/js/engine/objexport.js` (134–148-satrlar)
* **Muammo:** `buildOBJ` funksiyasi har bir mebel uchun faqat 8 ta nuqtali bitta qutini `v` va `f` formatida yozadi.
* **Oqibat:** Blender, 3ds Max yoki SketchUp'ga import qilinganda mebel yaxlit quti bo'lib tushadi, uni ochib yoki tahrirlab bo'lmaydi.

#### 21. GLB / glTF eksporti yo'q
* **Fayl:** `app/js/engine/objexport.js`
* **Muammo:** WebXR, zamonaviy veb-render va mobil ilovalar uchun standart format GLB hisoblanadi. Hozir faqat eski OBJ+MTL bor.

#### 22. Serverda foto-render worker tizimi yo'q
* **Fayl:** `server/`
* **Muammo:** TZ §8 da ko'rsatilgan $\le 3$ daqiqada 1080p foto-render va 360° panorama chiqaruvchi Blender headless worker mexanizmi mavjud emas.

---

### Guruh F: AI, Tabiiy Til va Ovoz Tizimi

#### 23. `suggestLayout` faqat 1 ta to'g'ri devorga mebel joylashtiradi
* **Fayl:** `app/js/ai.js` (147–183-satrlar)
* **Muammo:** Modullarni faqat $y = \text{WALL}$ devori bo'ylab $x$ o'qi bo'yicha teradi. L-shaklli (burchakli oshxona), U-shaklli yoki orolli oshxonalarni xonaga burib joylashtirish algoritmi yo'q.

#### 24. Tabiiy o'zbek tili variatsiyalari va xatolarni tushunish juda zaif
* **Fayl:** `app/js/ai.js` (14–103-satrlar)
* **Muammo:** Oddiy qattiq regexlar ishlatilgan. Agar usta *"uzunligi 3 yarim metrga 4 metr, pastki shkafdan 3 dona, 60 lik"* desa:
  - `"3 yarim"` son emas deb tashlab yuboriladi;
  - `"3 dona"` regexdagi `ta` bo'lmagani uchun o'qilmaydi;
  - `"60 lik"` o'lcham sifatida bog'lanmaydi.

#### 25. Serverdagi AI marshruti (`/api/ai/build`) qalbaki ma'lumot qaytaradi
* **Fayl:** `server/src/routes/ai.js` (98–101-satrlar)
* **Muammo:** Agar LLM kaliti bo'lmasa, `localBuild` har qanday matnga qat'iy qilib 2 ta qattiq kodlangan modul (`SP-K-001`, `SP-K-002`) qaytaradi. Haqiqiy xona o'lchami va so'rov inobatga olinmaydi.

#### 26. Ovozli kiritish faqat brauzer Web Speech API bilan cheklangan
* **Fayl:** `app/js/ai.js` (250–274-satrlar)
* **Muammo:** Mobil brauzerlarda (ayniqsa iOS Safari va ko'plab Android Chrome versiyalarida) o'zbek tili uchun Web Speech API ishlamaydi yoki rus tiliga o'tib ketadi. Yandex SpeechKit yoki Gemini Live server-proxy ulanmagan.

---

### Guruh G: Modullar Kutubxonasi va Materiallar Bazasining Holati

#### 27. Fragmentlarda material slotlari (Slots) arxitekturasi yo'q
* **Fayl:** `app/data/fragments.json`
* **Muammo:** Har bir fragmentda faqat bitta umumiy `material_code: "MDF16"` bor. Real hayotda esa korpus (LDSP Oq), fasad (AGT Yaltiroq), orqa devor (HDF 3mm), korpus kromkasi (0.4mm) va fasad kromkasi (2mm) har xil bo'ladi.
* **Oqibat:** Korpus va fasadga alohida material tanlab bo'lmaydi.

#### 28. Kutubxonada 600 ta modul o'rniga atigi 63 ta modul bor
* **Fayl:** `app/data/fragments.json`
* **Muammo:** Hozirgi 63 ta modul faqat boshlang'ich oshxona va ayrim javonlarni o'z ichiga oladi. Garderob-kupe, bolalar xonasi, burchak modullari, tortmali modullar to'liq emas.

---

### Guruh H: Server, Ma'lumotlar Bazasi va Infratuzilma

#### 29. Server ishga tushmaydi (`npm start` sinadi)
* **Fayl:** `server/package.json` (8-satr), `server/src/server.js`
* **Muammo:** `package.json` ichida `"start": "node src/server.js"` yozilgan. Lekin `src/server.js` chaqiradigan `helmet`, `winston`, `pg`, `ioredis`, `prom-client` kutubxonalari `node_modules`da o'rnatilmagan!
  Lokalda ishlaydigan SQLite server esa `server/index.js`da qolib ketgan.
* **Oqibat:** Yangi dasturchi kelib `npm start` qilsa, loyiha darhol xato bilan to'xtaydi.

---

### Guruh I: Ma'lumotlar Butunligi va Formatlar Eksporti

#### 30. Eksport oldidan nazorat yig'indilari (Checksum Integrity) tekshirilmaydi va XLSX yo'q
* **Fayl:** `app/js/app.js` (267–275-satrlar)
* **Muammo:** TZ §11 talabi: Eksportdan oldin cutlist'dagi detallar soni, umumiy $m^2$, teshiklar soni va kroyga kirgan detallar soni tengligi tekshirilishi shart. Hozir bu tekshiruv yo'q. Shuningdek, smeta va kesim listi faqat CSV formatda eksport qilinadi, sex ustasi uchun zarur bo'lgan `.xlsx` formati yo'q.

---

## 3. Kamchiliklarni Bartaraf Etish Bo'yicha Texnik Shartnoma (Remediation TZ)

Ushbu bo'lim yuqoridagi 30 ta kamchilikni bosqichma-bosqich tuzatish uchun dasturchiga aniq ko'rsatma va talablar to'plamidir.

```
┌────────────────────────────────────────────────────────────────────────┐
│               SMART3D TUZATISH DASTURI (ARXITEKTURA)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Core Engine:                                                        │
│    Safe Expression Parser (w, d, h, t, ternary) + Slot Architecture    │
│                                                                        │
│ 2. Cost & Smeta Engine:                                                │
│    Haqiqiy Kroy Varaqlari soni + Kromka + Furnitura + Ish haqi = Tannarx│
│                                                                        │
│ 3. Nesting & CNC:                                                      │
│    Trim qo'llash + Tekstura tekshiruvi + Freza radiusi offset (G41/G42) │
│                                                                        │
│ 4. 3D & Graphics:                                                      │
│    Panel-by-panel 3D geometriya + GLB eksport                          │
│                                                                        │
│ 5. Backend & Integrity:                                                │
│    Server index.js / src birlashtirish + Checksum nazorati + XLSX      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### TZ-1: Xavfsiz Matematik Ifoda Parsyeri (Safe Math Parser)
* **Maqsad:** `eval` va `Function(...)` dan butunlay voz kechish, shartli amallarni to'liq qo'llab-quvvatlash.
* **Qo'llab-quvvatlanadigan o'zgaruvchilar:** `w` (kenglik), `d` (chuqurlik), `h` (balandlik), `t` (korpus materialining qalinligi).
* **Qo'llab-quvvatlanadigan operatorlar:**
  * Arifmetik: `+`, `-`, `*`, `/`, `%`, `( )`
  * Taqqoslash: `>`, `<`, `>=`, `<=`, `==`, `!=`
  * Mantiqiy: `&&`, `||`, `!`
  * Shartli (Ternary): `shart ? rost : yolg'on`
* **Implementatsiya talabi:**
  Yangi modul `app/js/engine/expr.js`:
  ```javascript
  export function evalFormula(exprStr, vars) { ... }
  ```
  Hech qanday tashqi kutubxonasiz yoki xavfsiz tokenizer-shunting-yard algoritmi asosida yoziladi.
* **Integratsiya:** `cutlist.js` va `bpj.js` ikkalasi ham faqat shu bitta `evalFormula` modulidan foydalanadi.

---

### TZ-2: Haqiqiy Ko'p Slotli Modul Konstruksiyasi (Slots: Korpus, Fasad, Orqa)
* **Maqsad:** Har bir fragmentda har xil materiallarni biriktirish imkoniyatini yaratish.
* **Modul sxemasi yangilanishi:**
  ```json
  {
    "code": "SP-K-001",
    "slots": {
      "korpus": "LDSP18",
      "fasad": "MDF16",
      "orqa": "HDF3",
      "kromka_korpus": "PVC04",
      "kromka_fasad": "PVC2"
    },
    "parts": [
      { "code": "yon", "qty": 2, "len": "h", "width": "d", "slot": "korpus", "edge": {"F": "kromka_korpus"}, "tekstura": "uzunlik" },
      { "code": "tub", "qty": 1, "len": "w - 2 * t", "width": "d", "slot": "korpus", "edge": {"F": "kromka_korpus"}, "tekstura": "uzunlik" },
      { "code": "eshik", "qty": "w > 600 ? 2 : 1", "len": "h - 8", "width": "w > 600 ? (w/2 - 3) : (w - 4)", "slot": "fasad", "edge": {"F": "kromka_fasad", "B": "kromka_fasad", "L": "kromka_fasad", "R": "kromka_fasad"}, "tekstura": "uzunlik" },
      { "code": "orqa", "qty": 1, "len": "h - 4", "width": "w - 4", "slot": "orqa", "tekstura": "erkin" }
    ]
  }
  ```
* **Natija:** Usta bitta tugma bilan butun loyihaning korpusini bir materialga, eshiklarini boshqa materialga almashtira oladi.

---

### TZ-3: Haqiqiy Tannarxga Asoslangan Smeta Dvigateli (True Cost Engine)
* **Hisoblash formulasi:**
  $$\text{Tannarx} = \sum (\text{Kroy varaqlari soni} \times \text{Varaq narxi}) + \sum (\text{Kromka metri} \times \text{Kromka narxi}) + \sum (\text{Furnitura soni} \times \text{Narx}) + \sum \text{Xizmatlar} + \text{Ish haqi}$$
  $$\text{Mijoz narxi} = \text{Tannarx} \times (1 + \text{Ustama marjasi})$$
* **Talablar:**
  1. `doRecalc()` funksiyasida kroy natijasi (`nest.summary.material_cost`) to'g'ridan-to'g'ri smeta tannarxiga uzatiladi.
  2. Smetada ikkita ko'rinish bo'ladi:
     * **Mijoz uchun smeta:** Modullar nomi, o'lchami, donasi va yakuniy chiroyli narx.
     * **Sex uchun tannarx xaritasi:** Varaqlar soni va xarajati, ishlatilgan kromka metri, furnitura ro'yxati, arralash va yig'ish ish haqi, sex foydasi.

---

### TZ-4: Raskroy Dvigatelini Yangilash (Trim, Tekstura, Altendorf, Qoldiq)
* **Trim (torcovka) joriy etish:**
  `sheetL_eff = sheetL - 2 * trimL`, `sheetW_eff = sheetW - 2 * trimW`. Detallar koordinatasi `(trimL + x, trimW + y)` ga siljitiladi.
* **Tekstura yo'nalishi cheklovi:**
  Agar `part.tekstura === 'uzunlik'` bo'lsa, detalni 90° aylantirish qat'iyan taqiqlanadi (`canRotate = false`).
* **Altendorf rejimini takomillashtirish:**
  `packStrip` (lenta) usulida birinchi uzun qirqimlar (polosalar) tartib bilan raqamlanadi va kroy kartasida arra o'tish tartibi ko'rsatiladi: `1-kesim`, `2-kesim`, `3-kesim`.
* **Qoldiqlar (remnants) reestri:**
  O'lchami $\ge 300 \times 300\text{ mm}$ bo'lgan qoldiqlar `remnants` jadvaliga yoziladi va keyingi loyiha hisobida avval shu qoldiqlar taklif etiladi.

---

### TZ-5: CNC G-code va Post-prosessorlarni To'g'rilash (Offset, Tabs, Drill)
* **Asbob radiusi kompensatsiyasi (Tool Radius Offset):**
  Kontur kesishda freza koordinatasi detal chetidan tashqariga `toolDia / 2` masofaga suriladi:
  $$X_{\text{start}} = x - r,\quad Y_{\text{start}} = y - r,\quad \text{Kenglik} = \text{len} + 2r,\quad \text{Balandlik} = \text{wid} + 2r$$
* **Ushlab turuvchi ko'priklar (Tabs):**
  Perimetri bo'ylab har bir tomonning o'rtasida 20 mm uzunlikda va 2 mm balandlikda ko'prik qoldiriladi ($Z = -(\text{depth} - 2\text{mm})$), detal kesilganda uchib ketmasligi uchun.
* **G-code ichiga teshiklarni kiritish:**
  Kontur kesishdan oldin stanok birinchi bo'lib barcha burg'ilash teshiklarini ($Z = -\text{chuqurlik}$) bajaradi, so'ngra konturni kesadi. Bitta fayl — to'liq operatsiya!

---

### TZ-6: 3D Sahna va Panellar Bo'yicha Haqiqiy Geometriya
* **Bo'sh kub o'rniga panelli yig'ish:**
  Har bir modul uchun uning `cutlist` detallari asosida 3D meshlar yig'iladi:
  * Chap yon devor: `BoxGeometry(t, h, d)`
  * O'ng yon devor: `BoxGeometry(t, h, d)`
  * Tub: `BoxGeometry(w - 2*t, t, d)`
  * Tokcha: `BoxGeometry(w - 2*t, t, d - 20)`
  * Eshik: `BoxGeometry(w - 4, h - 8, t)`
  * Orqa devor: `BoxGeometry(w - 4, h - 4, 3)`
* **PBR Materiallar va Teksturalar:**
  Haqiqiy ERP dekor rasmlari (yog'och, oq mat, marmar) material yuzasiga tekstura sifatida tushadi.
* **GLB Eksport:**
  Three.js `GLTFExporter` orqali sahnani `.glb` formatida yuklab olish imkoniyati qo'shiladi.

---

### TZ-7: AI-1 Tarjimon va AI-2 Konstruktorni Haqiqiy LLMga Ulash
* **Server-side LLM Proxy:**
  Brauzerdan API kalitsiz `POST /api/ai/command` yuboriladi. Serverda Gemini / Claude API orqali tabiiy matn qat'iy JSON sxemasiga aylantiriladi:
  ```json
  {
    "action": "add_module",
    "category": "kitchen_base",
    "width": 600,
    "wall": "A",
    "position": "corner_left",
    "materials": { "carcass": "LDSP-00123", "door": "AGT-00045" }
  }
  ```
* **Burchakli (L-shape) va U-shape oshxona algoritmi:**
  `suggestLayout` xonaning barcha 4 devorini ($A, B, C, D$) ketma-ket hisoblab, burchak moduli orqali ikkinchi devorga o'tishni amalga oshiradi.

---

### TZ-8: Server va DB Arxitekturasini Bir Xillashtirish
* **Bitta barqaror backend:**
  `server/index.js` (SQLite + Express + WS) asosiy ishchi server sifatida barqarorlashtiriladi yoki `server/package.json`dagi barcha bog'liqliklar (`pg`, `redis`, `helmet`) to'liq o'rnatilib, Docker Compose bilan sinxron ishga tushiriladi.
* **Frontendni REST API ga ulash:**
  Frontend yuklanganda materiallarni statik JSON dan emas, `GET /api/materials` va `GET /api/fragments` orqali serverdan oladi. Offline holatda esa Service Worker (PWA cache) orqali oxirgi keshdan o'qiydi.

---

### TZ-9: Eksport Butunligi Nazorati va XLSX Format
* **Nazorat yig'indilari tekshiruvi (Pre-export Checksum):**
  Eksport tugmasi bosilganda avtomatik ravishda tekshiriladi:
  * $\text{Detallar soni (Cutlist)} \equiv \text{Detallar soni (Kroy)} \equiv \text{Detallar soni (BPJ/CNC)}$
  * $\text{Umumiy yuza } m^2\text{ (Cutlist)} \equiv \text{Umumiy yuza } m^2\text{ (Kroy)}$
  * Farq aniqlansa: qizil ogohlantirish chiqadi va eksport to'xtatiladi.
* **XLSX Eksport:**
  `SheetJS` (`xlsx.full.min.js`) kutubxonasi qo'shilib, chiroyli formatlangan, kataklari bo'yalgan va formulalari bor `.xlsx` hisoboti chiqariladi.

---

## 4. Amalga Oshirish Bosqichlari va Ustuvorlik

### 🔴 P0 — Zudlik bilan bajarilishi shart (2–3 kun ichida)
1. **Xavfsiz matematik ifoda dvigateli (`evalFormula`):** shartli amallar (`? :`), `t` (qalinlik) va `qty` formulalarini to'liq ishga tushirish.
2. **Haqiqiy tannarx smetasi:** kroy varaqlar sonini va ish haqini umumiy hisob-kitobga bog'lash.
3. **Raskroyda Trim (torcovka) va Tekstura yo'nalishini yoqish:** brak chiqishining oldini olish.
4. **CNC G-code offsetini to'g'rilash:** freza diametrini hisobga olgan holda tashqi kontur yurishi va teshiklarni bitta dasturga qo'shish.
5. **Server ishga tushishini tuzatish:** `server/` papkasini tozalab, bitta buyruq bilan xatosiz ishlaydigan qilish.

### 🟡 P1 — 1 hafta ichida
6. **3D sahnada detallar bo'yicha geometriya:** quti o'rniga haqiqiy panellar va eshiklarni chizish.
7. **Modul slotlari arxitekturasi:** korpus va fasadga alohida material biriktirish.
8. **Eksport nazorat yig'indilari (Integrity Check) va XLSX eksport.**
9. **AI-1 Tarjimonni server orqali Gemini/Claude LLM ga ulash.**
10. **L-shaklli oshxona joylashtirish algoritmi.**

### 🟢 P2 — Keyingi bosqich
11. 600 ta modul bazasini to'liq kiritish va sinovdan o'tkazish.
12. Biesse Rover (`.cix`) va WoodWOP (`.mpr`) post-prosessorlarini sex namunalari asosida yakunlash.
13. Serverda Blender photo-render worker va 360° panorama xizmati.
14. Qoldiqlar ombori (Remnants Warehouse) tizimi.

---

## 5. Qabul Qilish Mezonlari (Verification & Acceptance Criteria)

Har bir vazifa quyidagi testlardan o'tgandan keyingina "Bajarildi" deb qabul qilinadi:

1. **Formula testi:** `"w - 2 * t"` formulasi $w=600, t=16$ bo'lganda $568$, $t=18$ bo'lganda $564$ chiqarishi shart. `"w > 600 ? 2 : 1"` $w=800$ da aniq $2$ chiqarishi shart.
2. **Kroy solishtiruvi:** Bir xil detal ro'yxati berilganda, Trim = 10 mm bo'lsa, varaqning 4 tomonidan 10 mm qirqim tashlanishi va yog'och teksturali eshiklar 90° ga aylanmasligi shart.
3. **CNC aniqligi:** Kesilgan G-code simulyatorda tekshirilganda, detal o'lchami chizmadagi o'lchamga millimetr-millimetr teng bo'lishi (freza radiusi hisobga olingan bo'lishi) shart.
4. **Smeta shaffofligi:** Smetada qancha varaq ketgani, qancha kvadrat metr qoldiq qolgani va har bir varaq narxi aniq ko'rinishi shart.
5. **Eksport butunligi:** Cutlist'da 15 ta detal bo'lsa, DXF, BPJ va Kroy kartasida ham aniq 15 ta detal chiqishi, 1 ta ham kam yoki ko'p bo'lmasligi shart.

---

*Hujjat Smart3D loyihasining ishlab chiqish jamoasi va loyiha egasi uchun rasmiy texnik qo'llanma hisoblanadi.*
