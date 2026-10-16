# TZ-23 — 3D ko'rinish Bazis-Cloud darajasida (erkin aylantirish, ko'rinish rejimlari), rang va material tanlash, backend funksiyalari interfeysda

**Sana:** 2026-10-16 · **Navbat:** 23 · **Holat:** JARAYONDA (egasi #119-8: "boshla")
- **Bajarildi** (`dizayn` tarmog'i):
  - A1–A4, A6 va D — 53e058d;
  - E — c248785;
  - A5 va B — 5c9a431.
- **Navbatda:** C2 (qoldiqlar), C3 (furnitura katalogi), C4 (SMS bilan kirish — kirish usuli savoliga bog'liq, #119-3).
- **Pauza:** C1 (buyurtma) — egasi: "ko'rib chiqamiz".
**Asos:** egasi (2026-10-16, SORIZLAR #115). Ikki skrinshot bilan:
- **1-rasm — Bazis-Cloud Web-Viewer.** "Shodiyor aka ishxona kuxnya": panellar, eshiklar, ruchka, oyoq, stoleshnitsadagi o'yiq ko'rinadi, model erkin aylanadi.
- **2-rasm — Smart3D muharririda shu loyiha.** Talab: "erkin aylantirish qo'shilsin, bizda ustun jihatlar bo'lsin, backend'dagi funksiyalar to'liq ishlab, frontendda chiroyli interfeys orqali chiqsin".

**Qo'shimcha** (egasi, 2026-10-16, SORIZLAR #116–117). Bazis-Cloud'dagi yana uch skrinshot:
- kamera rejimi — Orbit, Walk, Ortho;
- fon rangi;
- chizish rejimi — Shaded, Shaded with edges, Wireframe, Effects, X-Ray.

"Bular ham bo'lishi kerak … biznikda rang tanlash, material tanlash ham bo'lsin" → 2-bo'lim, D va E.

**Bog'liq:** TZ-21 (Bazis yuklash), TZ-09/19 (yangi frontend), qoida 6.2 (3D sichqoncha va barmoq bilan boshqariladi), TZ-20 (narxlar — PAUZA).

---

## 1. Hozirgi holat (tekshirilgan, dalil bilan)

### 1.1. Nega erkin aylanmaydi
Yangi muharrirda kamera dizayn mavzusida cheklangan (`web/src/services/sahna.js:54`):
- burchak: gorizontdan −3° … 63° (tepadan qarab ham, pastdan qarab ham bo'lmaydi);
- masofa: 2.2–12 m (detalga yaqin kelib bo'lmaydi);
- siljitish (pan) o'chiq.

Eski dvigatelda (`app/js/controls.js`) bu cheklovlar yo'q edi. Saytdagi 3D namuna ham erkin aylanadi.

### 1.2. Nega Bazis loyihasi Bazis-Cloud'dagidek ko'rinmaydi
Rasmdagi loyiha (135 panel) bizda har panel quti bo'lib chiziladi (`assembler.js`, Bazis bo'limi). Farqlar:

| Bazis-Cloud | Smart3D (hozir) |
|---|---|
| Material rangi (Кашемир, oq, yog'och) | Umumiy "korpus / fasad" rangi — Bazis materialiga qaralmaydi |
| Panel qirralari chizilgan | Qirra chizig'i yo'q — panellar bir-biriga qo'shilib "blok" ko'rinadi |
| Oyoq va ruchkalar bor | Furnitura chizilmaydi |
| Egri shakllar (stoleshnitsadagi moyka o'yig'i va boshqalar) | Faqat to'rtburchak quti |
| Xona yo'q, model ochiq | Xona devorlari modelni to'sadi |

Eslatma: Bazis fayli materialning haqiqiy rangini bermaydi — ERP ham rangni nomidan taxmin qiladi (`b3d_full_parser.material_color`). Biz ham nom bo'yicha olamiz va "taxminiy rang" deb belgilaymiz (qoida 4.3).

### 1.3. Backend'da bor, interfeysda yo'q funksiyalar

| Server API | Nima qiladi | Interfeysda |
|---|---|---|
| `POST/GET /api/orders` | sexga buyurtma (mijoz, telefon, izoh, loyiha, summa) va buyurtmalar ro'yxati | **yo'q** |
| `GET/POST /api/remnants`, `PUT …/use` | qoldiqlar ombori (ko'rish; admin — qo'shish, ishlatildi) | **yo'q** |
| `GET /api/furnitura` | furnitura katalogi | **yo'q** (faqat hisobda) |
| `POST /api/auth/sms/*` | telefon + SMS bilan kirish (Eskiz) | **yo'q** (kirish email bilan — TZ-09 Q2) |
| `GET /api/materials`, `PUT …/price` + WebSocket narx | materiallar va narxni o'zgartirish (admin) | **yo'q** — TZ-20, **PAUZA** |
| `POST /api/ai/voice` | serverda ovoz tanish | ulanmagan (501). Brauzer ovozi ishlaydi |

Bor va ishlaydi: loyihalar, sozlamalar, sex standartlari (admin), xatolar jurnali (admin), AI, Telegram, Bazis yuklash, barcha fayllar.

### 1.4. Rang va material tanlash — hozir
- Material tanlash bor, lekin faqat **korpus** va **fasad** uchun. Manba — ERP plitalari (1281 ta), qidiruv, narx (bo'lmasa "narx yo'q") — `web/src/features/editor/catalog/material.js`.
- Tanlangan material **3D rangiga ta'sir qilmaydi** — sahna umumiy "korpus / fasad" rangida.
- Orqa devor (HDF) va stoleshnitsa uchun tanlash yo'q.
- Har modulga alohida material berib bo'lmaydi (masalan pastki — yog'och, ustki — oq).
- Bazis loyihasida Bazis materialini almashtirib bo'lmaydi.
- Rang palitrasi yo'q. ERP'da plitaning rasmi yoki rang kodi ham yo'q — dekor rangi faqat nomida ("Белый", "Кашемир", "Дуб").

## 2. Bajariladigan ishlar

### A. 3D ko'rinish — Bazis-Cloud darajasida
1. **Erkin aylantirish** (qoida 6.2):
   - istalgan burchakdan, tepadan ham, Bazis'dagidek;
   - siljitish: o'ng tugma, Shift+sudrash yoki 2 barmoq;
   - masofa 0.3–40 m;
   - ikki marta bosish — shu modulga yaqinlashish.

   Telefonda: 1 barmoq — aylantirish, 2 barmoq — siljitish va kattalashtirish.
2. **Ko'rinish paneli** (Bazis-Cloud'dagi o'ng panel kabi): izometriya, old, yuqori, chap/o'ng yon; "Markazga" (bor); +/−; to'liq ekran.
3. **Devorlar:**
   - kamera tomondagi devor avtomatik yashiriladi;
   - "Devorlar" tugmasi — hammasini ko'rsatish yoki yashirish;
   - Bazis loyihasida standart holat — xonasiz, Bazis-Cloud kabi.
4. **Panel qirralari** — ingichka chiziq, Bazis'dagidek. Yoqib-o'chiriladi.
5. **Bazis loyihasi aniq geometriyada:**
   - panel o'z konturi bo'yicha (egri qirralar, moyka va plita o'yig'i);
   - rang — Bazis materiali nomidan ("taxminiy" belgisi bilan);
   - oyoq va ruchkalar — Bazis faylidagi joyida, soddalashtirilgan shaklda.

   Ma'lumot `bazis3d` ga ixcham qo'shiladi, server cheklovlari ichida (ro'yxat ≤ 2000).
6. **Fasadsiz rejim** (ichini ko'rish, Bazis "ko'z" tugmasi kabi) va **O'lchash** — ikki nuqta orasidagi masofa (Bazis'dagi chizg'ich). Chizish rejimlari (shaffof, sim karkas …) — D3 da.

### B. Ustun jihatlar (Bazis-Cloud'da yo'q, bizda bor)
Bazis loyihasida ham ishlaydi va ko'rinishda tugma bilan turadi: narx va smeta, kesim va raskroy, stanok fayllari, BPJ. Modul tanlanganda o'lchami va narxi chiqadi. AI va avtomatik konstruktor odatdagi loyihada ishlaydi.

"Eshiklarni ochish" Bazis loyihasida mavjud emas — faylda petlya tomoni yo'q. Uning o'rnida "fasadsiz" rejimi ishlaydi, ekranda izoh bilan.

### C. Backend funksiyalari interfeysda (dizayn uslubida — mavjud karta, varaq va tugmalar)
1. **Sexga buyurtma berish:**
   - Narx yoki Fayllar qadamida "Buyurtma berish": mijoz ismi, telefon (S1), izoh; loyiha va summa bilan yuboriladi;
   - "Loyihalarim" da "Buyurtmalarim" bo'limi;
   - admin uchun "Buyurtmalar" sahifasi: barchasi va holati (yangi → qabul qilindi → ishlab chiqarishda → tayyor);
   - serverda `orders.status` va admin ro'yxati qo'shiladi.

   Pul harakati yo'q — summa faqat ma'lumot (qoida 5.1).
2. **Qoldiqlar ombori:** Sozlamalar → "Qoldiqlar" — ro'yxat (material, o'lcham, maydon), qidirish. Admin: qo'shish, "ishlatildi" deb belgilash, raskroy natijasidagi ishga yaraydigan qoldiqlarni omborga yozish.
3. **Furnitura katalogi:** Mebel qadamida "Furnitura" varag'i — qidiruv, ERP narxi. Narx bo'lmasa — "narx yo'q" (qoida 4.3).
4. **SMS bilan kirish** — 3-savolga bog'liq. Kirish ekranida "Telefon orqali" varianti; Eskiz kaliti serverda bo'lsagina ko'rinadi.

### D. Ko'rinish sozlamalari — Bazis-Cloud "kub" menyusi kabi
Uchala bo'lim tanlovi eslab qolinadi (qurilmada).
1. **Kamera rejimi:**
   - **Aylanish (Orbit)** — A1 dagi erkin aylantirish;
   - **Yurish (Walk)** — xona ichida odam ko'zi balandligida yurish: kompyuterda strelka yoki WASD + sichqoncha, telefonda ekrandagi joystik;
   - **Orto** — ortografik proyeksiya: o'lchamlar perspektivasiz, chizmadagidek.
2. **Fon:** oq, och kulrang, kulrang, to'q, qora, "+" (o'z rangingiz), "Standart" (dizayn foni).
3. **Chizish rejimi:**
   - **Bo'yalgan;**
   - **Bo'yalgan + qirralar** — A4;
   - **Sim karkas** — faqat qirra chiziqlari;
   - **Effektlar** — yumshoq soya va yorug'lik. Kompyuterda; telefonda tezlik uchun soddalashtiriladi;
   - **Rentgen (X-Ray)** — panellar shaffof, qirralar ko'rinadi. Boshqa rejim bilan birga yoqiladi, Bazis'dagidek.
4. Menyu sahna asboblar panelidagi tugmadan ochiladi. Telefonda — pastdan chiqadigan varaq.

### E. Rang va material tanlash
1. **Material** — ERP katalogidan (1281 plita: LDSP, LMDF, MDF, akril, PET, HDF …), mavjud material varag'i kengaytiriladi (qoida 2.4):
   - **qismlar:** korpus, fasad (bor), orqa devor (HDF), stoleshnitsa — yangi;
   - **qidiruv** nom, kod, qalinlik va tur bo'yicha; narx ERP'dan, bo'lmasa — "narx yo'q" (qoida 4.3);
   - **har modul uchun alohida material:** modul tanlanganda "Material — faqat shu modul" (masalan pastki — yog'och, ustki — oq); qolgan modullar loyiha materialida qoladi;
   - **Bazis loyihasida** har Bazis materiali (masalan "ЛДСП Кашемир 16мм") ERP materialiga almashtiriladi.

   Material almashsa — kesim, raskroy, narx va 3D birga yangilanadi.
2. **Rang:**
   - tanlangan materialning dekori 3D'da ko'rinadi. Rang nomdan olinadi ("Белый" — oq, "Кашемир" — kulrang-bej, "Дуб/Орех/Венге" — yog'och teksturasi), "taxminiy rang" belgisi bilan;
   - **rang palitrasi:** oq, kulrang, bej, yog'och (och / o'rta / to'q), qora, rangli. Rangni bossangiz — shu rangdagi ERP plitalari chiqadi, keyin material tanlanadi;
   - rang **faqat material orqali** o'zgaradi (6-savol): ekranda ko'ringan rang ishlab chiqarishdagi material bilan bir xil bo'ladi.
3. **Narx.** Yangi narx yoki formula yo'q — ERP'dagi mavjud narx ishlatiladi. Har modul uchun alohida material — narx har modul materialidan. Bu test bilan tekshiriladi: loyiha narxi = modullar narxlari yig'indisi.

## 3. Tegadigan fayllar
- **3D:**
  - `web/src/services/sahna.js` (kamera chegaralari);
  - `app/js/controls.js` (siljitish, barmoq ishoralari);
  - `app/js/scene.js` (ko'rinish yo'nalishlari, devorlarni yashirish, qirralar, rejimlar, o'lchash);
  - `web/src/features/editor/scene/*` (asboblar paneli).
- **Ko'rinish sozlamalari (D):** `app/js/scene.js`, `app/js/materials3d.js` (chizish rejimlari, fon), yangi kamera rejimlari (yurish, orto) — `app/js/controls.js`; `web/src/features/editor/scene/*` (menyu).
- **Rang va material (E):**
  - `web/src/features/editor/catalog/material.js` (kengaytiriladi);
  - `app/js/materials3d.js` (dekor rangi);
  - `app/js/engine/cutlist.js` — har modul materiali; hisob formulasi o'zgarmaydi, faqat qaysi material ekanligi;
  - `web/src/store/project.js` va `services/hisob.js` — modul materiali hujjatda;
  - server hujjat tekshiruvi — yangi maydon (`himoya.js` ruxsat ro'yxati).
- **Bazis:** `app/js/engine/bazis/loyiha.js` (kontur, rang, furnitura `bazis3d` ga), `app/js/engine/assembler.js` (Bazis bo'limi — kontur bo'yicha chizish), `web/src/features/bazis/*`.
- **Server:**
  - `server/index.js` — `orders.status`, admin buyurtmalar ro'yxati, holatni o'zgartirish;
  - `server/himoya.js` — faqat kerak bo'lsa, loyiha cheklovlari ichida.
- **Yangi:** `web/src/features/orders/*`, `web/src/features/remnants/*`, furnitura varag'i; lug'atlar (uz/ru/en).
- **Testlar:**
  - brauzer — aylantirish, ko'rinishlar, Bazis loyihasi, buyurtma, qoldiq, 390/1440;
  - server — buyurtma holati, faqat admin;
  - node — Bazis kontur va rang.
- **Tegilmaydi:** narx hisobi, kesim va raskroy hisobi, stanok fayllari, TZ-20 (pauza).

## 4. Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.**
  - 3D'ga ko'p o'zgarish: telefonda tezlik, katta loyihada kontur hajmi. Kamaytirish: tezlik testi (`web_tezlik`), kontur nuqtalari cheklanadi.
  - Yangi admin sahifalari: faqat admin, server tekshiradi.
- **Moliya:**
  - A–D va C narx hisobiga tegmaydi. Buyurtma — faqat ma'lumot, to'lov yo'q.
  - E (material) narxga ta'sir qiladi, lekin yangi narx yoki formula yo'q — faqat ERP'dagi mavjud narx, tanlangan materialga qarab.
  - Tekshiruv: material o'zgarmagan loyihaning narxi avvalgidek, baytma-bayt. Har modul materiali — loyiha narxi = modullar yig'indisi, 3 tilda bir xil.
- **Orqaga qaytarish:** har bo'lim alohida commit; `git revert`. Kamera chegarasi bitta sozlamada — qaytarish oson.

## 5. Egasidan kerak (javob bo'lmasa — tavsiya olinadi)
1. **Aylantirish:** pol ostidan ham qaraladimi? *Tavsiya:* ha, Bazis'dagidek to'liq erkin; "Markazga" bilan qaytiladi.
2. **Buyurtma** kimga boradi? *Tavsiya:* admin "Buyurtmalar" sahifasiga. Bot ulangan bo'lsa — admin Telegram'iga xabar.
3. **SMS bilan kirish** qo'shilsinmi (Eskiz kaliti serverda)? *Tavsiya:* ha, email'ga qo'shimcha variant.
4. **Narxlarni o'zgartirish** (TZ-20) pauzadan chiqadimi? *Tavsiya:* hozircha yo'q (pauza siz tomondan) — faqat ko'rish.
5. **Yangi sahifalar ko'rinishi** (qoida 3.3): 3D uchun namuna — siz bergan Bazis-Cloud skrinshotlari. Buyurtmalar va qoldiqlar sahifalari mavjud "Loyihalarim" va "Sozlamalar" uslubida bo'ladi, skrinshot bilan tasdiqlaysiz.
6. **Rang faqat material orqali** o'zgarsinmi? Yoki "faqat ko'rinish uchun" erkin rang ham kerakmi (ishlab chiqarishga ta'sir qilmaydi)? *Tavsiya:* faqat material orqali — ekrandagi rang sexdagi plita bilan bir xil bo'lsin.
7. **Har modul uchun alohida material** kerakmi? *Tavsiya:* ha (pastki va ustki har xil — ko'p uchraydi).
8. **"Boshla".**

## 6. Qabul
- 3D istalgan burchakdan aylanadi, siljiydi, yaqinlashadi (sichqoncha va barmoq); ko'rinish tugmalari ishlaydi; devor to'smaydi.
- Bazis loyihasi Bazis-Cloud'dagiga yaqin: qirralar, nom bo'yicha rang, kontur o'yiqlari, oyoq va ruchkalar. Bir xil buyurtma yonma-yon skrinshot bilan solishtiriladi.
- Buyurtma beriladi va admin ko'radi; qoldiq va furnitura sahifalari ishlaydi; 3 tilda; 390/1440 da toshish yo'q.
- Ko'rinish menyusi Bazis-Cloud'dagidek ishlaydi: kamera (aylanish, yurish, orto), fon, chizish rejimlari (bo'yalgan, qirralar, sim karkas, effektlar, rentgen). Telefonda ham ishlaydi.
- Material korpus, fasad, orqa, stoleshnitsa, har modul va Bazis materiali uchun tanlanadi. 3D rangi materialdan; rang palitrasi ERP plitalarini ko'rsatadi.
- Narx o'zgarmagan (material o'zgarmasa — avvalgidek); barcha testlar yashil.

## 6a. Natija (2026-10-16)
- **A, D — 3D ko'rinish:**
  - erkin aylantirish, pol ostidan ham; 0,3–40 m;
  - siljitish, kursorga yaqinlashish;
  - yo'nalishlar, to'liq ekran, o'lchash;
  - kamera rejimlari — aylanish, yurish, orto;
  - fon; chizish rejimlari — bo'yalgan, qirralar, sim karkas, effektlar, rentgen;
  - devor-pol, fasadsiz. Tanlov eslab qolinadi.
- **E — material va rang:**
  - qismlar — korpus, polka, fasad, orqa, stoleshnitsa;
  - butun loyiha yoki bitta modul uchun; "bitta umumiy material";
  - rang palitrasi; ERP'dagi haqiqiy qalinliklar;
  - polka standarti 16 mm (#120: ERP'da LDSP 16 mm — 439 ta, 18 mm — 16 ta);
  - ERP plitasi alohida material: narxi ERP'dan, bo'lmasa "taxminiy"; 3D rang nomidan.
- **A5, B — Bazis loyihasi:**
  - egri va o'yiqli panellar o'z konturi bilan: 30 buyurtmada 162 ta;
  - har panel o'z materiali rangida;
  - oyoq va ruchkalar joyida: 214 + 246, hammasi panel yonida;
  - Bazis materialini almashtirish (shu qalinlikda);
  - "Eshiklarni ochish" o'rniga "Fasadsiz ko'rish".
- **Testlar:** node; server 64/64; brauzer — 18 to'plam yashil.

## 7. Muddat (taxmin)
- **A + B:** 2–3 ish kuni.
- **C:** 2 ish kuni.
- **D:** 2 ish kuni.
- **E:** 2–3 ish kuni.

Bu taxmin, aniq hisob emas.
