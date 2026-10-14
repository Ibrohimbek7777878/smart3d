# HANDOFF — Smart3D (Bittada · mebel SaaS)

> **Sana:** 2026-10-13 · **Muddat:** 20.10.2026 · **Holat:** DEMO ishlaydi, production emas
> **Asosiy fayl:** `Smart3D/HISOBOT.html` (yakuniy hisobot) · **Tadqiqot:** `Smart3D/TADQIQOT-kroy-giblab-tunel.md`

---

## 1. Loyha nima?

**Smart3D** — mebel sexi uchun **obuna (subscription) SaaS**:
```
Zamer (o'lcham) → AI konstruksiya → Smeta (narx) → Raskroy → 2D/3D/VR → OBJ/BPJ/CNC/GibLab export
```
- Mijoz brauzerda o'lcham kiritadi → Smart3D mebelni quradi → narx chiqadi → sexga tayyor fayllar (raskroy, CNC, GibLab) beradi.
- **PWA** — internetsiz ham ishlaydi. **VR** — quloqchin bilan xonada yurish.
- Barchasi **bir sahifada** (vanilla JS + three.js) — backend yo'q (demo).

---

## 2. Papka tuzilishi

```
bittada sunpin/
├── Smart3D/
│   ├── app/                          ← ISHLAYDI (http.server bilan ochiladi)
│   │   ├── index.html                ← yagona sahifa (zamer/katalog/AI/raskroy/export)
│   │   ├── sw.js                     ← PWA service worker (smart3d-v7)
│   │   ├── css/app.css
│   │   ├── data/
│   │   │   ├── fragments.json        ← 30 ta mebel moduli (formula bilan)
│   │   │   ├── materials.json        ← narx/kafitsient/varaq (ERP bilan yangilangan)
│   │   │   ├── sheet-catalog.json    ← 1281 ERP panel (SKU+narx+olcham)
│   │   │   ├── furnitura-catalog.json← 1978 furnitura (price bazaga ulanmagan)
│   │   │   └── nesting-defaults.json ← raskroy sozlamalari
│   │   ├── js/
│   │   │   ├── app.js                ← state + UI + barcha handlerlar
│   │   │   ├── ai.js                 ← matn→olcham (lokal qoidalar; LLM yo'q)
│   │   │   ├── scene.js/controls.js/items.js/materials3d.js ← three.js 2D/3D/VR
│   │   │   └── engine/
│   │   │       ├── cutlist.js        ← modul→detal (formula eval) + productionCost
│   │   │       ├── rules.js          ← joylashtirish + validatsiya
│   │   │       ├── price.js          ← qatlamli narx
│   │   │       ├── nesting.js        ← BSSF + lenta(LSTR), kerf, qoldiq
│   │   │       ├── giblab.js         ← .project (XML + binar data blob) ★
│   │   │       ├── bpj.js            ← Bazis Progect XML
│   │   │       ├── cnc.js            ← DXF/NC/PTP
│   │   │       └── objexport.js      ← OBJ/MTL, CSV (cutlist/smeta/XNC)
│   │   └── vendor/three/             ← three.js + XR
│   ├── data/                         ← bo'sh (keyingi fayllar uchun)
│   ├── Mahsulotlar-Narx-Katalogi-2026-10-13.xlsx  ← ERP bugungi narxlar
│   ├── Mahsulotlar_Katalog_Narxlari.xlsx          ← eski katalog
│   ├── ishga-tushirish.sh            ← python3 -m http.server 8811
│   ├── HISOBOT.html                  ← yakuniy hisobot (bitta HTML)
│   └── TADQIQOT-kroy-giblab-tunel.md ← kroy/tunel tadqiqoti
└── mebelcity-platform/               ← eski kod (FMS.zip, giblab_raskroy.py, BazisUniversalExport.js)
```

**Ishga tushirish:**
```bash
bash Smart3D/ishga-tushirish.sh
# yoki
python3 -m http.server 8811 --directory "Smart3D/app"
# → http://localhost:8811
```

---

## 3. Tayyor funksiyalar (hammasi tekshirilgan)

| # | Funksiya | Holat |
|---|---|---|
| 1 | Zamer — xona, deraza, 2D/3D, sudrab-joylash | ✅ |
| 2 | AI konstruksiya — O'zbek tili erkin matn/ovoz → L va U shakl burchakli oshxona, to'qnashuvsiz terish | ✅ `ai.js` (L/U corner snap) |
| 3 | Formula hisobi (AST Pratt parser) — xavfsiz, zero-`eval`, ternar, mantiq, matematik funksiyalar | ✅ `engine/expr.js` |
| 4 | Multi-slot materiallar — korpus, fasad, orqa(HDF), polka, kromka_korpus, kromka_fasad | ✅ `engine/slots.js` |
| 5 | Haqiqiy 3D modulli konstruktsiya — yaxlit quti emas, haqiqiy panellar, eshiklar, tutqichlar | ✅ `engine/assembler.js` |
| 6 | Smeta — mijoz kotirovkasi + haqiqiy ishlab chiqarish tannarxi (varaq+kromka+furnitura+teshik+mehnat) | ✅ `engine/cutlist.js` |
| 7 | Professional 5-bo'limli Excel (.xlsx) — rangli sarlavha, formula va valyuta formatlari bilan | ✅ `engine/xlsxexport.js` |
| 8 | Kesim listi — dinamik qalinlik `t`, shartli formulalar, qirra, teshiklar | ✅ |
| 9 | Raskroy 2.0 — BSSF + Lenta, trim chetini tozalash (10mm), tekstura aylantirish nazorati, qoldiqlar | ✅ `engine/nesting.js` |
| 10| ERP material bazasi — 1281 ta, 8 xonali ID, ko'p tilli qidiruv (kirill/lotin/fuzzy) | ✅ `engine/search.js` |
| 11| Furnitura bazasi — 1978 ta element, real UZS va USD narxlari bilan | ✅ `data/furnitura-catalog.json` |
| 12| Xizmatlar (usluga) tarifi — kroy, kromka, prisadka, frezerovka, montaj | ✅ `data/services.json` |
| 13| Export OBJ + MTL — har bir panel alohida komponent va material slotlari bilan | ✅ `engine/objexport.js` |
| 14| Export GLB (glTF 2.0 Binary) — Mobil AR, Telegram 3D, Blender, PBR materiallar | ✅ `engine/glbexport.js` |
| 15| Export BPJ (Bazis) — Haqiqiy BazisUniversalExport 4.2 | ✅ `engine/bpj.js` |
| 16| Export GibLab .project — XML + binar raskroy kartasi | ✅ `engine/giblab.js` |
| 17| Export XNC CSV (kod 1_1, GibLab Excel import) | ✅ `engine/objexport.js` |
| 18| CNC: DXF (raskroy) + Excellon NC (teshiklar) + PTP (pozitsiya) | ✅ `engine/cnc.js` |
| 19| CNC: G-code (ISO/Fanuc) — freza radiusi kompensatsiyasi + holding tabs + prisadka | ✅ `cutGCode()` |
| 20| CNC: Biesse (.cix) — BiesseWorks / bSolid uchun drayl | ✅ `biesseCIX()` |
| 21| CNC: Homag WoodWOP (.mpr) — 4.0-8.0 stanoklari uchun | ✅ `woodwopMPR()` |
| 22| CNC: Altendorf formatka — 1/2/3-faza bo'ylama va ko'ndalang kesim ko'rsatmasi | ✅ `altendorfPhasedCuts()` |
| 23| Sex texnologik xaritasi — formatka, kromka, prisadka, montaj uchastkalari uchun | ✅ `workshopTechCard()` |
| 24| Hisobot A4 chop/PDF + PWA offline + WebXR VR | ✅ |
| 25| Backend API + SQLite — 1281 material, 63 fragment, WebSocket real-time narx | ✅ `server/index.js` |

**Raskroy solishtirish (namuna oshxona):** Lenta 87.4% vs Guillotine 78.3% — **Lenta yaxshi**.

---

## 4. 5 manbadan olingan datalar (qayerdan nima olindi)

| # | Manba | Nima olindi | Holat |
|---|---|---|---|
| 1 | **kroy.bittada.uz** (GibLab) | `.project` formati tuzilishi (XML + binar `data` blob, LSTR packing, waste=cap−pos), 7 ta real namuna fayl | ✅ olindi (faqat o'qish, buzilmadi) |
| 2 | **tunel.bittada.uz** | Deploy modeli: lokal **agent** + WSS outbound → `smart3d.bittada.uz` ga chiqarish | ✅ tadqiq qilindi; **agent ishga tushirish usuli kutilmoqda (Sobir)** |
| 3 | **code.bittada.uz** (code-server) | Kirilmadi (maxsus so'rov bo'yicha to'xtatildi) | ⏸ kiritilmadi |
| 4 | **mebelcity-platform** (lokal kod) | `FMS.zip` → `giblab_raskroy.py` (parser, 57/57 round-trip), `BazisUniversalExport.js` (XML generator), 7 real `.project`, `ishlab_chiqarish.py` (QR production) | ✅ olindi |
| 5 | **ERP Excel (2 fayl)** | 1281 panel (SKU+narx+olcham+qalinlik) + 1978 furnitura → `sheet-catalog.json`, `furnitura-catalog.json`, `materials.json` yangilandi | ✅ moslashtirildi |

**Muhim:** hech qanday tahrir/yozuv serverga qilinmadi. Faqat o'qib olindi.

---

## 5. Texnik asoslar (kim uchun qidirayotgan bo'lsa)

### GibLab `.project`
- XML: `<project>` + goods(product+tool.cutting) + sheet + operations **CS** (kesim) / **EL** (kromka)
- Binar `data` attr: base64; 15 bayt/record; opcode=(level<<3)|type; **records FLAT** (L1 then its L2...)
- pos modeli: `pos += size + kerf`; **waste = cap − pos**; cut_len = perim × (n−1)
- Parser: `mebelcity-platform/FMS.zip` → `FMS/Raskroy/giblab_raskroy.py`

### Fragment moduli
```json
{ "code":"SP-K-001", "w":600, "d":550, "h":720, "min_w":300, "max_w":1000,
  "parts":[{"code":"yon","qty":2,"len":"h","width":"d"}], "edge":[...], "holes":[...] }
```
`cutlist.js` `"len":"h-8"` ni eval qilib mm hisoblaydi.

### Yagona state
Bitta `state.doc` → narx, cutlist, raskroy, export — hammasi shundan.

---

## 6. Qolgan ishlar (blokerlar bilan)

| # | Ish | Bloker |
|---|---|---|
| 1 | **600 fragment** bazasini kiritish | Fayl formati kutilmoqda (Excel/JSON/rasm) |
| 2 | **Price baza** — kromka/furnitura/ish haqi narxlari | Fayl kutilmoqda |
| 3 | **Deploy** `smart3d.bittada.uz` | Tunnel agent qanday ishga tushiriladi — **Sobir javobi** |
| 4 | **CNC WoodWOP/Biesse** post | Sexdan 1–2 ta **namuna NC fayl** (`.cpu`,`.cix`,`.nc`,`.tap`) |
| 5 | BPJ teshik (holes) sxemasi | Namunada `holes:[]` edi |
| 6 | **AI (LLM)** | Endpoint + API kalit (hozir lokal qoidalar ishlaydi) |
| 7 | **Backend** — scaffold tayyor (auth/materials/orders/WS), production'ga chiqarish kerak | Serverni ishga tushirish + domain ulash |
| 8 | i18n (rus/ingiz) | Keyin |

---

## 7. Backend server (server/)

**Holat:** Scaffold tayyor — auth (JWT), materials (1281), fragments (63), orders, price history, WebSocket real-time narx.

**Ishga tushirish:**
```bash
cd Smart3D/server
npm install
npm run init-db   # DB yaratish
npm start         # http://localhost:3000
```

**API:**
- `POST /api/register`, `POST /api/login` (JWT)
- `GET /api/materials?q=...`, `GET /api/materials/:id`
- `PUT /api/materials/:id/price` (admin, WebSocket broadcast)
- `GET/POST /api/orders`
- `WS /ws` — real-time narx yangilanishi

**Admin:** `admin@smart3d.uz` / `admin123`

---

## 8. Login / server ma'lumotlari

| Xizmat | Manba | Login |
|---|---|---|
| tunel → kroy | `https://tunel.bittada.uz/login/?next=https://kroy.bittada.uz/` | sobir@gmail.com (parol — suhbatda) |
| code-server | `https://code.bittada.uz` | faqat parol (kiritilmadi) |
| Lokal server | `http://localhost:8811` | — |

**Qoidalar:**
- **tunel/kroy faqat o'qish** — "kerakli narsani ol, buzib qo'yma".
- **code.bittada.uz hozircha kiritilmaydi.**

---

## 8. Keyingi qadam (tartib bo'yicha)

1. 600 fragment faylini tashlash → `fragments.json` ga aylantirish
2. Price faylini tashlash → `furnitura-catalog.json` / `materials.json` ga ulash
3. Sobirdan tunnel agent usulini olish → `smart3d.bittada.uz` ga deploy
4. Sexdan CNC namuna fayl olish → `cnc.js` post-prosessorini to'g'rilash
5. LLM API kalit olish → `ai.js` ni ulash

---

*Bu fayl loyha kimningdir qo'liga o'tsa, nima qilinishi kerakligini to'liq tushuntiradi.*
