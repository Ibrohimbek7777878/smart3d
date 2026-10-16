# TZ-23 — 3D ko'rinish Bazis-Cloud darajasida (erkin aylantirish) va backend funksiyalari interfeysda

**Sana:** 2026-10-16 · **Navbat:** 23 · **Holat:** TASDIQ KUTILMOQDA
**Asos:** egasi (2026-10-16, SORIZLAR #115). Ikki skrinshot bilan:
- **1-rasm — Bazis-Cloud Web-Viewer.** "Shodiyor aka ishxona kuxnya": panellar, eshiklar, ruchka, oyoq, stoleshnitsadagi o'yiq ko'rinadi, model erkin aylanadi.
- **2-rasm — Smart3D muharririda shu loyiha.** Talab: "erkin aylantirish qo'shilsin, bizda ustun jihatlar bo'lsin, backend'dagi funksiyalar to'liq ishlab, frontendda chiroyli interfeys orqali chiqsin".

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
6. **Ko'rinish rejimlari** (Bazis "ko'z" va "kub" tugmalari kabi): oddiy; fasadsiz (ichini ko'rish); shaffof korpus. **O'lchash** — ikki nuqta orasidagi masofa (Bazis'dagi chizg'ich).

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

## 3. Tegadigan fayllar
- **3D:**
  - `web/src/services/sahna.js` (kamera chegaralari);
  - `app/js/controls.js` (siljitish, barmoq ishoralari);
  - `app/js/scene.js` (ko'rinish yo'nalishlari, devorlarni yashirish, qirralar, rejimlar, o'lchash);
  - `web/src/features/editor/scene/*` (asboblar paneli).
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
- **Moliya:** narx va smeta hisobiga tegilmaydi. Buyurtma — faqat ma'lumot, to'lov yo'q. Narx 3 tilda va avvalgidek — testlar bilan tasdiqlanadi.
- **Orqaga qaytarish:** har bo'lim alohida commit; `git revert`. Kamera chegarasi bitta sozlamada — qaytarish oson.

## 5. Egasidan kerak (javob bo'lmasa — tavsiya olinadi)
1. **Aylantirish:** pol ostidan ham qaraladimi? *Tavsiya:* ha, Bazis'dagidek to'liq erkin; "Markazga" bilan qaytiladi.
2. **Buyurtma** kimga boradi? *Tavsiya:* admin "Buyurtmalar" sahifasiga. Bot ulangan bo'lsa — admin Telegram'iga xabar.
3. **SMS bilan kirish** qo'shilsinmi (Eskiz kaliti serverda)? *Tavsiya:* ha, email'ga qo'shimcha variant.
4. **Narxlarni o'zgartirish** (TZ-20) pauzadan chiqadimi? *Tavsiya:* hozircha yo'q (pauza siz tomondan) — faqat ko'rish.
5. **Yangi sahifalar ko'rinishi** (qoida 3.3): 3D uchun namuna — siz bergan Bazis-Cloud skrinshoti. Buyurtmalar va qoldiqlar sahifalari mavjud "Loyihalarim" va "Sozlamalar" uslubida bo'ladi, skrinshot bilan tasdiqlaysiz.
6. **"Boshla".**

## 6. Qabul
- 3D istalgan burchakdan aylanadi, siljiydi, yaqinlashadi (sichqoncha va barmoq); ko'rinish tugmalari ishlaydi; devor to'smaydi.
- Bazis loyihasi Bazis-Cloud'dagiga yaqin: qirralar, nom bo'yicha rang, kontur o'yiqlari, oyoq va ruchkalar. Bir xil buyurtma yonma-yon skrinshot bilan solishtiriladi.
- Buyurtma beriladi va admin ko'radi; qoldiq va furnitura sahifalari ishlaydi; 3 tilda; 390/1440 da toshish yo'q.
- Narx o'zgarmagan; barcha testlar yashil.

## 7. Muddat (taxmin)
- **A + B:** 2–3 ish kuni.
- **C:** 2 ish kuni.

Bu taxmin, aniq hisob emas.
