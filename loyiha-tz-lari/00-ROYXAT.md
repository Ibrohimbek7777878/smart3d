# Loyiha TZ'lari — ro'yxat va navbat

**Yangilandi:** 2026-10-15

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
| 01 | [Stanok eksportlari: noto'g'ri faylni yashirish](01-stanok-eksport-xavfsizligi.md) | **BAJARILDI** 2026-10-15 (BPJ bandidan tashqari) | egasi: BPJ yashirilsinmi (S5) |
| 02 | [Testlarni tiklash, `/tmp` ga bog'liqlikni yo'qotish](02-testlarni-tiklash.md) | **BAJARILDI** 2026-10-15 | — |
| 03 | [Xizmatlar avtomatik qo'shilmasin (S3)](03-xizmatlar-S3.md) | TASDIQ KUTILMOQDA | egasi: 2 savol (standart holat; ish haqi xizmatmi) |
| 04 | [Narx ma'lumotlari: egasi uchun jadval + import](04-narx-malumotlari.md) | **BAJARILDI** 2026-10-15 (vosita) | egasi: `Smart3D_malumot/narx-toldirish-2026-10-15.xlsx` ni to'ldiradi |
| 05 | [83 ta umumiy modul geometriyasi](05-modul-geometriyasi.md) | TASDIQ KUTILMOQDA | egasi: konstruksiya qoidasi |
| 06 | [Modullarga teshiklar](06-teshiklar.md) | QAROR KUTILMOQDA | egasi: variant A yoki B; B uchun D6 |
| 07 | [Login va loyihani serverga saqlash](07-login-va-serverga-saqlash.md) | TASDIQ KUTILMOQDA | egasi: telefon + parol bilan kirish |
| 08 | [Ekrandagi qoida buzilishlari: logo, oyna, burish](08-ui-qoida-tuzatishlari.md) | TASDIQ KUTILMOQDA | egasi: Bittada logo fayli |
| 09 | [Yangi dizayn](09-dizayn.md) | MA'LUMOT KUTILMOQDA | Claude Design natijasi; tarif, aloqa |
| 10 | [Deploy va zaxira nusxa](10-deploy-va-zaxira.md) | MA'LUMOT KUTILMOQDA | Q4 (server qayerda), L1 (yurist) |
| 11 | [Stanok fayllarini haqiqiy stanokka moslash](11-stanok-postprotsessorlar.md) | MA'LUMOT KUTILMOQDA | D7 (serverdan namunalar), Q7 (stanok modellari) |
| 12 | [AI: til modeli va ovoz](12-ai-llm.md) | MA'LUMOT KUTILMOQDA | D13 (API kalit), D10 (usta iboralari) |
| 13 | [Modullar kutubxonasi — 600 ta](13-modullar-kutubxonasi.md) | MA'LUMOT KUTILMOQDA | D8 (Bazis fayllari) |

**Navbat sababi:**
- **01** — stanokka noto'g'ri fayl ketishining oldini oladi.
- **02** — keyingi har bir ishni tekshirish uchun testlar ishlashi kerak.
- **03–06** — narx va detallar to'g'riligi.
- **07–09** — foydalanuvchi uchun.
- **10–13** — tashqi ma'lumot kelgach.

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
