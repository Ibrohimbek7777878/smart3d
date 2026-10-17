# TZ-29 — Jamoa ishi, 2-to'lqin: undo, oddiy rejim, teshiklar, stoleshnitsa, narxlar sahifasi, AI oshxona, teshik 3D

**Sana:** 2026-10-17 · **Navbat:** 29 · **Holat:** BAJARILDI (`dizayn` b409784, push qilindi; testchi: O'TDI)
**Asos:** egasi #160 ("boshla unda" — TZ-28 dagi 2-bo'lim), #161–#179 (SORIZLAR, shu sessiya raqamlari).

## 1. Natija

| Agent (model) | Holat | Natija | Commit |
|---|---|---|---|
| Frontend · Undo (Opus) | BAJARILDI | Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, sarlavhada ikki tugma (telefonda 3D ustida — egasi #163 tasdiqladi), 50 qadam, "Bekor qilindi: …" | 77d8699 |
| Backend · Stoleshnitsa L-burchak (Sonnet) | BAJARILDI | L/U burchakda butt-ulanish, ustma-ust 0, bo'shliq 0 | 09223a6 |
| Backend · Teshiklar (Opus) | Asosan bajarildi | Eksentrik (Ø15×12,5, Ø7×35, Ø10×11 — sex KDT 198 teshik), tortma yo'naltiruvchisi (Ø3×2,5, tubdan 27 mm — 95%), burchak petlya (yangi kod kerak bo'lmadi). 1000 mm ruchka — sexda dalil yo'q | aa11c2f |
| Frontend · Mayda tuzatishlar (Sonnet) | BAJARILDI | OBJ — faqat tanlangan modul; kamera mebel ichiga kirmaydi; Xona tablari 3 tilda | b2e301b |
| Frontend · Mijoz oddiy rejimi (Sonnet) | BAJARILDI (ko'rinish — egasi tasdig'iga) | "Usta / Oddiy", 4 qadam: Xona → Tayyor → Rang → Narx va buyurtma | 38e2e0a |
| Backend · Narxlar sahifasi (Opus) | BAJARILDI | `/api/narxlar` (faqat admin, tarix), sex xizmat jadvalini yuklash, stavkalardan hisob, "Narx aniqligi X%" | 0d771d1 |
| Backend · Stoleshnitsa standartlari (Sonnet) | BAJARILDI | 26/38 mm (sukut 26 — sexda 12/2 buyurtma), 3050/4200 bo'laklar, bo'linganda "Стяжка столешницы" 20 000; stoleshnitsa narxsiz (egasidan) | 0099380 |
| Frontend · Ko'proq ko'rsatish (Haiku) | BAJARILDI | "Boshqa ranglar" — 609 ta, "Yana ko'rsatish" | 7e26fd4 |
| Frontend · 3D oyna o'lchami (Sonnet) | BAJARILDI | Canvas har dpr da konteynerni to'ldiradi (80% masshtab xatosi) | f929e5f |
| Backend · Test tuzatishlari (Sonnet) | BAJARILDI | Telegram testi (Oddiy rejim sukuti), D6 prisadka stavkasi, aniqlik ≤ 99% narxsiz bo'lsa, `smeta_hisob.mjs` web hisob bilan | 7cfe0fb |
| Backend · AI oshxona prompti (Opus) | BAJARILDI | "Kuxnya 4500 mm …" → 3 qavatli oshxona **faqat katalog modullaridan** (egasi #177); bitta modul — katalogdan tanlash, topilmasa chizmaydi | 73333d8 |
| Frontend · Teshik, kromka, zapchast 3D (Opus) | BAJARILDI | Rentgenda teshiklar (InstancedMesh), kromka tasmasi, zapchast belgilari; detal kartasida kromka va teshiklar ("Kromka: —" ekran xatosi edi) | 7c77540 |
| Frontend · Yangi versiya o'zi yuklansin (Sonnet) | BAJARILDI | `clientsClaim`, `controllerchange` → saqlab, keyin reload; har 10 daqiqada tekshiradi | 2bc0b3d |
| Test · Yakuniy ×3 (Sonnet) | O'TMADI → tuzatildi → O'TDI | 1-test 4 kamchilik topdi; keyingi ikki test: node 31–33, server 77–78, web 29–31 to'plam yashil | — |

## 2. Egasi tasdiqlashi kerak
1. Ish haqi narxga kiradimi va stavkasi; ustama 35% qoladimi — narx 100% uchun.
2. Stoleshnitsa narxlari: 26/38 mm × 3050/4200; L-burchakka ham styajka; "Распил Столешница" 10 000.
3. AI oshxona:
   - "1-qavat 870" — poldan stoleshnitsagacha deb olindi;
   - 3-qavat chuqurligi 560 — katalogda maks 400;
   - Gola 7 000 (metr yoki dona), Tandem vakuum 90 000 bog'lansinmi;
   - vytyajka balandligi.
4. 1000 mm ruchka teshik oralig'i; burchak modul eshigida petlya 2 yoki 4.
5. Oddiy rejimda "Excelni chatga yuborish" kerakmi (Telegram mijozi).
6. Yangi oynalar ko'rinishi: oddiy rejim, narxlar sahifasi, AI oshxona kartasi.

## 3. Navbatdagi taklif — TZ-30 (egasi #179)
- **Frontend:** sahifa manzillari — `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/:id`, `/sozlamalar`, `/buyurtmalar` (hozir hammasi `app.html#s=…`, `/loyihalar` 404); eski havolalar yo'naltiriladi.
- **Backend:** `server/index.js` (1156 qator, 49 endpoint) → `server/routes/<modul>.js`, API manzillari o'zgarmaydi. `server/src/` dagi ikkinchi server bilan nima qilish — tekshiriladi.
- Egasidan: production (`smart.bittada.uz`) qaysi branch'dan ishlaydi; "boshla".
