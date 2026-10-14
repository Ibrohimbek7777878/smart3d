# TZ — Smart3D: qolgan barcha ishlar (yagona ro'yxat)

**Sana:** 2026-10-14 · **Holat:** 1–4 bosqichlar bajarilgan (`TZ-SAYT-BARQARORLIK-RESPONSIVE.md` §9)
**Kim uchun:** loyiha egasi va Smart3D ustida ishlaydigan dasturchi yoki agent (Claude, OpenCode)
**Manbalar:** `AUDIT-2026-10-14.md` (kod tekshiruvi), `TZ-Smart3D-Claude-2026-10-13.md` (asosiy TZ), egasining talablari (`SORIZLAR.md`)

> Bu fayl qolgan ishlarning **yagona** ro'yxati. `KAMCHILIKLAR-VA-TUZATISH-TZ.md` dagi "30/30 tuzatildi" degan da'vo
> tekshiruvda tasdiqlanmadi — haqiqiy holat shu yerda.

---

## 0. Umumiy holat

| Yo'nalish | Tayyor | Asosiy to'siq |
|---|---|---|
| Sayt (zamer, 2D/3D, responsive) | ~70% | xona faqat to'rtburchak; oshxona elementlari yo'q |
| Smeta va tannarx | ~50% | narx ma'lumotlari to'liq emas; egasining qarori |
| Kroy | ~50% | GibLab bilan solishtirilmagan; lenta rejimi buzuq |
| Modullar kutubxonasi | ~10% | 79/600; birortasi ham to'liq formatda emas |
| Stanok fayllari | ~5% | namuna fayllar yo'q; jiddiy xatolar |
| AI va ovoz | ~15% | parser zaif; LLM ulanmagan |
| Backend, deploy | ~30% | frontend serverga ulanmagan; deploy yo'q |
| **Jami** | **~35%** | eng katta to'siq — kod emas, **ma'lumot** (§2) |

---

### 0.1 Bajarilgan (2026-10-14)

§4 1-band "Darhol" barcha 12 ta band bajarildi va tekshirildi (`node /tmp/opencode/verify.mjs` [1]–[6], `node /tmp/opencode/verify_ai.mjs` 34/34, `bash tests/ui/run.sh` 5/5, brauzer QA `/tmp/opencode/qa_ai.mjs` — F6 leak 0, U/L overlap 0, ⚠️ rejimi, A3 W_OVERLAP 0):

- **C1, C6, C7** — `cnc.js` (Y-mirrored teshiklar, DXF sheet offsets, Altendorf plan hisob);
- **K1, K2, K3, K4** — lenta/GibLab/BPJ (`bpj.js` qayta yozildi: pozitsiyalar noyob, holes 80/80, 3 material) va finish/kesim o'lchamlari; `materials.json` ga `[2800,2070]` qo'shildi;
- **A1** — parser: "yarim", kirill, U/L tartibi, birlikli o'lchamlar, balandlik → `unknown`, "✅" soxta emas (`assumed` → ⚠️ 3600×2800);
- **A2** — `footprint()` anchor semantikasi + Z-interval ustma-ustlik; U/L AI placement ankorlari tuzatildi;
- **A3** — validator Z-interval bilan balandlikni hisoblaydi (soxta W_OVERLAP yo'q);
- **F5** — barcha `innerHTML` joylari esc/Number qilindi (sweep + catFilter/material/cutlist/smeta);
- **F6** — `scene.js` shared materiallar + `clearGroup()` (geometry doim dispose; 8× xona o'zgarishida geometriya o'sishi 0).

### 0.2 F1 yadro + qoldiq qismi bajarildi (2026-10-14/15) — poligon xona

§4 4-banddan "F1" ning yadrosi (qolganlari §3.6 F1 qatorida):

- **Model**: `room.outline` n-punktli poligon — hamma yozuvchidan (applyRoom) endi jadvaldan o'qiydi; `roomBBox()` yordamchi (`rules.js`);
- **Validatsiya**: `pointInPoly` + `fpInRoom` (4 burchak + 4 chek + markaz) — L qirqim (notch) hududagi mebel to'g'ri ushlanadi (A3/W_OUT);
- **UI**: "To'rtburchak / L shakl" shakl tugmalari + nuqtalar jadvali (qo'shish/o'chirish); W/D = rect generator (programmatik kiritilsa ham ishlaydi);
- **Teshiklar**: devor select dinamik (edge soni), haqiqiy edge uzunligi bilan; AI teshiklariga `wall/offset/sill/height` avto-to'ldirish (eski E_OPENING_OUT_OF_WALL xatosi yo'q qildi);
- **Sahna**: pol = `ShapeGeometry(outline)` (L qirqim bo'sh); devorlar per-edge (oldin ham);
- **OBJ export**: pol ear-clipping bilan triangulyatsiya (`engine/geom.js`);
- **GLB export**: pol `computePolygonFloor` bilan (ikki qatlam z=0/-40, non-indexed, bin offsetlar kumulyativ) — bbox quti emas; mebelli koddan keyin ham accessors to'g'ri (`verify_glb.mjs`);
- **Quvur / rozetka**: `room.utilities[]` ({type, wall, offset, z}) — sahnada 3D silindr/plastina + 2D belgi (`scene.js`), UI blok + chiplar (`app.js`), validatsiya `E_UTIL_OUT_OF_WALL` (`rules.js`); yangi loyiha endi DEFAULT_ROOM massivlarini nusxalaydi (`freshRoom()` — eski payvast bug);
- **AI**: matndan o'lchamsiz qurilganda ⚠️ rejimi (A1) — AI hozircha baribir to'rtburchak kontur beradi;
- **Tekshiruv**: `verify_f1.mjs` 37/37, `verify_glb.mjs` 24/24, `verify.mjs` [1]–[6] ✓, `verify_ai.mjs` 34/34 ✓, `tests/ui/run.sh` 5/5 ✓, brauzer `qa_f1.mjs` + `qa_f1_shot.mjs` (2D/3D L) + `qa_util.mjs` (quvur/rozetka) + `qa_ai.mjs` ✓;

**F1 qoldiq (keyingi qadam):** AI `suggestLayout` edge'lar bo'yicha joylashtirish (hozir W/D); 90° dan boshqa burchakli xonada devor edge lokal o'qi bo'yicha qo'lda joylashtirish yordami; quvur/rozetka GLB/OBJ exportda ko'rinmaydi (oxirgi qoldiq).

### 0.3 F2 bajarildi (2026-10-15) — oshxona elementlari

§4 4-banddan "F2" ning katta qismi (qolganlari §3.6 F2 qatorida):

- **Model**: `doc.kitchen` = {stoleshnitsa, sokol, dobor(+h), karniz(+h), moyka{on,offset,fromBack,size}} — zamer panelidagi "Oshxona elementlari (F2)" bloki (`index.html`), `syncKitchen/kitchenApply` (`app.js`);
- **Yaxlit stoleshnitsa**: `engine/kitchen.js` — `detectRuns` (kuxnya-pastki/ustki modullarini devor bo'ylab run'larga birlashtiradi; gap ≤30mm, klaster 20mm), `splitSegments` (varaq 2800 dan uzun run → 2+ segment), `deriveKitchen` → **synthetic placements** (`auto:true`, persist EMAS): SP-ST-001 stoleshnitsa (z=max h), SP-ST-002 sokol (no3d — 3D kickplate assembler'da), SP-ST-003 dobor (devor tomoni = xona markazidan uroq), SP-ST-004 karniz (ustki tepasida);
- **Bir joyda**: `viewPlacements()` (app.js) — user placements + derived; 3D (`items.setPlacements`), cutlist/raskroy/tannarxi/kotirovka (`doRecalc`), export (OBJ/GLB/BPJ/holes) — hammasi shu ro'yxatdan; raycast auto meshlarni chetlab o'tadi (pastki mebel stoleshnitsa ostida ham bosiladi);
- **Sokol smetada**: synthetic SP-ST-002 cutlist satr + tannarx (audit topilmasi: "sokol faqat 3D'da, smetada yo'q" — endi smetada);
- **Moyka kesimi**: `kind:'cutout'` hole (x/y/w/d, dia=0) stoleshnitsa detaliga; `materials.json` hole_kinds `cutout` 25 000 so'm (tannarxda `holeCost`); CNC/BPJ circle (dia=0) chiqarildi — ichki kontur hali kesilmaydi (qoldiq);
- **Fragmentlar**: SP-ST-001..004 (`fragments.json`, slot `stoleshnitsa/dobor/karniz` → LDSP18 `slots.js`); Katalogdan qo'lda ham qo'ysa bo'ladi;
- **AI**: `aiBuild` dan keyin `room.utilities` + `doc.kitchen` saqlanadi (AI xonani qayta qursa ham);
- **Tekshiruv**: `verify_f2.mjs` 33/33, `verify.mjs` ✓, `verify_ai.mjs` 34/34, `verify_f1.mjs` 37/37, `verify_glb.mjs` 24/24, `tests/ui/run.sh` 5/5, brauzer `qa_f2.mjs` (toggle→cutlist/smeta/moyka) + `qa_f1/qa_ai/qa_util` ✓;

- **O'rnatma texnika (F2c)**: `data/appliances.json` (pech/posudomoyka/mikroto'lqin/muzlatgich/plita/chimenee — standart nishon o'lchamlari) → katalogda "O'rnatma texnika" kategoriyasi (SP-T-001..006, bo'sh korpus — cutlist 0 detal, 3D placeholder quti, `default_z` bilan: plita z=720, chimenee z=1500);
- **Moyka 3D belgisi**: derived stoleshnitsa placementida `p.moyka` → items.js quyuq quti (lokal koordinata, devor tomoni `backLocal`);
- **CNC ichki kontur**: `collectSheetCutouts` → DXF `CUTOUT` qatlami + G-code **2a-bosqich** (ichki kontur tashqi konturdan OLDIN — holding tab bilan); moyka konvensiyasi tuzatildi (x=EN/F dan, y=UZUNLIK/L dan); vertikal run'lar uchun synthetic placementlar **rot=90** (detal uzunligi W bo'lib, 2800 varaqqa sig'adi);
- **AI**: `aiBuild` dan keyin `room.utilities` + `doc.kitchen` saqlanadi (AI xonani qayta qursa ham);
- **Tekshiruv**: `verify_f2.mjs` 42/42, `verify.mjs` ✓, `verify_ai.mjs` 34/34, `verify_f1.mjs` 37/37, `verify_glb.mjs` 24/24, `tests/ui/run.sh` 5/5, brauzer `qa_f2.mjs` (cutlist/smeta/moyka/appliances/sink-mesh) + `qa_f1/qa_ai/qa_util` ✓;

**F2 qoldiq (keyingi qadam):** ERP stoleshnitsa materiali (hozir LDSP18 — Sobir javobi); L-burchakda stoleshnitsa birlashtirish (hozir 2 alohida qism); texnika uchun AI avtomatik joylashtirish.

## 1. Egasining qarori kerak (ishni to'xtatib turibdi)

| # | Savol | Hozirgi holat |
|---|---|---|
| Q1 | Ustama necha foiz? | 35% (`app/data/materials.json` → `pricing.markup_pct`) |
| Q2 | Plita narxi mijozga qanday hisoblanadi: kroydagi butun varaqlar yoki ishlatilgan maydon + chiqindi %? | butun varaqlar. Modul kattalashsa, yangi varaq kerak bo'lmaguncha narx deyarli o'zgarmaydi |
| Q3 | `TS-1730` — petlyami yoki styajkami? | fragmentlarda petlya sifatida, `materials.json` da "Styajka" |
| Q4 | Server qayerda turadi: `smart3d.bittada.uz` — Sobir tunneli orqalimi yoki alohida serverdami? | javob yo'q |
| Q5 | Smart3D va Bittada Usta'dagi ModuleCatalog: birlashtiramizmi yoki alohida mahsulotmi? | javob yo'q |
| Q6 | Smeta qachon "muzlatiladi": mijozga yuborilgandami yoki shartnoma tuzilgandami? | muzlatish yo'q |
| Q7 | Sex stanoklari aniq qaysi modellar? "Homag" — Holzma arrami yoki CNC'mi? | noma'lum |

---

## 2. Kerakli ma'lumotlar (kod bilan hal bo'lmaydi)

| # | Ma'lumot | Kimdan | Nima uchun | Holat |
|---|---|---|---|---|
| D1 | 184 ta plita va 187 ta furnituraning narxi | ERP / ombor | smeta "to'liq emas" bo'lib qolmasligi uchun | narxsiz |
| D2 | 211 ta xizmat narxi (`widget_service`: tannarx + mijoz narxi) | Bittada ERP | `services.json` dagi 15 ta manbasiz tarif o'rniga | yo'q |
| D3 | Kromka katalogi: eni, qalinligi, metr narxi | ERP | hozir faqat 3 ta kromka bor | yo'q |
| D4 | Ish haqi stavkalari (arralash, kromka, prisadka, yig'ish) | sex | hozirgi stavka taxminiy | yo'q |
| D5 | Yechim katalogi (8 xonali kod + narx) va furnitura komplektlari | Yechim / ERP | fragmentlardagi 40 ta furnitura kodidan 28 tasi bazada yo'q | 39 qatorli namuna |
| D6 | **Sex konstruktiv standarti** (1–2 sahifa) | sex texnologi | stanok fayllari va formulalar shunga bog'liq | yo'q |
| D7 | **Stanok namuna fayllari** — har bir stanokdan 1–2 ta (`.cix/.bpp`, `.mpr`, `.ptx/.saw`, `.nc`) + kerf, trim, maksimal varaq | sex | post-prosessorlarni to'g'rilash | serverda umuman yo'q |
| D8 | 600 ta modul uchun manba `.b3d` fayllar + bazischi vaqti (~50–100 soat) | bazischi | kutubxona | serverda 2 933 + 994 ta fayl bor |
| D9 | "Oltin to'plam": 20 ta real buyurtma (`.b3d` + `.project` + haqiqiy smeta + rasm) | Bittada | qabul testi | tanlanmagan |
| D10 | 100–200 ta real usta iborasi (matn va ovoz yozuvi) | ustalar | AI test to'plami | yo'q |
| D11 | 200 ta GibLab `.project` fayl | serverdagi 5 722 tadan | kroyni GibLab bilan solishtirish | tanlanmagan |
| D12 | K20 (Sunpina): buyurtmadagi detallar ro'yxati (拆单/BOM) sahifasi, modul parametrlari, plita teksturalari | egasi o'zi kiradi (captcha) | Bazis'siz ishlash modelini tasdiqlash | olinmagan |
| D13 | API kalitlar: LLM (Claude yoki Gemini), Yandex SpeechKit | egasi | AI va ovoz | yo'q |

D6 (konstruktiv standart) quyidagilarni o'z ichiga oladi:
- birikma turi (konfirmat yoki eksentrik);
- orqa devor qanday mahkamlanadi (pazda yoki mixda);
- eshik va tortma zazorlari;
- 32 mm tizim;
- qaysi tomonga qanday kromka urilishi va qaysi qalinlikdan boshlab kesimdan ayirilishi;
- eshik balandligiga qarab petlya soni.

---

## 3. Kod ishlari

Ustuvorlik: **P0** — sexda ishlatishdan oldin shart · **P1** — keyingi · **P2** — kengaytirish.
"Ma'lumot" ustuni — qaysi §2 bandisiz bajarib bo'lmasligi.

### 3.1 Modullar kutubxonasi — P0

| # | Ish | Ma'lumot |
|---|---|---|
| M1 | 79 ta fragmentni to'liq formatga o'tkazish: slotlar, tekstura, teshiklar, kromka, furnitura (hozir 0/79) | D6 |
| M2 | 49 ta eski fragmentda geometriya mos emas: yon devor va tub burchakda 36 mm ustma-ust; polka `w-36` qattiq yozilgan (16 mm materialda 4 mm tirqish qoladi) | D6 |
| M3 | Max o'lchamda 80 ta detal varaqqa sig'maydi: 2800 mm dan uzun panellarni bo'lish qoidasi; HDF orqa devor 1220 mm dan keng bo'lsa — ikki qism | D6 |
| M4 | 31 ta teshik detal chegarasidan tashqarida; eski teshiklar shablon (hammasi 64,64) | D6 |
| M5 | Nomlar 4 yozuvda (ru / uz / uz-kir / en) — TZ talabi; hozir faqat o'zbekcha lotin | — |
| M6 | Shisha, mato kabi yog'och bo'lmagan materiallar (divan, deraza) LDSP deb hisoblanmasligi | — |
| M7 | **Fragment muharriri:** Excel shablondan import + ko'rinish + formula tekshiruvi → 600 ta modul | D8 — **→ `TZ-HAQIQIY-MODULLAR.md` (2026-10-15, MebelCity modullari uchun)** |

### 3.2 Stanok fayllari — P0 (hozir hammasi "SINOV" belgisi bilan)

| # | Ish | Joy | Ma'lumot |
|---|---|---|---|
| C1 | Teshiklar Y bo'yicha ko'zgu aksida tushadi (56 tadan 0 tasi o'z detalida) | `cnc.js:57, 266` | ✅ 2026-10-14 |
| C2 | Kesish chuqurligi doim 16 mm, detal esa 18 mm — oxirigacha kesilmaydi | `cnc.js:210` | D7 |
| C3 | Detallar orasida arra kerfi (4 mm) qoladi, freza esa Ø6 — qo'shni detalga kirib ketadi | nesting + cnc | D7 |
| C4 | Biesse `.cix` va Homag `.mpr` — loyiha emas, doim "Sample_Panel" chiqadi | `cnc.js:566` | D7 |
| C5 | Hamma teshik bitta Ø6 freza bilan; burg'ulash sikli yo'q; yon teshiklar yuza teshigi deb beriladi | `cnc.js` | D7 |
| C6 | DXF'da hamma varaq bitta nuqtada ustma-ust | `cnc.js:93` | ✅ 2026-10-14 |
| C7 | Altendorf rejasi: 84 kesimdan 34 tasi detallarni kesib o'tadi | `cnc.js:432` | ✅ 2026-10-14 |
| C8 | G-code: G54/G43 yo'q, bir o'tishda to'liq chuqurlik, kirish rampasi yo'q | `cnc.js` | D7 |
| C9 | Post-prosessor plugin arxitekturasi: yangi stanok = yangi fayl | — | D7 |
| C10 | Birinchi ishga tushirish: 1 ta arzon detalda sinov va texnolog tasdig'i (TZ §10.3) | — | D7 |

### 3.3 Kroy va eksport — P0/P1

| # | Ish | Ustuvorlik |
|---|---|---|
| K1 | Lenta (strip) rejimi buzuq: koordinatalar almashgan, tekstura 90° buriladi | P0 ✅ 2026-10-14 |
| K2 | GibLab eksportining o'z joylashtirgichi bor va detallarni tashlab ketadi (95 tadan 89 tasi chiqadi); shkafda xato bilan to'xtaydi → asosiy kroy natijasidan foydalansin | P0 ✅ 2026-10-14 |
| K3 | BPJ: hamma panel MDF 16 mm; bitta moduldagi panellar bir nuqtada; teshiklar yo'q | P0 ✅ 2026-10-14 |
| K4 | Eksportlar endi detal `length`/`width` = kesim o'lchami ekanini hisobga olsin (tayyor o'lcham — `finish_length/width`). GibLab'da `l` (tayyor) va `cl` (kesim) maydonlari to'g'ri to'ldirilsin | P0 ✅ 2026-10-14 |
| K5 | `nestBatch` buyurtma ID'sini yo'qotadi | P1 |
| K6 | **GibLab bilan solishtirish (benchmark):** 200 ta faylda list soni ≥ 90% holatda ko'p bo'lmasligi, chiqindi ≤ +2 foiz punkt (D11) | P0 |
| K7 | Qoldiqlar ombori — UI (API bor) | P1 |
| K8 | Ko'p buyurtmali kroy — UI | P1 |
| K9 | Detal QR label, packing list, montaj chizmasi, "sex paketi" ZIP (Sunpina usuli) | P1 |

### 3.4 Smeta — P0/P1

| # | Ish | Ustuvorlik | Ma'lumot |
|---|---|---|---|
| S1 | Fragmentlardagi furnitura kodlarini ERP katalogidagi haqiqiy mahsulotga bog'lash (28/40 bazada yo'q) | P0 | D5 — **→ `TZ-HAQIQIY-MODULLAR.md` (2026-10-15, MebelCity modullari uchun)** |
| S2 | `services.json` (15 ta manbasiz tarif) → ERP'dagi 211 ta xizmat | P0 | D2 |
| S3 | `sheet-catalog.json` ma'lumot xatolari: 184 ta narxsiz, 9 ta imkonsiz valyuta kursi, 30 ta noto'g'ri qalinlik, 3 ta noto'g'ri o'lcham | P0 | D1 |
| S4 | Valyuta kursi kunlik (CBU) — hozir qattiq 12 800 | P1 | — |
| S5 | Smetani muzlatish (snapshot) va "narx o'zgardi: ±X" ko'rsatish | P1 | Q6 |
| S6 | Har bir modulda materialni alohida almashtirish UI (`placementSlots` dvigatelda bor) | P1 | — |
| S7 | `materials-index.json` va `sheet-catalog.json` takrorlanadi (1,2 MB) — bittasi qoldirilsin | P2 | — |

### 3.5 AI va ovoz — P1

| # | Ish |
|---|---|
| A1 | Parser 27 iboradan 7 tasini tushunadi. Tuzatiladiganlar: "3.5 ga 2.8", kirill "3х4", "3 yarim", "угловая", miqdorlar ("4 ta"), U shakl (doim L chiqadi), "eshik 90 sm" → 90 000 mm, "shkaf h 2400" → shift balandligi. Tushunmasa ham "✅" ko'rsatmasin | ✅ 2026-10-14 |
| A2 | L shaklda modullar ustma-ust tushadi (burilgan devor) | ✅ 2026-10-14 |
| A3 | Validator balandlikni hisobga olmaydi — ustki va pastki shkaflar uchun soxta "W_OVERLAP" ogohlantirishi | ✅ 2026-10-14 |
| A4 | **LLM ulash** — server proxy, kalit faqat serverda, provayder sozlanadi. Hozirgi `gemini-pro` modeli eskirgan (D13) |
| A5 | Yandex SpeechKit (STT/TTS) server proxy; Gemini Live (D13) |
| A6 | AI jurnali: usta nima dedi → AI nima tushundi → tasdiqlandimi (lug'at o'sishi uchun) |

### 3.6 Sayt (frontend) — P1

| # | Ish |
|---|---|
| F1 | Xona faqat to'rtburchak → poligon, 90° bo'lmagan burchaklar, L shaklli xona; deraza, eshik, quvur, rozetka | ✅ yadro + GLB/OBJ pol + quvur/rozetka **export ham** 2026-10-15 (§0.2); qoldiq: AI edge-placement, 90°+ yordam |
| F2 | Oshxona elementlari: yaxlit stoleshnitsa, sokol (smetaga ham), dobor, karniz, o'rnatma texnika o'lchamlari, moyka kesimi  ✅ 2026-10-15 (§0.3, texnika+moyka 3D+CNC kontur ham); qoldiq: ERP material, L-burchak birlashtirish |
| F3 | Undo/redo; bir nechta loyiha (IndexedDB); `loyiha.json` ni import qilish |
| F4 | Material qidiruvi: 2 harfli so'zlar noto'g'ri moslashadi; "oq", "kromka" kabi o'zbekcha so'zlar topilmaydi; sinonim lug'ati (TZ §4.2) |
| F5 | Xavfsizlik: 5 ta `innerHTML` joyda ma'lumot ekranlanmagan (`app.js:297, 424, 447, 486, 522`) | ✅ 2026-10-14 |
| F6 | Three.js xotirasi: devor va to'r tozalanganda `dispose` qilinmaydi | ✅ 2026-10-14 |
| F7 | `app.js` (1 300 qator) modullarga bo'linsin; og'ir hisob (kroy) Web Worker'da |
| F8 | Rus tilidagi interfeys |
| F9 | BLE lazer o'lchagich (TZ §2) |

### 3.7 Backend, deploy, xavfsizlik — P1

| # | Ish | Ma'lumot / qaror |
|---|---|---|
| B1 | Bitta stack tanlash: SQLite (`index.js`, ishlaydi) yoki PostgreSQL (`src/`, ishlamaydi va xatolari bor) | — |
| B2 | Frontendni serverga ulash: login, loyihani serverga saqlash, buyurtma | — |
| B3 | ERP'dan jonli narx (Bittada `mcp_api`, faqat o'qish) | ERP ruxsati |
| B4 | **Deploy** `smart3d.bittada.uz`: HTTPS, `JWT_SECRET`, `ADMIN_PASSWORD`, `TRUST_PROXY`, nginx | Q4 |
| B5 | Avtomatik zaxira (backup), log, monitoring, CI (testlar har commit'da) | — |
| B6 | Multi-tenant: har bir sexning ma'lumoti alohida (`org_id`, Postgres RLS); WebSocket'da ham | B1 |
| B7 | Refresh token va tokenni bekor qilish; Content-Security-Policy sarlavhasi | — |
| B8 | Docker/nginx fayllari ishlamaydigan `src/server.js` ga qaragan — tuzatish | B1 |
| B9 | Obuna va to'lov (boshqa sexlar uchun) | P2 |
| B10 | Serverda foto-render worker (Blender) — tekshirilmagan | P2 |

### 3.8 Huquqiy — P1

| # | Ish |
|---|---|
| L1 | Mijozlarning shaxsiy ma'lumotlari O'zbekistondagi serverda saqlanishi talabi — yurist bilan tekshirish (B4 ga ta'sir qiladi) |
| L2 | Sunpina K20 3D modellari (GLB) va katalogidan foydalanish litsenziyasi |

---

## 4. Bajarish tartibi (tavsiya)

1. ~~**Darhol (ma'lumot kutmasdan):** C1, C6, C7, K1, K2, K3, K4, A1–A3, F5, F6.~~ ✅ 2026-10-14 bajarildi (§0.1).
2. **Ma'lumot kelganda:**
   - D6 + D7 → M1–M4, C2–C10;
   - D1–D5 → S1–S3;
   - D11 → K6.
3. **Qarorlar kelganda:**
   - Q1/Q2 → smeta modeli;
   - Q4 → B4 deploy;
   - Q6 → S5.
4. **Keyin:** M7 → 600 ta modul; F1–F3; A4–A5; B1–B3; B6.

**Taxminiy muddat** (bitta dasturchi + agent, ma'lumotlar o'z vaqtida kelsa):
- 1-band — 1 hafta;
- 2–3-bandlar — 3–4 hafta;
- 600 ta modul — bazischi vaqtiga bog'liq (~50–100 soat).

---

## 5. Qabul mezoni (oxirgi, TZ §13 dan)

3 ta real buyurtmani (oshxona, shkaf-kupe, bolalar xonasi) haqiqiy usta Smart3D'da qayta quradi. Shartlar:
- zamerdan sex paketigacha ≤ 60 daqiqa;
- detallar soni Bazis bilan bir xil;
- listlar soni GibLab bilan ±1 farqda;
- smeta haqiqiy smetadan ±5% farqda;
- stanok fayli 1 ta sinov detalida texnolog tomonidan tasdiqlangan.

Har o'zgarishdan keyin tekshiruv: `bash tests/ui/run.sh` va `cd server && npm test`.
