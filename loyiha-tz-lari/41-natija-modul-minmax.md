# TZ-41 natija — Modul max/min: sex haqiqati va jahon standarti (TAHLIL, kodsiz)

**Sana:** 2026-10-19 · **Agent:** Tahlil · Modul max/min standartlar · **Holat:** egasi tasdig'ini kutadi (kod o'zgarmadi)
**CSV (maxfiy, repoda yo'q):** `Smart3D_malumot/modul-minmax-taklif.csv` · **Birlik:** mm · **Ishonch:** Y = yuqori, O = o'rta, P = past

## 0. Eng muhim xulosalar
1. **EN 14749, EN 1725, EN 12521 o'lcham chegarasi BERMAYDI** — ular xavfsizlik/mustahkamlik standartlari (EN 12521 uy stollari; ofis va o'quv stollarini o'z ichiga olmaydi). O'lchamni beradigan standartlar: EN 1116 (oshxona), EN 1729-1 (o'quv mebeli), EN 527-1 (ofis stoli), ГОСТ 13025.1/.2-85, ГОСТ 11015-93.
2. **Oshxona pastki/ustki/penal:** sex 5–95% (hozirgi katalog chegarasi shu) EN 1116 bilan mos; **bitta ziddiyat — ustki shkaf chuqurligi:** sex min 290, EN 1116 min 310.
3. **Sokl:** EN 1116 ≥ 80, EN 14749 (CATAS izohi) ≥ 100 (ko'chma bazalar); sex 80–100. Ikkala standart bir-biridan farq qiladi.
4. **Krovat:** ГОСТ 13025.2-85 chegarasi (uzunlik 1860–2050) sexdan torroq: sex bok 2100, tub 2058 (mediana).
5. **Parta:** ГОСТ 11015-93 stol usti uzunligi 600/1200; sex 1200 va **1600/1800** (eng ko'p). Chuqurlik: ГОСТ ≥450/500, sexda 400/420 ham bor. Eslatma: prg.kz ГОСТ 11015-93 "ГОСТ 35278-2025 bilan almashtiriladi" deydi (yangi raqamlar tasdiqlanmadi).
6. **Ma'lumot sifati:** 698 ta noyob buyurtma nomi (Taklif varag'ida 804 — farq tekshirilmadi); 414 tasi "Boshqa" (nomi odam ismi) — tur nom bo'yicha faqat ~324 tasiga aniqlandi. Krovat/parta/tumba/prixoshka/ofis uchun tanlama KICHIK (n=15–116 detal) — raqamlar past ishonchli.
7. **Katalogda yo'q turlar** (6 ta kutilgan): sexda eng ko'p ishlatilgani — **ramkali ko'zgu (trimo)** va **tumba**; qolganlari 1–4 buyurtma.

## 1. Eng ko'p ishlatiladigan turlar reytingi
Reyting: buyurtma nomidagi kalit so'zlar (bir buyurtma bir nechta turga tushishi mumkin) + "Xom detallar"dagi `Mebel turi` ustuni. Jami 40 604 detal.

| # | Tur | Buyurtma (nom bo'yicha) | Detal (Mebel turi ustuni) | Katalog modul kodlari |
|---|---|---|---|---|
| 1 | Oshxona (pastki ≈453, ustki ≈455, penal ≈59 modul — yon devor/2) | 137 | 12 345 (30%) | pastki: SP-K-001,004,008,014,022,023,024; MC-KP-01…11. ustki: SP-K-002,003,005,010,011,025,026,027; MC-KU-01…10. penal: SP-K-006,013,015,020,021; MC-KK-01. burchak/orol: SP-K-007,009 |
| 2 | Shkaf / kupe / garderob | 94 | 4 374 (11%) | SP-W-001…009, SP-G-010…012, MC-SH-01…06 |
| 3 | Tumba / TV zona | 20 | 721 | SP-SH-002 (TV taxta), SP-BD-005 (komod), SP-BD-006 |
| 4 | Parta (o'quvchi) | 17 (nomda); 32 (detal nomida) | ~750–790 | MC-PA-01, MC-PA-02 |
| 5 | Krovat | 17 (nomda); 32 (detal nomida) | ~900 | MC-KR-01…05, SP-BD-001…004 |
| 6 | Prixoshka | 8–16 | 411–927 | SP-D-002, SP-W-008 (modul yo'q) |
| 7 | Ofis / yozuv stoli | 14–15 (stol: 20) | 492 | SP-T-001,004,005,007, SP-O-010,011 |
| 8 | Vitrina / magazin prilavka | 7 | ~885 | SP-SH-004 (faqat javon) |
| 9 | Ramkali ko'zgu (trimo/oyna) | 10 | 98 | yo'q |
| 10 | Antresol | 4 | 20 | MC-KA-01…03 (oshxona), SP-M-002 |

Detal turlari (komponent): eshik 4 149, yon devor 3 993, polka 2 384, tub 2 219, tom 1 783, orqa devor 1 568, stoyka 1 023, sokl 1 014, tortma fasadi 755.

## 2. Katalogda yo'q turlar
| Tur | Sexda dalil | Katalogda | Holat |
|---|---|---|---|
| Krovat yon tumbasi | nomda 0; "tumba" 13 buyurtma (242 detal) | faqat SP-BD-005 komod | YO'Q |
| Ochiladigan klassik shkaf | kupe 7, garderob 7 buyurtma; sexda ochiladigan/kupe ajratilmagan | SP-W-001, SP-W-005…007 ("qanotli") | QISMAN — kupe/ochiladigan alohida standartga ajratilmagan |
| Yumshoq oyoq | "oyoq/opora" 67 buyurtma (325 detal); "yumshoq" belgisi ma'lumotda yo'q | faqat furnitura NOG-90 | YO'Q (ma'nosi aniqlashtirilsin) |
| Ramkali ko'zgu (trimo) | 10 buyurtma, 98 detal | SP-B-003, SP-H-011 (ko'zgu shkafi) | YO'Q |
| Shkaf ustiga antresol | "antrisol" 4 buyurtma | MC-KA-* (oshxona uchun), SP-M-002 | QISMAN |
| Ofis hujjat shkafi | 1 buyurtma | SP-O-011 (g'ildirakli tumba) | YO'Q |
| **Statistikadan chiqqan:** prixoshka (to'liq modul) | 8–16 buyurtma | faqat SP-D-002 panel | YO'Q |
| TV stenka/gorka | 20 buyurtma | SP-SH-002 TV taxta | QISMAN |
| Vitrina/prilavka | 7 buyurtma | SP-SH-004 | QISMAN |
| Stellaj/ochiq tokcha | 5 buyurtma | SP-SH-003,005 | BOR |
| Hammom | 2 buyurtma (tanlama yo'q) | SP-B-*, SP-H-* | tahlil qilinmadi |

## 3. Max/min jadvallari
"Katalog" = ilova yuklanganda ishlaydigan `sex-standartlari.json` (egasi tasdiqlagan 2026-10-15); u yerda yo'q bo'lsa `fragments.json` min/max. "Sex" = p5–p95 (`Sex_olchamlari_taklif.xlsx`). Hisob = mening hisobim, standart matni emas.

### 3.1 Oshxona pastki (SP-K-001/004/008/014/022…; MC-KP-*)
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Ziddiyat izohi | Ish. |
|---|---|---|---|---|---|---|
| Eni 1 eshikli | 300–540 (fragments SP-K-001: 300–1000) | 300–540 (n=2431 eshik) | EN 1116:2018 nominal baza eni 400/500/600/900 — [CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) | 300–540 | Standart 300 ni taqiqlamaydi; 150–300 ingichka modullar (kargo) sex amaliyoti | Y (sex) / O (EN) |
| Eni 2 eshikli | 600–1070 | 600–1070 | shu | 600–1070 | — | Y |
| Bo'yi (yon devor) | 600–880 | 600–874 (n=906) | EN 1116: ish yuzasi balandligi 850/900/950 (0/+50); sokl ≥80. Hisob (sokl 100 + stoleshnitsa 38 — fragments-mc.json): 712–812 (862 gacha) | 600–880 | Sex yuqori chegarasi hisobdan 18 mm baland; 600 — plita ostidagi past modullar (MC-KP-03) | Y/O |
| Chuqurlik | 450–580 | 450–580 | EN 1116: stoleshnitsa chuqurligi ≥600 (modul chuqurligi berilmagan — tasdiqlanmadi) | 450–580 | Stoleshnitsa 600 = korpus 450–580 + chiqish. Ziddiyat yo'q | O |
| Sokl bo'yi | 80–100 (sex json detallar) | 80–100 (oshxona 85–100, n=298) | EN 1116 ≥80 (tozalash); EN 14749 ≥100 (CATAS, "ko'chma baza") | 80–100 | EN 14749 raqami CATAS xulosasi orqali, asl matn ko'rilmadi | O |

### 3.2 Oshxona ustki (SP-K-002/003/005/010/011/025…; MC-KU-*)
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Ziddiyat izohi | Ish. |
|---|---|---|---|---|---|---|
| Eni | 300–540 / 600–1070 | shu | EN 1116: nominal 400/500/600/900 | 300–540 / 600–1070 | — | Y |
| Bo'yi | 460–1140 | 468–1134 (n=910) | EN 1116: ish yuzasi–osma shkaf tubi ≥450. Z=1450 (USTKI_Z) bilan tekshiruv: 1450−900=550 ≥450 | 460–1140 | Chegara emas, QOIDA: Z ≥ ish balandligi + 450 (850→1300, 900→1350, 950→1400) | O |
| Chuqurlik | 290–400 | 290–400 | **EN 1116: 310–400** (CATAS) | 300–400 | **ZIDDIYAT:** sex 290 (< 310). Katalogdagi MC-KU-* standart d=300 | O |

### 3.3 Penal (SP-K-006/013/015/020/021; MC-KK-01)
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Izoh | Ish. |
|---|---|---|---|---|---|---|
| Bo'yi | 2030–2660 | 2034–2653 (n=118) | tasdiqlanmadi | 2030–2660 | n kichik | O |
| Chuqurlik | 290–660 (fragments SP-K-020/021: 550–650) | 292–660 | tasdiqlanmadi | 290–660 | Fragments torroq (faqat 550–650) — import paytida qaysi biri ishlaydi tekshirilsin | O |

### 3.4 Shkaf / kupe / garderob (SP-W-*, SP-G-*, MC-SH-*)
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Ziddiyat izohi | Ish. |
|---|---|---|---|---|---|---|
| Bo'yi | 1780–2590 | 1784–2586 (n=323) | ГОСТ 13025.1-85 b.2.3: shtanga yuqori qirrasi polga nisbatan ≤1900 (maxsus tushirgich bo'lsa ko'p) — [prg.kz](https://prg.kz/m/amp/document/30202816) | 1780–2590 | Bo'y uchun raqamli chegara yo'q; shtanga qoidasi bo'yni cheklamaydi | O |
| Chuqurlik | 350–600 (fragments SP-W-*: 550–700) | 352–600 | ГОСТ 13025.1: shapka bo'limi ≥240; kiyim bo'limi chuqurligi chizmada — tasdiqlanmadi | 350–600 | Fragments 700 gacha ruxsat beradi, sex 600 dan oshmaydi | P |
| Eni | fragments: 800–2400 (kupe 1200–2800) | tom p5–p95: 432–2007 (n=442, past) | tasdiqlanmadi | o'zgarmaydi | Sexda eni modul bo'yicha emas, eshik soni bo'yicha | P |
| Eshik eni | — | 314–598 (n=1026) | — | 310–600 | Eshik eni = modul eni ≈ eshik+2…4 | Y |
| Sokl | — | 84–100 (n=505) | EN 1116/EN 14749 yuqoridagidek | 80–100 | — | O |

### 3.5 Krovat (matras asosi: MC-KR-02…05; SP-BD-001…004)
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Ziddiyat izohi | Ish. |
|---|---|---|---|---|---|---|
| Asos uzunligi | 1860–2050 (std 2000); SP-BD-001 d: 1900–2200 | tub: 1533–2161, mediana 2058 (n=15; bolalar aralash); yon rama: 1936–2154, mediana 2100 (n=31) | ГОСТ 13025.2-85 3-jadval: bir kishilik L 1860–2050 — [kontur-extern](https://www.kontur-extern.ru/info/normativ/document/9/300103-mebel-bytovaya-funktsionalnye-razmery-mebeli-dlya-sideniya-i-lezhaniya-gost-13025-2-85) | 1860–2050 | **ZIDDIYAT:** sex tub 2093–2100 (4 ta); SP-BD-001 2200 gacha. Ikki kishilik uzunligi ГОСТ matnida ajratilmagan | Y (ГОСТ) / P (sex) |
| Asos eni | 700–1800 | tub eni: 592–1794, tipik 890–906 | ГОСТ: bir kishilik 700/800/900; ikki kishilik 1100…1800 (qadam 100) | 700–1800 | Mos | Y |
| Bolalar (0–3 yosh) asosi | L 900–1400, W 500–800 (hech bir modulga ulanmagan) | — | ГОСТ 19301.3-2022 (repo yozuvi, shu sessiyada QAYTA TEKSHIRILMADI) | o'zgarmaydi | MC-KR-01 geometriyasi aniq emas | O |
| Yuqori (ikki qavatli) krovat | — | — | EN 747-1: 600 dan baland yotoq asosiga tegishli; to'siq matras ustidan ≥160 (sotuvchi izohi, asl matn ko'rilmadi) | — | EN 747-1:2024 — joriy nashr (BSI); raqamlar tasdiqlanmadi | P |
| EN 1334 / EN 1725 | — | — | EN 1334 — o'lchash usuli va tolerantlik, nominal o'lcham jadvali topilmadi; EN 1725 — xavfsizlik (EVS ro'yxatida 2023-12-15 dan bekor deb ko'rsatilgan) | — | Raqam yo'q | — |

### 3.6 Parta (MC-PA-01, MC-PA-02) — stol usti
| O'lcham | Katalog | Sex 5–95% | Jahon standarti | TAKLIF | Ziddiyat izohi | Ish. |
|---|---|---|---|---|---|---|
| Stol usti balandligi | 460–820 (std 460/520/580/640/700/760/820) | oyoq paneli: 689–784 (n=25), eng ko'p 784, 734 | ГОСТ 11015-93 2-jadval: 460/520/580/640/700/760/820 (1–7 raqam) — [prg.kz](https://prg.kz/m/amp/document/30191911). EN 1729-1 (3–6 o'lcham belgisi): 590/640/710/760 — ikkilamchi manba (Rotherham qo'llanmasi, OCR), qolgan belgilar tasdiqlanmadi | 460–820 | ГОСТ va EN 1729-1 10 mm gacha farq qiladi (580 va 590; 700 va 710). Sex faqat 734–784 (katta o'quvchi) | Y (ГОСТ) / O (EN) |
| Stol usti uzunligi | 600–1200 | tom: mediana 1200, eng ko'p 1200 (12) va 1600 (12); n=49 | ГОСТ 11015: bir o'rinli 600, ikki o'rinli 1200 | 600–1200 | **ZIDDIYAT:** sex 1600/1800 (Парта_1800, parta_1600 buyurtmalari) | Y / P |
| Stol usti chuqurligi | min 450, std 500 | 400–610; eng ko'p 550, 420, 400 | ГОСТ: ≥450 (1-raqam), ≥500 (2–7) | min 450 | **ZIDDIYAT:** sex 400/420 < 450 | Y / P |
| Oyoq oralig'i, tizza | — | — | ГОСТ: tizza chuqurligi 300–400, oyoq eni ≥420–450 | (keyingi qadam) | Modulga hozir ulanmagan | Y |

### 3.7 Tumba / TV zona (SP-SH-002, SP-BD-005/006)
| O'lcham | Katalog | Sex 5–95% (past tumba, n=116 detal / 20 buyurtma) | Jahon standarti | TAKLIF | Izoh | Ish. |
|---|---|---|---|---|---|---|
| Bo'yi | SP-SH-002 h=500, min/max yo'q | past guruh 312–690 (mediana 350); baland guruh 1584–2624 (n=41) | tasdiqlanmadi (tumba/TV uchun EN o'lcham standarti topilmadi) | 310–700 (past); baland — alohida tur | Ikki modali taqsimot — turga ajratish kerak | P |
| Chuqurlik | SP-SH-002 d=400 | 264–435 | tasdiqlanmadi | 270–440 | — | P |

### 3.8 Prixoshka (SP-D-002 panel, SP-W-008 poyabzal)
| O'lcham | Katalog | Sex 5–95% (n=39 detal, 8–16 buyurtma) | Jahon standarti | TAKLIF | Izoh | Ish. |
|---|---|---|---|---|---|---|
| Chuqurlik | SP-D-002: 200–300; SP-W-008: 350 | 277–510 (mediana 450) | ГОСТ 13025.1: shapka bo'limi ≥240 | 280–510 | Sex prixoshka KORPUS (450), katalog — osma panel (250): turli mahsulot | P |
| Bo'yi | SP-D-002 h=1400 | past guruh 368–968 (mediana 700); baland 1368–2534 | ГОСТ: ilgich ≤1900 polga nisbatan | past 370–970; baland 1370–2530 | Ikki modali | P |

### 3.9 Yozuv / ofis stoli (SP-T-001/004/005/007, SP-O-010)
| O'lcham | Katalog | Sex | Jahon standarti | TAKLIF | Izoh | Ish. |
|---|---|---|---|---|---|---|
| Balandligi | std 750 | stol alohida o'lchanmagan (Ofis/stol: 492 detal aralash) | EN 527-1:2011: o'tirib ishlash 650–850 (test hisoboti xulosasi, aniqlanmagan). Ish usti eni/chuqurligi, 1200×800 — **tasdiqlanmadi** | o'zgarmaydi | Raqamni asl matndan olish kerak (DIN/BSI) | P |
| Eni / chuqurligi | w 800–2000 / d 600–900 | — | tasdiqlanmadi | o'zgarmaydi | — | P |

## 4. Egasi qaror qilishi kerak (5 ta savol)
1. **Ustki shkaf chuqurligi min:** EN 1116 = 310, sex = 290, katalog standart modullari = 300. Chegara 300 (taklif), 310 (qat'iy standart) yoki 290 (sex)?
2. **Krovat uzunligi:** ГОСТ max 2050, sexda 2100 ham bor (SP-BD-001 da 2200). Max 2050 yoki 2100 qilamizmi?
3. **Parta stol usti:** ГОСТ 600/1200 va chuqurlik ≥450; sex 1600/1800 va chuqurlik 400/420 qiladi. Standartni qat'iy qilamizmi yoki "kengaytirilgan" (1800) belgisi bilan sex amaliyotiga ruxsat beramizmi?
4. **Sokl:** EN 1116 ≥80, EN 14749 (CATAS) ≥100. Min 80 yoki 100?
5. **Yo'q turlar:** 6 ta kutilgan tur ichida nimadan boshlaymiz? Sexda eng ko'p: ramkali ko'zgu (10 buyurtma), tumba (13–20), prixoshka (8–16). Qolganlari 1–4 buyurtma — kutamizmi?

## 5. Standart topilmagan joylar
Penal, tumba/TV, prixoshka, ofis stoli o'lchamlari, shkaf chuqurligi (ГОСТ chizmasida), EN 1116 modul chuqurligi, EN 1729-1 to'liq jadval (faqat 3–6 belgi), EN 527-1 ish usti eni/chuqurligi, EN 1334 nominal o'lchamlar, ГОСТ 35278-2025 (yangi). Sotib olinadigan matnlar: EN 1116:2018, EN 1729-1:2015, EN 527-1:2011, CEN/TR 14073-1.

## 6. Manbalar
EN 1116:2018 — CATAS xulosasi https://catas.com/uploads/media/unien1116-eng.pdf · ГОСТ 13025.1-85 https://prg.kz/m/amp/document/30202816 · ГОСТ 13025.2-85 kontur-extern · ГОСТ 11015-93 https://prg.kz/m/amp/document/30191911 · EN 1729-1 CATAS https://catas.com/uploads/media/catas-chairs-tables-school-eng.pdf · EN 527-1 (DIN/BSI sahifalari, faqat qamrov) · EN 12521:2023 https://genorma.com/en/standards/en-12521-2023 · EN 1334 https://www.evs.ee/en/evs-en-1334-1999 · EN 747-1 https://knowledge.bsigroup.com/ · sex: Smart3D_malumot/Sex_olchamlari_taklif.xlsx.
