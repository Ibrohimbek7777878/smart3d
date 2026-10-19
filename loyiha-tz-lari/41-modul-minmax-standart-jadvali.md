# TZ-41 — Eng ko'p ishlatiladigan modullar uchun max/min: jahon standarti va sex haqiqati jadvali (TAHLIL, kodsiz)

**Sana:** 2026-10-19 · **Navbat:** 41 · **Holat:** BOSHLANDI 2026-10-19 12:05 (egasi #270, #276) — faqat tahlil va jadval; kodga olish egasi tasdig'idan keyin
**Asos:** 600+ modul bazasi repoda yo'q (egasi bergan `modulniy` = 38 ta, allaqachon katalogda). Shu sababli ish hozirgi katalog (85 SP + 38 MC) va sex statistikasi (`Smart3D_malumot/Sex_olchamlari_taklif.xlsx`: 804 buyurtma, 40 604 detal) asosida.

## Natija (bitta hujjat: `loyiha-tz-lari/41-natija-modul-minmax.md` + CSV `Smart3D_malumot/modul-minmax-taklif.csv` (maxfiy papka, repoga kirmaydi))
1. **Eng ko'p ishlatiladiganlar:** buyurtma nomlari/detal statistikasidan mebel turi bo'yicha reyting (oshxona pastki/ustki/penal, shkaf/kupe, krovat, tumba, parta, hammom...) va katalogdagi mos modul kodlari; katalogda **yo'q** turlar ro'yxati (6 ta kutilgan: krovat yon tumbasi, ochiladigan klassik shkaf, yumshoq oyoq, ramkali ko'zgu, shkaf ustiga antresol, ofis hujjat shkafi + statistikadan chiqqanlari).
2. **Har tur uchun max/min:** (a) hozirgi katalog qiymati, (b) sex haqiqati (5–95%), (c) **jahon standartlari** — manba bilan (EN 1116 oshxona koordinatsion o'lchamlari, EN 14749 uy-ro'zg'or saqlash mebeli, EN 1725 krovat, EN 12521 stol va hokazo; raqamlar WebSearch bilan asl hujjat yoki ishonchli manbadan tekshiriladi, topilmasa "tasdiqlanmadi" deb yoziladi, o'ylab topilmaydi), (d) taklif max/min va ziddiyat izohi (standart ≠ sex bo'lsa ikkalasi ko'rsatiladi).
3. **Ergonomika/Uzbekiston sex amaliyoti** izohi (stoleshnitsa balandligi, ustki shkaf balandligi, chuqurliklar) — sex-standartlari.json bilan solishtirilib.
4. Hamma raqam qatorida manba va ishonch darajasi. Egasi jadvalni ko'rib tasdiqlaydi.

## Tegadigan fayllar: faqat yangi hujjat va CSV. Kod, fragments.json, sex-standartlari.json **o'zgarmaydi**.
## Xavf: YO'Q (tahlil).
