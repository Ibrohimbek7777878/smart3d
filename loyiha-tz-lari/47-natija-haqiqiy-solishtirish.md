# TZ-47 natijasi — 1-bosqich: bizning narx hisobi ↔ ERP dagi HAQIQIY sotuv (tahlil)

**Sana:** 2026-10-22 · **Holat:** 1-bosqich BAJARILDI (faqat tahlil; mavjud kod va ma'lumot fayllari o'zgarmadi) · **Skript:** `scripts/haqiqiy_solishtir.mjs` · **Muallif:** agent/haqiqiy
**Maxfiylik:** mijoz ismi/telefoni yo'q — faqat buyurtma id (3770 … 4250). Maxfiy paket (`Smart3D_malumot`, `Smart3D_toplam_2026-10-16`) repoda yo'q: skript uni asosiy repo papkasidan o'qiydi (`SMART3D_ASOSIY=…`), yo'q bo'lsa jimgina o'tkazib yuboradi (exit 0).

## 1. Nima o'lchandi (qisqa)

14 ta buyurtma (ERP sotuv qatorlari: `haqiqiy-buyurtmalar-2026-10-22.json`). Har biri uchun ilovadagi yo'l bilan: `.b3d` → `daraxt` → `bazisLoyiha` (bazis/loyiha.js, bazis/teshik.js) → `createHisob().recalc` (cutlist → nestProject → productionCost, `narxSukut` stavkalar, plita narxi = ERP `display_price_uzs` = tannarx, ustama 35%).
Plita sifatida **haqiqiy sotilgan SKU** olindi: Bazis plita guruhi → sotilgan SKU moslashi GibLab natijalari (`.xlsx`, `.project`) + dekor nomi + detal soni bilan (usuli skript chiqishida har guruhda yoziladi; "soni" — taxminiy moslik). ERP da sotilmagan guruh (mijoz materiali, stoleshnitsa) narxga kiritilmadi.
Taqqoslash: (a) har SKU varaq soni (biz / ERP / GibLab), (b) kromka m turlar bo'yicha, (c) raspil list soni, (d) prisadka turlari, (e) Bazis xizmati, (f) jami (tannarx va 35% li mijoz narxi — ERP sotuv va `price_list_uzs` bilan). "ERP tannarx-bazasi" = ERP sotuvi, faqat plita qatorlari `display_price_uzs` bo'yicha qayta narxlangan (kromka materiali va xizmatlar sotuv narxida). Furnitura ERP sotuvida 14/14 yo'q — taqqoslashga kirmadi. Ma'lumot tekshiruvi: ERP qatorlari yig'indisi `sale_total` ga 14/14 buyurtmada aynan teng (skript `k`); farq qismlarga bo'linishi jami farqqa aynan teng (`g2`, 14/14 "ok").

**Halol chegara (TZ maqsadi ≤ 3%).** Maqsad **erishilmadi**: mijoz narxi bo'yicha o'rtacha abs(xato) 38,9% (mediana 35,1%). Eng yaxshi (oracle) stsenariyda ham 5,4% (4-bo'lim). Shuningdek TZ-36 kalibrovkasi shu 14 ta buyurtmaning **12 tasida** o'tkazilgan (3975 va 4204 dan tashqari hammasi) — prisadka (ЕВРО/МЕТКА/РУЧКА) va kromka chiqiti natijalari "in-sample" (optimistik); mustaqil tekshiruv faqat 3975 va 4204, ikkalasi ham mijoz plitasi.

## 2. Jadval: buyurtma × komponent

| buyurtma | LDSP varaq (biz/ERP/Gib) | HDF varaq | kromka m (biz+8%/ERP/Gib) | raspil LDSP list (biz/ERP) | raspil HDF (biz/ERP) | prisadka 7 tur so'm (biz/ERP) | Bazis so'm (biz 3000×/ERP) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3770 | 9 / 9 / 9 | 1 / 1 / 1 | 80.8 / 78 / 74.8 | 9 / 9 | 1 / 1 | 249 800 / 273 200 | 180 000 / 50 000 |
| 3808 | 8 / 8 / 8 | 2 / 2 / 2 | 113.5 / 109 / 105.1 | 8 / 8 | 2 / 2 | 211 800 / 210 000 | 240 000 / 288 000 |
| 3812 | 4 / 3 / 3 | 1 / 1 / 1 | 41.9 / 42 / 38.8 | 4 / 3 | 1 / 1 | 86 000 / 74 000 | 81 000 / 100 000 |
| 3832 | 25 / 24 / 24 | 5 / 5 / 5 | 259 / 378 / 359.7 | 25 / 24 | 5 / 5 | 927 700 / 912 400 | 1 215 000 / 228 000 |
| 3860 | 11 / 10 / 10 | 2 / 1 / 1 | 164.8 / 188 / 179 | 11 / 10 | 2 / 1 | 437 000 / 456 600 | 459 000 / 50 000 |
| 3877 | 7 / 6 / 6 | 2 / 1 / 1 | 113.3 / 112 / 104.9 | 7 / 6 | 2 / 1 | 297 800 / 334 000 | 324 000 / 384 000 |
| 3888 | 5 / 4 / 4 | 2 / 1 / 1 | 66.9 / 68 / 64.1 | 5 / 4 | 2 / 1 | 189 300 / 249 400 | 210 000 / 100 000 |
| 3926 | 3 / 3 / 3 | 1 / 0 / 0 (ERP'da yo'q) | 37.5 / 38 / 34.7 | 3 / 3 | 1 / 0 | 113 700 / 121 800 | 147 000 / 112 000 |
| 3936 | 7 / 5 / 5 | 2 / 1 / 1 | 98.9 / 97 / 97.5 | 7 / 5 | 2 / 1 | 351 900 / 407 800 | 417 000 / 400 000 |
| 3975 | mijoz plitasi (ERP'da yo'q) | 1 / 0 / — (ERP'da yo'q) | 44.5 / 43 / — | 3.14 / 2 | 0 / 0 | 43 500 / 118 200 | 105 000 / 50 000 |
| 3978 | 13 / 13 / 13 | — | 176.2 / 177 / 167 | 11 / 11 | 2 / 2 | 901 900 / 1 365 400 | 585 000 / 516 000 |
| 4034 | 8 / 5 / 7.87 | 1 / 1 / 1 | 123.3 / 123 / 114.2 | 8 / 7 | 1 / 1 | 287 900 / 287 400 | 324 000 / 392 000 |
| 4204 | mijoz plitasi (ERP'da yo'q) | 1 / 0 / 0 (ERP'da yo'q) | 20.6 / 17 / 15.7 | 2 / 1 | 1 / 0 | 76 100 / 72 800 | 42 000 / 52 000 |
| 4250 | 8 / 7 / 9 | 2 / 0 / 0 (ERP'da yo'q) | 168.3 / 178 / 217.8 | 10 / 10 | 2 / 0 | 641 400 / 654 800 | 567 000 / 0 |

| buyurtma | tannarx biz | tannarx ERP-baza | farq | mijoz 35% biz | ERP sotuv | farq | ERP price_list | farq | avtomoslash bilan (ERP sotuvga) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3770 | 3 706 997 | 3 494 093 | +6% | 4 597 359 | 4 285 200 | +7% | 4 535 200 | +1% | +17% |
| 3808 | 4 403 404 | 4 431 728 | -1% | 5 489 709 | 4 728 000 | +16% | 4 978 000 | +10% | +35% |
| 3812 | 1 967 329 | 1 589 892 | +24% | 2 469 807 | 1 731 000 | +43% | 1 831 000 | +35% | +36% |
| 3832 | 12 723 077 | 11 925 451 | +7% | 15 637 898 | 13 122 900 | +19% | 13 847 900 | +13% | +19% |
| 3860 | 6 976 006 | 5 628 551 | +24% | 8 672 053 | 6 438 800 | +35% | 6 638 800 | +31% | +33% |
| 3877 | 4 303 065 | 3 787 995 | +14% | 5 298 570 | 4 101 800 | +29% | 4 226 800 | +25% | +1% |
| 3888 | 2 714 748 | 2 135 233 | +27% | 3 338 745 | 2 463 200 | +36% | 2 583 200 | +29% | +54% |
| 3926 | 1 674 453 | 1 485 414 | +13% | 2 057 218 | 1 631 800 | +26% | 1 706 800 | +21% | +63% |
| 3936 | 4 181 929 | 3 281 665 | +27% | 5 115 185 | 3 500 800 | +46% | 3 650 800 | +40% | +66% |
| 3975 | 601 651 | 426 200 | +41% | 650 651 | 426 200 | +53% | 426 200 | +53% | +53% |
| 3978 | 6 813 433 | 7 087 138 | -4% | 8 247 992 | 7 643 400 | +8% | 7 888 400 | +5% | +11% |
| 4034 | 6 154 480 | 4 711 097 | +31% | 7 775 288 | 4 929 200 | +58% | 5 004 200 | +55% | +23% |
| 4204 | 451 595 | 230 800 | +96% | 500 595 | 230 800 | +117% | 230 800 | +117% | +117% |
| 4250 | 5 290 968 | 4 219 958 | +25% | 6 316 195 | 4 132 500 | +53% | 4 702 500 | +34% | +60% |

Izoh: Bazis ustuni — ilovaning Bazis xizmati (onlayn, 3000/detal); ERP — Bazis4/Bazis5. "farq" = biz ÷ ERP − 1. 3975, 4204 — plita ERP da sotilmagan (mijoz materiali); 3926, 3975, 4204, 4250 da Bazis'da HDF bor, ERP sotmagan.

## 3. O'rtacha va mediana abs(xato) komponentlar bo'yicha

| komponent | n | o'rtacha abs(xato) | mediana abs(xato) | o'rtacha (belgili) | yig'indi | eng katta (id) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| plita varaq (HDF'siz, sotilgan SKU lar) | 12 | 17% | 12.1% | +17% | +11% | +60% (4034) |
| plita varaq (GibLab formatida) | 12 | 17.7% | 12.1% | +18% | +12% | +60% (4034) |
| raskroy ALGORITMI: GibLab detallari (kerf 4) ↔ GibLab list | 13 | 9% | 0% | +9% | +5% | +57% (4204) |
| raskroy ALGORITMI: GibLab detallari (kerf 4,4) ↔ GibLab list | 13 | 9.7% | 1.6% | +10% | +6% | +57% (4204) |
| raskroy ALGORITMI: min(bssf, strip) ↔ GibLab list | 13 | 9% | 0% | +9% | +5% | +57% (4204) |
| HDF varaq (ERP sotuvida bor bo'lsa) | 9 | 44.4% | 0% | +44% | +29% | +100% (3860) |
| kromka m (hisobli, +8% chiqit) | 14 | 6.3% | 2.8% | -1% | -8% | -31% (3832) |
| kromka m (chizmadagi sof) | 14 | 10.3% | 7.7% | -9% | -15% | -37% (3832) |
| kromka m: GibLab (sex) m × 1,08 ↔ ERP (chiqit qoidasi sexga nisbatan) | 13 | 4.7% | 1.9% | +4% | +6% | +32% (4250) |
| kromka m: Bazis chizmadagi sof ↔ GibLab (sex) m | 13 | 8.5% | 2.3% | -5% | -14% | -33% (3832) |
| detal soni: Bazis panel ↔ GibLab detal | 13 | 10% | 8.5% | -4% | -7% | +40% (4204) |
| raspil list (LDSP, 2/3-daraja) | 14 | 21.5% | 12.1% | +21% | +10% | +100% (4204) |
| raspil list (HDF, 1-daraja) | 10 | 40% | 0% | +40% | +25% | +100% (3860) |
| prisadka ЕВРО soni | 14 | 3.1% | 0% | -3% | -1% | -43% (3975) |
| prisadka ПЕТЛЕ soni | 14 | 0% | 0% | 0% | 0% | — |
| prisadka ПОЛКАДЕРЖ soni | 11 | 0% | 0% | 0% | 0% | — |
| prisadka МЕТКА soni | 10 | 28.7% | 26.3% | +0% | -2% | +71% (3832) |
| prisadka РУЧКА soni | 10 | 10% | 0% | -10% | -10% | -100% (4034) |
| prisadka ШКАНТ soni | 7 | 97.8% | 100% | -17% | -26% | +167% (3975) |
| prisadka ЭКСЦ soni | 6 | 15.2% | 0% | -15% | -32% | -91% (3975) |
| prisadka jami so'm (modellangan 7 tur) | 14 | 8.2% | 1.7% | -2% | +1% | -63% (3975) |
| Bazis xizmati so'm (onlayn 3000/detal) | 13 | 143.7% | 19.2% | +130% | +59% | +818% (3860) |
| Bazis xizmati so'm (oflayn 6000/detal) | 13 | 360.3% | 126.7% | +360% | +218% | +1736% (3860) |
| Bazis xizmati so'm (NOMZOD qoida: 4000 × HDF'siz panel) | 13 | 185.5% | 51.2% | +186% | +99% | +1020% (3860) |
| JAMI tannarx (ustamasiz) ↔ ERP tannarx-bazasi | 14 | 24.2% | 23.8% | +24% | +14% | +96% (4204) |
| JAMI mijoz narxi (35%) ↔ ERP sotuv | 14 | 38.9% | 35.1% | +39% | +28% | +117% (4204) |
| JAMI mijoz narxi (35%) ↔ ERP price_list | 14 | 33.5% | 29.9% | +34% | +22% | +117% (4204) |
| JAMI tannarx ↔ ERP sotuv | 14 | 20.2% | 12.2% | +15% | +4% | +96% (4204) |
| JAMI mijoz narxi (35%) ↔ ERP sotuv — ilovaning HOZIRGI avtomoslashi bilan (sotilgan SKU o'rniga) | 14 | 42% | 35.2% | +42% | +29% | +117% (4204) |
| JAMI tannarx ↔ ERP tannarx-bazasi — ilovaning HOZIRGI avtomoslashi bilan | 14 | 27.8% | 20.2% | +26% | +15% | +96% (4204) |

SKU darajasida (33 ta sotilgan SKU): LDSP/Kashtan/LEGE/LMDF 24 tadan 15 tasi aniq mos, 9 tasida bizda ko'p (7 tasida +1 list), kam — 0; HDF 9 tadan 5 tasi aniq, 4 tasida +1 list. Algoritm (GibLab ning aniq detallari bilan, 33 material): 25 tasida teng, 6 tasida +1 list, 1 tasida kasr (qoldiq), 1 tasida kam.

## 4. Eng katta 10 chetlanish va ularning sababi

| # | buyurtma | sabab | farq so'm | ERP sotuv jami | ERP sotuvga % |
| --- | ---: | --- | ---: | ---: | ---: |
| 1 | 4034 | LDSP/Kashtan/LEGE varaq soni | 1 764 961 | 4 929 200 | +36% |
| 2 | 3832 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 1 610 443 | 13 122 900 | +12% |
| 3 | 3832 | Bazis xizmati | 987 000 | 13 122 900 | +8% |
| 4 | 3936 | LDSP/Kashtan/LEGE varaq soni | 922 755 | 3 500 800 | +26% |
| 5 | 4034 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 904 311 | 4 929 200 | +18% |
| 6 | 4250 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 895 068 | 4 132 500 | +22% |
| 7 | 3978 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 878 297 | 7 643 400 | +11% |
| 8 | 3860 | LDSP/Kashtan/LEGE varaq soni | 828 954 | 6 438 800 | +13% |
| 9 | 3808 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 790 033 | 4 728 000 | +17% |
| 10 | 3860 | plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 622 914 | 6 438 800 | +10% |

Farq qismlarga bo'lingan (yig'indisi jami farqqa aynan teng; skript `g2`). Σ ERP sotuv, Σ biz va sabablar ulushi:

| sabab | o'rtacha farq so'm | o'rtacha farq % (ERP sotuvga) | o'rtacha abs(farq) % | median abs(farq) % | yig'indi % (Σfarq/ΣERP) |
| --- | ---: | ---: | ---: | ---: | ---: |
| plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi) | 521 195 | 10.6% | 10.6% | 11.8% | 12.3% |
| LDSP/Kashtan/LEGE varaq soni | 413 079 | 10.4% | 10.4% | 7.2% | 9.7% |
| HDF varaq soni (ERP'da sotilgan) | 52 866 | 1.4% | 1.4% | 0% | 1.2% |
| HDF: Bazis'da bor, ERP'da sotilmagan | 67 500 | 10.5% | 10.5% | 0% | 1.6% |
| stoleshnitsa (ilova narxi ↔ sotilgan) | 11 244 | 0.2% | 0.2% | 0% | 0.3% |
| kromka (metr, tur, chiqit) | -57 194 | -0.2% | 1.6% | 0.4% | -1.3% |
| raspil list soni | 44 716 | 4% | 4% | 1.4% | 1.1% |
| raspil stavkasi (stanok: Altendorf/Holzma, maxsus narx) | 43 000 | 1% | 1% | 0.8% | 1% |
| prisadka ОВАЛ/ПАЗ (modellanmagan) | -53 414 | -1% | 1% | 0.3% | -1.3% |
| prisadka (7 modellangan tur) | 1 843 | -1% | 1.6% | 0.1% | 0% |
| Bazis xizmati | 155 286 | 3% | 4.3% | 2.6% | 3.7% |
| boshqa (noma'lum ERP xizmat) | 0 | 0% | 0% | 0% | 0% |
| JAMI (biz mijoz − ERP sotuv) | 1 200 119 | 38.9% | 38.9% | 35.1% | 28.3% |

Σ ERP sotuv = 59 365 600 so'm (14 buyurtma); Σ biz mijoz narxi (furnitura'siz) = 76 167 265 (+28,3%); Σ biz tannarx = 61 963 135; Σ ERP tannarx-bazasi = 54 435 215 (+13,8%).

Kumulyativ stsenariylar — har tuzatish qo'shilgach jami xato qanday kamayadi (oracle = ERP/GibLab ma'lumotini bilgan holda):

| stsenariy | o'rtacha abs(xato) | mediana abs(xato) | yig'indi (Σfarq/ΣERP) |
| --- | ---: | ---: | ---: |
| 0. hozirgi holat (35% ustama, sukut stavka) | 38.9% | 35.1% | +28% |
| 1. plita narxi = price_list_uzs (ustama o'rniga) — egasi qarori | 32.7% | 31.3% | +21% |
| 2. + raspil stavkasi stanokka mos (Altendorf/Holzma) | 31.9% | 29.5% | +20% |
| 3. + HDF faqat ERP'da sotilganda hisoblansin (Bazis'da bor HDF ni belgilash) | 21.4% | 23.3% | +18% |
| 4. + Bazis xizmati ERP kabi [oracle: ERP qoidasi o'lchanmadi] | 19.2% | 19.4% | +15% |
| 5. + ОВАЛ/ПАЗ prisadka modellansin [oracle: Bazis manbasi o'lchanmadi] | 19.8% | 20.7% | +16% |
| 6. + varaq soni ERP/GibLab kabi [oracle: nesting + Bazis→sex versiya mosligi] | 5.4% | 4.3% | +4% |

## 5. Tizimli chetlanishlar: sabab (o'lchangan dalil) va tuzatish taklifi

Ustuvorlik — Σ ERP sotuvdagi ulush bo'yicha (jadval 4-bo'limdagi "yig'indi %" ustuni). Hamma taklif 2-bosqich uchun; hech qaysisi hozir kodga kiritilmadi.

| # | Tizimli sabab (dalil) | Tuzatish taklifi (fayl/qoida) | Kutilgan ta'sir (o'lchangan) |
| --- | --- | --- | --- |
| 1 | **Plita ustama siyosati.** ERP real ustama vaznli +14,1% (34 qator; SKU mediana +13,9%, −14,8…+33,3%, 18 ta SKU), `price_list_uzs` +22,4%; bizniki 35% → plita qatorlarida +18% (price_list bilan +7%, ustamasiz −12%). 4250 da ERP narxi qo'lda tushirilgan (7/20 qator standartdan farqli, kamida −238 600 so'm; plitalar 300/320/340 ming). | Egasi qarori (35% siyosat TZ-47 bo'yicha o'zgarmaydi): variant — mijoz narxi `price_list_uzs` dan; yoki ustama SKU guruhi bo'yicha. | Σ farq 7,30 mln → 2,89 mln; jami mean abs(xato) 38,9% → 32,7%, Σ +28% → +21% (g5, 1-qadam). |
| 2 | **Plita varaq soni: nesting.** GibLab ning aniq detallari bilan ham 6/33 materialda +1 list (GibLab to'ldirishi 83,5–93,8%: 3860 HDF, 3877 HDF va LEGE, 3888 Цемент, 3978 Серый графит, 4250 Белый). Kerf 4,4 yaxshilamaydi (o'rtacha 9,7%, kerf 4 da 9%); `strip` rejimi hech bir materialda yaxshi emas (min(bssf, strip) = bssf). `bestPlan` allaqachon sort×fit×split sinaydi. | `nesting.js`: ko'p-start (tasodifiy tartib) + band (lenta) DP optimallashtirish, GibLab `swMaxturns 6/swComplexBand` ga o'xshash 2 bosqichli kesish. Test: shu 33 material, maqsad ≥ 31 tasida teng. | ≈ 1,76 mln so'm (sinf "nesting" + "bazis-detal+nesting") ≈ 3,0% Σ (3-qator bilan qisman kesishadi). |
| 3 | **Bazis fayli sex versiyasi emas.** Detal soni Bazis/GibLab o'rtacha abs(xato) 10% (Σ −7%); detal maydoni (Bazis ↔ GibLab): 3812 +56%, 3936 LDSP +47% va HDF +143% (sex papkasida 3 ta loyiha fayli), 3860 HDF +47%, 3888 HDF +25%, 4250 +35%; Bazis dekor taqsimoti sexdagidan farqli (3812: 5 detal boshqa dekorda). | UI: import paytida "sex versiyasi bilan farq" ogohlantirishi (GibLab/`.project` yuklansa detal soni/maydon solishtirilsin); narx aniqligi oynasida alohida qator. | Sinf "bazis-detal*" ≈ 2,59 mln ≈ 4,4% Σ (hisobni o'zgartirmaydi, aniqlikni ko'rsatadi). |
| 4 | **Tekstura material almashtirilganda yangilanmaydi (aniq xato).** Bazis'da material "Акрил 18мм тепа корпус" (tur akril), sexda esa Каштан Cream pearl (LDSP, GibLab `txt="false"`, 29 detal). Detal teksturasi import vaqtida Bazis nomidan qo'yiladi (`bazis/loyiha.js`: faqat `ldsp` + `oddiyDekor` → `erkin`), ERP SKU ga almashtirilganda qayta hisoblanmaydi: 29 detal yo'nalishli (en 18, uzunlik 11) bo'lib 4 list, `erkin` bilan 3 list (GibLab 3). `oddiyDekor('Каштан 18мм Cream pearl')` = true. | `web/src/services/erpMaterial.js bazisAlmash` (yoki `bazis/loyiha.js`): material almashtirilganda `tekstura` ni yangi material nomiga qarab qayta aniqlash. | 3860 da −1 list = −828 954 so'm ≈ 1,4% Σ; boshqa buyurtmalarda yon ta'sir tekshirilsin (almashtirish qo'llangan joylarda). |
| 5 | **Qoldiq (offcut) ishlatilishi.** 4034: GibLab 11 ta (Белый, 2,54 list ekvivalenti) va 1 ta (Каштан, 0,33) qoldiq bo'lagidan foydalangan; ERP faqat yangi list sotadi (Белый: ERP 2, GibLab 4,54, biz 4). | Qoldiq ombori (nesting `remnants` natijasi bor): "qoldiqdan foydalanish" belgisi/ro'yxati; hozir — narx aniqligida ogohlantirish. | 4034 da −1,76 mln ≈ 3,0% Σ (faqat 1/14 buyurtma — umumlashtirib bo'lmaydi). |
| 6 | **Sotilgan SKU formati ≠ kesilgan.** 3936: ERP 5,0325 (2750×1830) sotgan, sex 4,575 (2500×1830) dan kesgan; Bazis'da 3 dekor guruhi (jumladan "Frente") bitta SKU ga yig'ilib 7 list. | Almashtirish oynasida "kesish formati" alohida tanlansin; moslashda format farqi aniq ko'rsatilsin. | 3936 da −0,92 mln ≈ 1,6% Σ. |
| 7 | **HDF: Bazis'da bor, ERP'da sotilmagan** (3926, 3975, 4204, 4250; GibLab da ham 3926 va 4250 da HDF kesilmagan). | Orqa devor HDF ni "mijozda/kerak emas" deb belgilash (`mijozMat` mavjud, UI tugma) — hozir sukut: hisoblanadi. | −945 000 so'm ≈ 1,6% Σ (tez-tez uchraydi: 4/14). |
| 8 | **Bazis xizmati.** Ilova Bazis3/Bazis6 (3000/6000), ERP Bazis4/Bazis5 (4000/5000); ERP soni N: 3808, 3812, 4204 da HDF'siz panel soniga teng, 3877 va 4034 da ±2%, lekin 3832 da 57 (panel 385), 3888 da 25 (62), 3926 da 28 (46), 3936 da 100 (129), 3978 da 129 (195); 3770, 3860, 3975 da doimiy 10×5000; 4250 da yo'q. "4000 × HDF'siz panel" qoidasi rad etildi (mean 185%). | Stavkani ERP bilan moslash (Bazis4/Bazis5); N qoidasi aniqlanmaguncha sukut o'chiq (S3) va qo'lda son kiritish. | Onlayn: mean abs(xato) 143,7%, mediana 19,2%, Σ +59%; Σ farq 2,17 mln ≈ 3,7% Σ ERP sotuv. |
| 9 | **Raspil stavkasi.** Ilova Holzma (43 000 / HDF 25 000); 3770, 3860, 3888, 3978, 4034, 4204 da ERP Altendorf (33 000 / 18 000 / 38 000), 4250 da aralash maxsus narx. | Narx panelida stanok tanlovi (Altendorf 1/2/3 stavkalari `sukut_narx` da bor). | −602 000 so'm ≈ 1,0% Σ. |
| 10 | **Prisadka ОВАЛ/ПАЗ modellanmagan.** ERP 8/14 buyurtmada Σ 747 800 so'm (3978 da 101 ta = 471 000, buyurtmaning 6,2%). Bazis manbasi: 3860 da "Флянец овальная" ×2 bor (ERP ОВАЛ 3 ta — taxminiy mos), 3978 (101 ta) uchun mos Bazis obyekti topilmadi. | Avval Bazis→ОВАЛ/ПАЗ manbasini aniqlash (o'lchanmadi), keyin `bazis/teshik.js` + `narxStavka.js` TESHIK_TURLARI. | +747 800 (hozir −1,3% Σ). |
| 11 | **Bazis materialini ERP SKU ga avtomoslash** (`plitaMoslash.bazisniERPga`): 26 plita guruhidan 2 tasi to'g'ri (8%), 9 tasi ishonchli-lekin-noto'g'ri (6 tasida dekor bir xil, format boshqa: Bazis 4,575/4,6кв ↔ sotilgan 5,0325; 3 tasida sex dekorni almashtirgan: 3832, 3978, 4250), 1 nomzod, 14 "yo'q" — ko'pi vaqtinchalik nom (4 buyurtmada "Kronospan Белый гладкий", sotilgan dekorlar boshqa). | Format farqi ("4,575" ↔ "5,0325") ni "aniq" deb hisoblamaslik — nomzod sifatida ko'rsatish (6 holatni tuzatadi); qolganida foydalanuvchi tanlovi (Almashtirish) majburiy — qoida bilan hal bo'lmaydi. | Avtomoslash bilan jami mean abs(xato) 42,0% (sotilgan SKU bilan 38,9%); ba'zi buyurtmada +37 pp (3926: +26% → +63%). |
| 12 | **Kromka.** +8% chiqit sexga nisbatan to'g'ri: GibLab m × 1,08 ↔ ERP o'rtacha 4,7%, mediana 1,9% (12/13 buyurtmada ERP/GibLab 0,995–1,095). Qolgan chetlanish Bazis≠sex: Bazis sof ↔ GibLab Σ −14% (3832 −33%); tur/qalinlik mos emas (3860: ERP 19/0,4 124 m, Bazis 19/1; 4250: ERP 35/1 31 m Bazis'da yo'q; 4034: ERP 42/2 6 m, Bazis 35/1). | `narxStavka`/chiqit o'zgartirilmasin; 3-qator (Bazis≠sex ogohlantirish) hal qiladi. | Σ −800 720 so'm ≈ −1,3% (jami mean ga ta'siri kichik). |
| 13 | **Prisadka 7 tur.** ПЕТЛЕ 14/14, ПОЛКАДЕРЖ 11/11 aniq; ЕВРО 12/14, ЭКСЦ 5/6 aniq (kalibrovka ichida; mustaqil 3975: ЕВРО −43%, ЭКСЦ −91% — ERP = KDT jismoniy son 30 va 46). МЕТКА mean 28,7% (4/14 da ERP umuman yozmagan), ШКАНТ mean 97,8% (qoida ishlamaydi), РУЧКА 4034 da 0 ↔ 8. | Yangi qoida taklif qilinmaydi: o'lchangan ta'sir kichik; ШКАНТ/МЕТКА uchun 3975-tipidagi mustaqil buyurtmalar kerak. | 7 tur so'mi: mean 8,2%, mediana 1,7%, Σ +1% (≈ 0,0% jami). |

**Tavsiya etilgan 2-bosqich bo'linishi** (TZ: kalibrovka 9, tekshiruv 5). K1–K3 allaqachon 12 buyurtmada moslashtirilgan, shuning uchun mustaqil tekshiruvga 3975 va 4204 ni majburan, qolgan 3 tasini (masalan 3926, 3936, 4034) ajratish; 4250 (qo'lda narx) va 3832 (Bazis≠sex) kalibrovkadan chiqarilsin yoki alohida baholansin.

## 6. O'lchanmadi / cheklovlar (taxmin qilinmadi)

- **Bazis xizmati soni qoidasi (ERP N)** — aniqlanmadi (8-qator): nomzodlar sinaldi, hech biri 13 buyurtmaga mos kelmadi.
- **ОВАЛ/ПАЗ manbai** — 3978 (101 ta) uchun Bazis obyekti topilmadi.
- **3975**: GibLab xlsx da yo'q → varaq va kromka GibLab bilan o'lchanmadi; mijoz plitasi formati (sexda "5kv") noma'lum, Bazis nomida 4,575 — raspil 3,14 ↔ 2 sababi aniq emas. **4204**: plita ERP da yo'q (mijoz), GibLab da faqat 3 ta qoldiq bo'lagi — plita summasi taqqoslanmadi. **4250**: ERP da Bazis qatori yo'q; 3 varaq mijoz plitasi (Marsala, Серый графит 5,8, Oq) — mijoz deb olindi.
- **3832**: Серый Графит +1 list; GibLab detallari bilan nesting teng (15), Bazis detallaridan 16 — sababi (o'lcham/tuzilma) ajratilmadi.
- **.LC4 (Homag)**: detal/operatsiya jadvali, varaq xaritasi yo'q (dekodlangan kalitlarda faqat `waste`) → varaq soni GibLab xlsx va `.project` dan; LC4 ichidagi kromka/teshik jadvali o'qilmadi.
- **KDT (jismoniy teshik)** ERP hisobiga mos emas (3770 ЕВРО: ERP 136, KDT 122; 3832: 422 ↔ 120) — ustun faqat ma'lumot uchun (`--tafsilot`/to'liq chiqish).
- **ERP narxi sanasi**: `display_price_uzs` 2026-10-22 dagi, buyurtma sanasidagi emas. Stoleshnitsa 4034: ERP birligi "м2", miqdor 1 — birlik izohi noma'lum; ilova narxi (STOL26-3050, 2 bo'lak = 1 dona) ↔ sotilgan Дана — Σ +417 568 so'm. 3877: Bazis'da 2 dona stoleshnitsa bor, ERP da yo'q → tahlilda mijoz deb olindi (aks holda ilova jamiga +1,73 mln qo'shilardi). Furnitura (Bazis fittings, ERP ga bog'langanlari) Σ 3 761 316 so'm (mijoz narxida) — ERP sotuv hujjatlarida yo'q, jamidan chiqarildi.
- Moslash usullari (43 Bazis guruhi): "nom" (dekor nomi) 10, "hdf" 9, "soni" (detal soniga yaqinlik — taxminiy) 14 + 3 mijoz materialiga, "ortiqcha" 2 (3936 "Frente" guruhlari), HDF sexda/sotuvda yo'q 4, sotuvda plita yo'q 1. "soni" xato bo'lsa SKU darajasi ta'sirlanadi (skript chiqishi `0` jadvalida har guruh ko'rinadi).

## 7. Qayta yurgizish

```
env -u NODE_ENV node scripts/haqiqiy_solishtir.mjs            # to'liq jadvallar (0, a, a2, b … k)
env -u NODE_ENV node scripts/haqiqiy_solishtir.mjs --md --qisqa   # shu hujjatdagi jadvallar
env -u NODE_ENV node scripts/haqiqiy_solishtir.mjs --id=3877 --tafsilot   # bitta buyurtma, hisob satrlari
```
Hamma 14 buyurtma xatosiz yuradi (~10 s). Chiqish: markdown (`--md`) yoki JSON (`--json`).
