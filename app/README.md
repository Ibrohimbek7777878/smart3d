# Smart3D — mebel konstruksiya, narx va export (MVP)

**Mahsulot:** mijoz uyida zamer → AI konstruksiya → real-time smeta → raskroy →
2D/3D/VR ko'rinish → **OBJ + BPJ export** (Bazis Mebelshiksiz ishlash uchun).
Alohida SaaS produkt (oylik obuna modeli), telefonda/planshetda/noutbukda ishlaydi (PWA).

## Ishga tushirish

```bash
cd Smart3D/app
python3 -m http.server 8811
# → http://localhost:8811/
```

Server kerak emas (faqat statik fayllar). Internetda GitHub Pages / any host'ga
qo'ysa ham ishlaydi. Ovozli kiritish uchun **Chrome/Edge** (Web Speech API).

## Nima ishlaydi (testlangan — 2026-10-12)

| Vazifa | Holat |
|---|---|
| Zamer: forma (W/D/H) + teshiklar (deraza/eshik) | ✅ |
| AI: matn → o'lcham + buyurtma → konstruksiya (rule-engine) | ✅ (`js/ai.js`) |
| AI: ovozli kiritish (Web Speech API, uz → ru zaxira) | ✅ |
| Katalog: **63 fragment** (min/max chegaralar bilan, standart modullar) | ✅ `data/fragments.json` |
| Material tanlash → **narx real-time o'zgaradi** | ✅ (MDF16 1 940 000 → LDSP18 1 668 400) |
| Smeta (kotirovka): satrlar, subtotal, chegirma | ✅ `price-engine.js` |
| Validatsiya: xato/ogohlantirish kodlari (E_/W_) | ✅ `rules.js` (Sunpin bilan bir xil) |
| Detallar (cutlist): formula ifodalar, kromka, furnitura | ✅ `cutlist.js` |
| **Raskroy**: guillotine (BSSF) + **lenta (LSTR/GibLab)** rejimi, kerf, varaq soni, ostatka % | ✅ `nesting.js` |
| **Raskroy parametrlari**: ⚙️ modal — rejim, kerf, aylantirish, trim, delovoy qoldiq min | ✅ `data/nesting-defaults.json` + localStorage |
| **Delovoy qoldiq hisobi** — ishlatiladigan qoldiq soni va m² | ✅ strip aniq, BSSF taxminiy |
| 2D reja + 3D dollhouse (devorlar yarim shaffof) | ✅ |
| Tanlash, sudrab ko'chirish (snap 50 mm), nusxa, 90° | ✅ |
| O'lcham tahriri (min/max siqish) | ✅ |
| Export: **OBJ** (`o` guruhlar, mm, bake transform) + **MTL** | ✅ node testida tekshirilgan |
| Export: holes.json, cutlist.csv, smeta.csv, loyiha.json | ✅ |
| Export: **haqiqiy `.bpj`** (BazisUniversalExport 4.2 — bom/objects/butts/materials/transform + giblab XML + CSV) | ✅ real `1.bpj` + `bpj_parser.py` bilan round-test |
| **ERP material bazasi** — 1281 real panel (SKU + narx), qidiruv (kirill/lotin), varaq o'lchami smeta+raskroyga ta'sir qiladi | ✅ `data/sheet-catalog.json` + `#sheetSel` |
| **Furnitura katalogi** — 1978 ta ruchka/petli/slayder (ERP dan) | ✅ `data/furnitura-catalog.json` (price bazaga keyin ulanadi) |
| Material narxlari — ERP dagi haqiqiy varaq narxlari (2026-10-13) bilan yangilangan | ✅ `data/materials.json` (src: narx-2026-10-13) |
| Export: **GibLab `.project`** — XML + binar raskroy kartasi (data attr, LSTR) | ✅ `engine/giblab.js` — `giblab_raskroy.py` parseri bilan round-trip (base64 bayt-ma-bayt) + 55 detal/11 karta 0 xato |
| Export: **XNC CSV** — kod `1_1` (detal№_nusxa№) — GibLab "Импорт из Excel" uchun | ✅ `objexport.js xncCSV` |
| Export: **Hisobot (A4 chop etish)** — kotirovka + ishlab chiqarish + raskroy, PDF mumkin | ✅ `printReport()` |
| Saqlash/Yuklash (localStorage), PWA manifest | ✅ |
| **PWA offline** — service worker, birinchi tashrifdan keyin internetsiz | ✅ `sw.js` (stale-while-revalidate) |
| **VR (WebXR)** — 3D rejimda "ENTER VR" (Quest/telefon braslda) | ✅ `VRButton`, `renderer.xr` |
| **CNC: DXF (raskroy)** — varaq + detallar + teshiklar, ezdxf bilan valid | ✅ `engine/cnc.js` |
| **CNC: NC (Excellon)** — vazifalar diametrga qarab, varaq ajratgich | ✅ |
| **CNC: PTP (pozitsiya)** — panel joylashuvi CSV | ✅ |
| **CNC: G-code (ISO/Fanuc)** — kontur kesim (G21/G90/G1, asbob, spindle) | ✅ `cutGCode()` |
| **Avtomatik furnitura** — eshiklar soniga qarab petli/ruchka qo'shiladi | ✅ `cutlist.js` 4b |
| **Export integrity** — exportdan oldin validatsiya (data buzilmasligi) | ✅ `integrityCheck()` |
| **Save/Load v2** — versiya + tuzilma tekshiruvi, ERP mahsulotni saqlaydi | ✅ `LS_KEY v2` |
| **Material ID tizimi** — 8 xonali ID (masalan: `10000121`), kategoriya kodlari (LDS/LMD/MDF/HDF/AKR/OYN) | ✅ `data/materials-index.json` |
| **Multi-til qidiruv** — kirill/lotin/eski kirill + fuzzy (xato yozilgan ham topadi) | ✅ `engine/search.js` |
| **Backend** — auth (JWT), materials, fragments, orders, price history, WebSocket real-time narx | ✅ `server/index.js` |

## Backend (server/)

```bash
cd Smart3D/server
npm install
npm run init-db        # DB yaratish + 1281 material + 63 fragment import
npm start              # http://localhost:3000
```

**API endpointlar:**
- `POST /api/register` — ro'yxatdan o'tish
- `POST /api/login` — kirish (JWT token)
- `GET /api/materials?q=Egger` — material qidiruv
- `GET /api/materials/:id` — material ID bo'yicha
- `PUT /api/materials/:id/price` — narx yangilash (admin)
- `GET /api/fragments` — fragmentlar
- `POST /api/orders` — buyurtma yaratish
- `GET /api/orders` — buyurtmalar
- `WS /ws` — real-time narx yangilanishi

**Admin:** `admin@smart3d.uz` / `admin123`

### OBJ qoidalari (K20 GLB→OBJ sinovidan keyin):
1. har bir mebel alohida `o SP-K-001_p1` — Bazis/SketchUp'da **component**
2. transformlar **bake** — noktalar world-koordinatada (joylashuv yo'qolmaydi)
3. **mm** (headerda yozilgan), Z-up (x=en, y=chuqurlik, z=balandlik)
4. teshiklar geometriya emas → **holes.json** yon fayl (soni, Ø, chuqurlik, XYZ)

## Kod manbalari (qayta ishlatilgan)

| Fayl | Manba |
|---|---|
| `js/engine/price.js` | mebelcity `price-engine.js` (1:1, testlangan) |
| `js/engine/rules.js` | mebelcity `sp-validate.js` (E_/W_ kodlari) |
| `js/scene.js` | mebelcity `sp-scene.js` (+3D shaffof devor) |
| `js/controls.js` | mebelcity `sp-controls.js` (OrbitControls, N/F) |
| `js/materials3d.js` | mebelcity `sp-materials.js` (kategoriya ranglari) |
| `js/engine/nesting.js` | mebelcity `sunpin_nesting.py` → **sof JS port** |
| `data/fragments.json` | mebelcity 30 fragment (parts/edge/holes/hardware) |
| `data/materials.json` | SUNPIN-DATALAR narx oraliklari + SHEET_PRICE |
| formats/BOM idea | 三维家 (MPR/MCS/NC/PTP), 酷家乐 (BOM拆单 + real-time kotirovka) |

## Tuzilmа

```
app/
├── index.html            # SPA (mobile-first)
├── manifest.json         # PWA (telefonda ilova kabi)
├── css/app.css           # dizayn tizimi
├── data/
│   ├── fragments.json    # 30 fragment (detallar/teshik/furnitura bilan)
│   └── materials.json    # material/lik/kromka/furnitura narxlari
├── js/
│   ├── app.js            # state + UI + hisoblash trubkasi
│   ├── scene.js          # 2D/3D sahna (Three.js)
│   ├── controls.js       # kamera boshqaruvi
│   ├── items.js          # joylashtirilgan mebellar + tanlash + drag
│   ├── ai.js             # matn/ovoz parser + rule-engine konstruksiya
│   └── engine/
│       ├── price.js      # narx (SpPrice.calc)
│       ├── rules.js      # validatsiya
│       ├── cutlist.js    # detallar + xarajat
│       ├── nesting.js    # raskroy (guillotine)
│       ├── objexport.js  # OBJ/MTL/CSV/holes
│       ├── bpj.js        # haqiqiy .bpj yozuvchi (BazisUniversalExport 4.2)
│       ├── giblab.js     # GibLab .project yozuvchi (XML + binar raskroy)
│       └── cnc.js        # CNC: DXF + Excellon NC + PTP
└── vendor/three/         # Three.js (lokal, internetsiz ishlaydi)
```

## Keyingi bosqichlar (MVP dan keyin)

1. ~~BPJ konverter~~ ✅ **tayyor** — `engine/bpj.js` real `1.bpj` (Bazis 4.2) formatida yozadi;
   `bpj_parser.py` (BazisViewer) bilan round-test o'tgan. Teshiklar (bores) BPJ'ga
   keyingi bosqichda `objects.holes` ga to'ldiriladi (hozir holes.json yon fayl).
2. **LLM ulash** (`aiBuild(text, {llm})` tayyor — chaqirish nuqtasi bor; kerakli: API endpoint + kalit)
3. ~~VR render~~ ✅ **tayyor** — 3D rejimda WebXR "ENTER VR" (headless'da yashirin,
   Quest/telefon braslda paydo bo'ladi)
4. ~~CNC export~~ ✅ **tayyor** — `engine/cnc.js`: DXF (ezdxf valid), Excellon NC, PTP CSV
5. ~~GibLab `.project`~~ ✅ **tayyor** — `engine/giblab.js`: LSTR raskroy kartasi + XML
   (CS/EL operatsiyalar, waste, trims); <ichki-host-kroy>'ga import uchun tayyor fayl.
   Format manbasi: mebelcity `giblab_raskroy.py` (reverse-engineered) + haqiqiy sex fayllari.
6. Lazer qurilma protokoli (USB/serial bridge)
7. Native app (PWA → Capacitor)
8. Multi-tenant + obuna (oylik to'lov)
