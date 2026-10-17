# Loyiha TZ'lari — ro'yxat va navbat

**Yangilandi:** 2026-10-17

## Qanday ishlaydi
- Har ish uchun alohida TZ shu papkada. Bajarish **navbat bilan**.
- Har TZ egasining **"boshla"** so'zidan keyingina bajariladi (qoida 1.1).
- TZ bajarilib, tekshirilgach:
  - TZ faylida holat **BAJARILDI** deb yoziladi;
  - shu jadvalda ham yangilanadi;
  - commit qilinadi (1.9).
- Yangi TZ shu papkaga keyingi raqam bilan qo'shiladi.

## Navbat

| № | TZ | Holat | To'siq — kimdan nima kerak |
|---|---|---|---|
| 01 | [Stanok eksportlari: noto'g'ri faylni yashirish](01-stanok-eksport-xavfsizligi.md) | **BAJARILDI** 2026-10-15 (BPJ — SINOV belgisi bilan qoldi) | — |
| 02 | [Testlarni tiklash, `/tmp` ga bog'liqlikni yo'qotish](02-testlarni-tiklash.md) | **BAJARILDI** 2026-10-15 | — |
| 03 | [Xizmatlar avtomatik qo'shilmasin (S3)](03-xizmatlar-S3.md) | **BAJARILDI** 2026-10-15 | — (prisadka tanlanadi, ish haqi avtomatik) |
| 04 | [Narx ma'lumotlari: egasi uchun jadval + import](04-narx-malumotlari.md) | **BAJARILDI** 2026-10-15 (vosita) | egasi: `Smart3D_malumot/narx-toldirish-2026-10-15.xlsx` ni to'ldiradi |
| 05 | [83 ta umumiy modul geometriyasi](05-modul-geometriyasi.md) | **BAJARILDI** 2026-10-17 (`dizayn`) — 50 modul, [hisobot](05-hisobot.md) | — |
| 06 | [Modullarga teshiklar](06-teshiklar.md) | **EVROVINT** 2026-10-15; **D6 (petlya, planka, polka ushlagich, ruchka) BAJARILDI** 2026-10-17 (`dizayn`, sex fayllaridan) | sinov kunida yuza tekshiruvi; eksantrik; burchak modullari petlyasi — texnolog |
| 07 | [Login va loyihani serverga saqlash](07-login-va-serverga-saqlash.md) | **BAJARILDI** 2026-10-15 | haqiqiy SMS uchun Eskiz akkaunti serverga |
| 08 | [Ekrandagi qoida buzilishlari: logo, oyna, burish](08-ui-qoida-tuzatishlari.md) | QISMAN: oyna ✅, burish ✅, logo — kutilmoqda | egasi: Bittada logo fayli |
| 09 | [Yangi frontend: React versiyani loyihaga ulash (dizayn buzilmaydi)](09-dizayn.md) | **BAJARILDI** 2026-10-15 (`dizayn` tarmog'i) | egasi: yangi UI qismlari skrinshoti (3.3), main'ga qo'shish va deploy ruxsati |
| 10 | [Deploy va zaxira nusxa](10-deploy-va-zaxira.md) | **REPO QISMI BAJARILDI** 2026-10-15 | admin: `server/DEPLOY.md` bo'yicha o'rnatadi; L1 (yurist) |
| 11 | [Stanok fayllarini haqiqiy stanokka moslash](11-stanok-postprotsessorlar.md) | **JARAYONDA** — `.project` + KDT bajarildi (`dizayn`, sex fayllari bilan 99,2% mos) | texnolog — D6 (taklif TZ ichida), sinov kuni (GibLab'ga import + 1 detal) |
| 12 | [AI: til modeli va ovoz](12-ai-llm.md) | **BAJARILDI** 2026-10-15 (ovozdan tashqari) | real ishlatish uchun API kalit serverga |
| 13 | [Modullar kutubxonasi — 600 ta](13-modullar-kutubxonasi.md) | MA'LUMOT KUTILMOQDA | D8 (Bazis fayllari) |
| 14 | [Sex standartlari sahifasi (admin)](14-sex-standartlari-sahifasi.md) | **BAJARILDI** 2026-10-15 | — |
| 15 | [Katalogdan ustki shkaf balandligi](15-ustki-shkaf-balandligi.md) | **BAJARILDI** 2026-10-15 | — |
| 16 | [Telegram bot uchun Mini App](16-telegram-mini-app.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) — haqiqiy bot bilan sinov kutilmoqda | egasi: bot kaliti serverga (admin), HTTPS, bot linki; kutish ekrani skrinshoti |
| 17 | [Bazis BPJ faylini to'liq qilish](17-bpj-toliq.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) — real sinov kutilmoqda | egasi: Bazis'li kompyuterda sinov ([yo'riqnoma](../BPJ-SINOV-YORIQNOMA.md)); sokol/stoleshnitsa savoli |
| 18 | [Uch til: o'zbek, rus, ingliz](18-uch-til.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) | sexdan bir kishi ruscha matnni ko'rib chiqsa yaxshi; "toko" so'zi — savol |
| 19 | [Production darajasi: modullar, xavfsizlik, xato kodlari, ikonlar](19-senior-production.md) | **BAJARILDI** 2026-10-15 (`dizayn` tarmog'i) | egasi: skrinshotlar (ikonlar, "Xatolar jurnali", 404), main'ga qo'shish ruxsati |
| 20 | [Narx faqat bizning ma'lumotdan (admin "Narxlar" sahifasi)](20-narx-bizning-malumotdan.md) | **1-BOSQICH BAJARILDI** 2026-10-17 (jamoa, `dizayn` ebbefdb): furnitura bog'landi, Bazis teshiklari sanaladi, raskroy 34 → 27 list (sex 23,5) | egasi: list formati, teshik/raspil/kromka stavkalari, samorez birligi, yig'ish, ustama |
| 21 | [Saytga Bazis faylini yuklash (.b3d, .fr3d, .bpj)](21-bazis-fayl-yuklash.md) | **BAJARILDI** 2026-10-16 (`dizayn` tarmog'i) — GibLab bilan 97,7% mos | egasi: yangi tugma va hisobot skrinshoti (3.3) |
| 22 | [Avtomatik konstruktor (AI'siz, qoidalar bilan)](22-avtomatik-konstruktor.md) | **BAJARILDI** 2026-10-16 (`dizayn` tarmog'i) | texnolog: qoidalar raqamlari va stoleshnitsa qalinligi; egasi: yangi oyna skrinshoti (3.3) |
| 23 | [3D ko'rinish Bazis-Cloud darajasida, rang va material tanlash, backend funksiyalari interfeysda](23-3d-korinish-va-backend-interfeys.md) | **BAJARILDI** 2026-10-16 (`dizayn`) — **C1 (buyurtma) bajarildi** 2026-10-17 (00777fc, #138); **A1 tuzatish** (aylantirganda ekran yangilanmaydi, #132) — bajarildi (TZ-25 ichida) | egasi: parolsiz email bilan kirish usuli (#119-3), yangi oynalar skrinshoti (3.3) |
| 24 | [O'z modulini chizish va tayyor promptlar kutubxonasi](24-modul-chizish-va-tayyor-promptlar.md) | **BAJARILDI** 2026-10-16 (`dizayn`) | egasi: yangi oynalar skrinshoti (3.3), 4 savol; texnolog: qoidalar raqamlari |
| 25 | [Bosh ish joyi — Bazis kabi bitta ekran: matn qatori, Bazis faylini ochish, xona va mebel chizish](25-bosh-ish-joyi.md) | **BAJARILDI** 2026-10-17 (`dizayn`) | egasi: yangi ish joyini ko'rib chiqish (skrinshotlar `tests/ui/out/web/ishjoyi-*.png`) |
| 26 | [AI konstruksiya: usta matni → Claude → tizim tili → ideal chizma](26-ai-konstruksiya.md) | **BAJARILDI** 2026-10-17 (`dizayn`) — AI'siz tahlilchi ishlaydi | admin: Claude kaliti serverga (`AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`) — `server/DEPLOY.md` |
| 27 | [Muharrir qulayliklari: eshik qiya ochilishi, yurishda tanlash, "orqaga", "Davom ettirish"](27-muharrir-qulayliklari.md) | **BAJARILDI** 2026-10-17 (`dizayn`) | — |
| 28 | [Shkaf prompti, material tanlash, 3D zoom, list ko'rsatkichi, 123 modul va Bazis o'lchovi](28-egasi-146-tuzatishlar.md) | **BAJARILDI** 2026-10-17 (jamoa, `dizayn` 5a1908f) — narx Bazis bilan 97,7% (38 MC modul) | egasi: material oynasi ko'rinishi, zapchast takliflari, sukut materiallar, xona o'lchami, kromka qoidasi |
| 29 | [Jamoa 2-to'lqin: undo, oddiy rejim, teshiklar, stoleshnitsa, narxlar sahifasi, AI oshxona, teshik 3D](29-jamoa-2-tolqin.md) | **BAJARILDI** 2026-10-17 (jamoa, `dizayn` b409784) — 3 test raundi, oxirgisi O'TDI | egasi: ish haqi, ustama, stoleshnitsa narxlari, AI oshxona talqinlari, yangi oynalar skrinshoti |
| 30 | [Sahifa manzillari, server modullari, ustama 35%, Asosiy 100 material, AI katalogdan](30-manzillar-server-ai-katalog.md) | **BAJARILDI** 2026-10-17 (jamoa, `dizayn` ae9c5f1) — testchi O'TDI, AI 14/14 so'rov | egasi: stoleshnitsa narxlari, `server/src` o'chirish, git tarixi, production joylash |
| 31 | [Google bilan kirish va VR (shlemda)](31-google-kirish-va-vr.md) | **BAJARILDI** 2026-10-18 (jamoa smart3d-51, `dizayn` 139209b) — testchi O'TDI | admin: `GOOGLE_CLIENT_ID` (Google Cloud OAuth); egasi: haqiqiy shlemda sinov |
| 32 | [Narx aniqligi 95%, stoleshnitsa narxi, 85 umumiy modul](32-narx-95-va-85-modul.md) | TAKLIF (egasi #194) — tahlil: foiz oshirib ko'rsatilgan (sukut plita narxi faylda yo'q), 85 moduldan 4 tasi toza | egasi: ish haqi, sukut plita, sex xizmati tanlovi, TS-1730, stoleshnitsa 4 narx, 12 quti-modul, korpus 16 mm; "boshla" |
| 33 | [SketchUp (.skp) va Bazis eksport](33-sketchup-va-b3d-eksport.md) | TAKLIF (egasi #198, #200) — .skp Free va Pro uchun (`openskp`), .dae zaxira, BPJ → Bazis | egasi: "boshla"; o'zimizning .b3d yozuvchi — hozirmi yoki BPJ sinovidan keyin |
| 34 | [Production'ni yangi versiyaga o'tkazish va git orqali yangilash](34-production-yangilash.md) | TASDIQ KUTILMOQDA (smart3d-51) | egasi: tarmoq (dizayn/main), kim bajaradi (admin yoki Claude'ga yozish ruxsati), vaqt; admin: zaxira, .env/baza ko'chirish, servis |

**Navbat sababi:**
- **01** — stanokka noto'g'ri fayl ketishining oldini oladi.
- **02** — keyingi har bir ishni tekshirish uchun testlar ishlashi kerak.
- **03–06** — narx va detallar to'g'riligi.
- **07–09** — foydalanuvchi uchun.
- **10–13** — tashqi ma'lumot kelgach.

## Egasi qarorlari (2026-10-15)
| Savol | Qaror |
|---|---|
| Xizmatlar (S3) | prisadka — usta tanlaydi; ish haqi — avtomatik |
| Modul geometriyasi (TZ-05) | ~~hozircha tegilmaydi~~ → 2026-10-17 "boshla va to'g'irla" (#134) |
| Teshiklar (TZ-06) | A — Bazis faylidan o'qish |
| BPJ (S5) | davom ettiriladi — S5 BPJ uchun olindi (TZ-17) |
| Kirish | telefon + SMS kod, Eskiz.uz |
| Server | Bittada serveri, smart3d.bittada.uz |
| Stanoklar | Altendorf, Homag/Holzma, Biesse Rover, kromka va prisadka |
| AI | istalgan sun'iy intellektga ulanadigan (provayderga bog'liq emas) |
| Chegaralar | ekrandan, faqat admin (TZ-14) |
| Bittada Usta (Q5, S6) | hozircha bog'lanmaydi, keyinchalik ulanadi |

## Avvalgi TZ'lar (loyiha ildizida, tarix uchun)

| Fayl | Holat |
|---|---|
| `TZ-HAQIQIY-MODULLAR.md` | BAJARILDI (A1–A5, B, C) |
| `TZ-QOLGAN-ISHLAR.md` | manba ro'yxat. Ochiq bandlari endi shu papkadagi TZ'larda; ziddiyat bo'lsa — shu papka ustun |
| `TZ-SAYT-BARQARORLIK-RESPONSIVE.md` | BAJARILDI (1–4 bosqich) |
| `TZ-Smart3D-Claude-2026-10-13.md`, `TZ-Smart3D-v2.md` | asosiy talablar manbasi |
| `KAMCHILIKLAR-VA-TUZATISH-TZ.md` | eskirgan — "30/30 tuzatildi" da'vosi tasdiqlanmagan (`TZ-QOLGAN-ISHLAR.md` ga qarang) |

## Pauzadagi ishlar (TZ'dan tashqari)
- **Serverdan namuna fayllar** (D7, D9) — server agenti uchun matn tayyor. Fayllar `../serverdan/` ga tushadi.
