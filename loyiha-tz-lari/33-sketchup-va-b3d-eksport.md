# TZ-33 — SketchUp (.skp) va Bazis eksport

**Sana:** 2026-10-18 · **Navbat:** 33 · **Holat:** TAKLIF — egasining "boshla"si kutilmoqda
**Asos:**
- egasi #198: "sketchup va b3d eksportni tugat";
- egasi #200: "Free'da ham, Pro'da ham ishlashi kerak; Bazisga yana bir yo'l qo'shamizmi; eksportga xona emas — furnitura va plita kirsin".

Qoida S5 (SketchUp / .b3d eksport — PAUZA) egasi so'rovi bilan ochiladi. Qoidalar faylidagi S5 qatori "boshla"dan keyin yangilanadi.

## 0. Hozirgi holat (tekshirildi)

| Narsa | Holat |
|---|---|
| Bazis faylini **yuklash** (.b3d, .fr3d, .bpj) | Bor (TZ-21) |
| Bazis **BPJ eksport** | Bor (TZ-17). Bazis'ga `BazisUniversalImport.js` skripti bilan kiritiladi. Haqiqiy Bazis'da sinalmagan |
| OBJ eksport | Bor. SketchUp uni o'zi ochmaydi |
| **SketchUp eksport** | Yo'q |
| **.b3d eksport** | Yo'q |

**SketchUp import formatlari (rasmiy yordam sahifalari):**
- **SketchUp Free (brauzer)** bepul hisobda faqat **.skp**, .jpg, .png import qiladi. .dae, .stl va boshqalar faqat pullik obunada.
- **SketchUp Pro** — .skp, COLLADA (.dae) va boshqalar.
- Ikkalasida ham ishlaydigan yagona format — **.skp**.

**.skp yozish:**
- `openskp` (npm 1.3.0, MIT) — .skp faylni SketchUp va SDK'siz yozadi, Node va brauzerda ishlaydi.
  - Bog'liqliklari: earcut, fflate, flatbuffers.
  - O'rnatishda ishga tushadigan skript yo'q.
  - SketchUp 2013–2020 formatida yozadi; yangi SketchUp eski formatni ochadi.
  - Muallif "har xususiyat haqiqiy SketchUp SDK bilan tekshirilgan" deydi. Biz buni mustaqil tekshira olmaymiz — bu kompyuterda SketchUp yo'q.
- **Xavf:**
  - Kutubxona yangi (2026-06 da chiqqan) va bitta muallifniki. Versiya aniq 1.3.0 ga qotiriladi, kodi ko'rib chiqiladi.
  - Yakuniy tekshiruv — egasi faylni SketchUp Free va Pro'da bir marta ochib ko'radi.

**.b3d:**
- Bazis-Mebelshikning yopiq, hujjatlanmagan ikkilik formati.
- Bizdagi o'quvchi teskari muhandislik bilan yozilgan; .b3d yozuvchi hech qayerda yo'q.

## 1. Vazifalar

### A. SketchUp eksport (Frontend · SketchUp eksport, Opus, 2–3 soat)
- Eksport menyusida **"SketchUp (.skp)"** tugmasi. Tanlov: butun loyiha yoki tanlangan modul. Fayl brauzerda yasaladi (serverga yuklanmaydi).
- **Fayl tarkibi (xona kirmaydi):**
  - **Plita:** har modul — SketchUp **komponenti** (nomi: modul kodi va nomi). Uning ichida har detal alohida guruh, haqiqiy o'lchamda.
  - **Material va rang** loyihadagidek: dekor nomi va rangi; korpus, fasad, orqa devor alohida material.
  - **Furnitura:** petlya, ruchka, oyoqcha, polkaderjatel, yo'naltiruvchi va boshqalar soddalashtirilgan shaklda (quti yoki silindr), haqiqiy joyida. Har biri alohida komponent, nomi ERP nomi va kodi bilan.
  - **Qatlamlar (tag):** "Korpus", "Fasad", "Orqa devor", "Furnitura" — SketchUp'da yoqib/o'chirib ko'rish uchun.
  - Har detalga atribut: material, o'lcham, kromka.
- **Birlik va o'qlar:**
  - SketchUp ichki birligi dyuym, shuning uchun mm ÷ 25,4;
  - o'lcham SketchUp'da mm bilan aynan chiqishi tekshiriladi;
  - "yuqori" o'qi Z.
- **Zaxira:** "SketchUp Pro (.dae)" — COLLADA 1.4.1, xuddi shu tarkib. Agar .skp biror versiyada ochilmasa, Pro foydalanuvchisi uchun zaxira yo'l.
- **Fayllar:**
  - yangi `web/src/features/editor/eksport/skp.js` va `dae.js`;
  - eksport menyusi (mavjud OBJ tugmasi yonida);
  - i18n uz/ru/en;
  - `web/package.json` — `openskp` aniq 1.3.0.
- **Test** `tests/verify_skp.mjs`:
  - yozilgan .skp `openskp` o'quvchisi bilan qayta o'qiladi;
  - detal va furnitura soni, o'lchami (mm), material nomlari, komponent nomlari loyihadagi bilan teng;
  - .dae XML va COLLADA 1.4.1 tuzilmasi, three.js `ColladaLoader` bilan qayta o'qiladi;
  - web testi — tugma, fayl yuklab olinadi, telefon 390 px.

### B. Bazis eksport (Backend · Bazis eksport, Sonnet, 1–2 soat)
- **B1 (tavsiya):** mavjud BPJ eksport tugatiladi:
  - eksport menyusida "Bazis (.bpj)" aniq ko'rinadi, furnitura va plita bilan (xona — yo'q);
  - foydalanuvchi uchun 3 qadamli yo'riqnoma (3 tilda): Bazis → `BazisUniversalImport` skripti → .bpj → "Сохранить как .b3d".

  Natijada .b3d faylni Bazis'ning o'zi yozadi — eng ishonchli yo'l.
- **B2 — egasi #200 dagi "yana bir yo'l":** o'zimizning to'g'ridan-to'g'ri .b3d yozuvchimiz.
  - Hajmi: 2–3 kun, xavf YUQORI, natija kafolatsiz.
  - Format 30 ta haqiqiy sex .b3d faylidan o'rganiladi.
  - Bazis ochishini faqat usta tekshira oladi.
  - **Tavsiya:** B1 usta tomonidan Bazis'da sinalgandan keyin, alohida TZ bilan.

## 2. Tegilmaydigan joylar
- Boshqa chat fayllari: `scene.js`, `sahna.js`, `vr.js`, `auth*`.
- TZ-32 fayllari: `cutlist.js`, `materials.json`, `fragments.json`.
- Hisob va narx.

## 3. Xavf
- **A — O'RTA.** Yangi tashqi kutubxona (bitta muallif, yangi). Choralar:
  - versiya qotiriladi;
  - kodi ko'rib chiqiladi;
  - faqat brauzerda ishlaydi;
  - serverga va hisobga tegmaydi.
- **B1 — PAST.**
- **B2 — YUQORI** (yuqorida aytilgan).
- **Pul:** to'lov va narx hisobiga tegilmaydi.
- **Orqaga qaytarish:** alohida commit — `git revert`.

## 4. Egasidan
1. "boshla" — A (SketchUp .skp + .dae zaxira) va B1 (BPJ).
2. B2 (o'zimizning .b3d) hozir boshlanadimi, yoki B1 sinalgandan keyinmi? Tavsiya: keyin.
3. Tayyor bo'lgach: .skp faylni SketchUp Free va Pro'da, .bpj ni Bazis'da bir marta ochib ko'rish.
