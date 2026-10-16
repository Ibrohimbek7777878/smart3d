# Loyiha TZ'lari — ro'yxat va navbat

**Yangilandi:** 2026-10-16 (kechqurun)

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
| 05 | [83 ta umumiy modul geometriyasi](05-modul-geometriyasi.md) | PAUZA (egasi: "hozircha tegmang") | — |
| 06 | [Modullarga teshiklar](06-teshiklar.md) | **EVROVINT BAJARILDI** 2026-10-15 (724 vint, 1077 teshik, Bazis bilan aynan) | D6 — petlya, polka ushlagich, ruchka, eksantrik; evrovint 7/4.5 yoki 8/5 |
| 07 | [Login va loyihani serverga saqlash](07-login-va-serverga-saqlash.md) | **BAJARILDI** 2026-10-15 | haqiqiy SMS uchun Eskiz akkaunti serverga |
| 08 | [Ekrandagi qoida buzilishlari: logo, oyna, burish](08-ui-qoida-tuzatishlari.md) | QISMAN: oyna ✅, burish ✅, logo — kutilmoqda | egasi: Bittada logo fayli |
| 09 | [Yangi frontend: React versiyani loyihaga ulash (dizayn buzilmaydi)](09-dizayn.md) | **BAJARILDI** 2026-10-15 (`dizayn` tarmog'i) | egasi: yangi UI qismlari skrinshoti (3.3), main'ga qo'shish va deploy ruxsati |
| 10 | [Deploy va zaxira nusxa](10-deploy-va-zaxira.md) | **REPO QISMI BAJARILDI** 2026-10-15 | admin: `server/DEPLOY.md` bo'yicha o'rnatadi; L1 (yurist) |
| 11 | [Stanok fayllarini haqiqiy stanokka moslash](11-stanok-postprotsessorlar.md) | 2-TAHRIR — tasdiq kutilmoqda (namunalar o'rganildi 2026-10-16) | egasi: "boshla" (GibLab `.project` Bazis'dek + KDT prisadka), texnolog — D6 |
| 12 | [AI: til modeli va ovoz](12-ai-llm.md) | **BAJARILDI** 2026-10-15 (ovozdan tashqari) | real ishlatish uchun API kalit serverga |
| 13 | [Modullar kutubxonasi — 600 ta](13-modullar-kutubxonasi.md) | MA'LUMOT KUTILMOQDA | D8 (Bazis fayllari) |
| 14 | [Sex standartlari sahifasi (admin)](14-sex-standartlari-sahifasi.md) | **BAJARILDI** 2026-10-15 | — |
| 15 | [Katalogdan ustki shkaf balandligi](15-ustki-shkaf-balandligi.md) | **BAJARILDI** 2026-10-15 | — |
| 16 | [Telegram bot uchun Mini App](16-telegram-mini-app.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) — haqiqiy bot bilan sinov kutilmoqda | egasi: bot kaliti serverga (admin), HTTPS, bot linki; kutish ekrani skrinshoti |
| 17 | [Bazis BPJ faylini to'liq qilish](17-bpj-toliq.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) — real sinov kutilmoqda | egasi: Bazis'li kompyuterda sinov ([yo'riqnoma](../BPJ-SINOV-YORIQNOMA.md)); sokol/stoleshnitsa savoli |
| 18 | [Uch til: o'zbek, rus, ingliz](18-uch-til.md) | BAJARILDI 2026-10-16 (`dizayn` tarmog'i) | sexdan bir kishi ruscha matnni ko'rib chiqsa yaxshi; "toko" so'zi — savol |
| 19 | [Production darajasi: modullar, xavfsizlik, xato kodlari, ikonlar](19-senior-production.md) | **BAJARILDI** 2026-10-15 (`dizayn` tarmog'i) | egasi: skrinshotlar (ikonlar, "Xatolar jurnali", 404), main'ga qo'shish ruxsati |
| 20 | [Narx faqat bizning ma'lumotdan (admin "Narxlar" sahifasi)](20-narx-bizning-malumotdan.md) | PAUZA (egasi, 2026-10-16: "narxni qo'yib turamiz") | egasi: Q1 (`NARXLAR.xlsx` 3-ustuni), Q2 (ish haqi, kromka, ustama), Q3, "boshla" |
| 21 | [Saytga Bazis faylini yuklash (.b3d, .fr3d, .bpj)](21-bazis-fayl-yuklash.md) | **BAJARILDI** 2026-10-16 (`dizayn` tarmog'i) — GibLab bilan 97,7% mos | egasi: yangi tugma va hisobot skrinshoti (3.3) |
| 22 | [Avtomatik konstruktor (AI'siz, qoidalar bilan)](22-avtomatik-konstruktor.md) | **BAJARILDI** 2026-10-16 (`dizayn` tarmog'i) | texnolog: qoidalar raqamlari va stoleshnitsa qalinligi; egasi: yangi oyna skrinshoti (3.3) |

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
| Modul geometriyasi (TZ-05) | hozircha tegilmaydi |
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
