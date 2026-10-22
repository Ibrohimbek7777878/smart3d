# TZ-06 — Modullarga teshiklar (prisadka)

**Sana:** 2026-10-15 · **Navbat:** 6 · **Holat:** EVROVINT — BAJARILDI (2026-10-15). Petlya, polka ushlagich, ruchka — BAJARILDI 2026-10-17 (D6, sex fayllaridan; pastda). Eksantrik — kutilmoqda.

## Muammo (tekshirilgan)
- **MebelCity'ning 38 modulida teshik yo'q.** Bazis teshiklari parserda ochilmagan (B3D_PARSER_BILIM 11.5). Shu sababli bu modullarda:
  - prisadka narxi 0;
  - NC va PTP fayllari bo'sh;
  - `holes.json` bo'sh.
- **Umumiy 83 modulda teshiklar shablon** (M4). Holati qayta tekshiriladi.

## Variantlar
- **A. Bazis faylidan o'qish.**
  - O'z dekoderimiz `scripts/` da. `mebelcity-platform` dagi parser faqat o'qiladi, o'zgartirilmaydi.
  - Tadqiqot: 1–2 kun, natija kafolatlanmaydi.
  - Muvaffaqiyatli bo'lsa — teshiklar aynan Bazis'dagidek bo'ladi (eng ishonchli).
- **B. Qoida bo'yicha.** Konfirmat (detal birikmasida), petlya kosasi (eshikda), polka ushlagich (yon devorda).
  - Masofa, diametr va chuqurlik — **faqat sex standartidan (D6)**, o'ylab topilmaydi.
- **Tavsiya:** avval A. Bo'lmasa — B.

## Bajariladigan ishlar (tanlangan variantga ko'ra)
1. Teshiklar `fragments-mc.json` dagi har detalga yoziladi.
   - Koordinata qoidasi mavjud kelishuv bo'yicha: x — en bo'yicha F chetidan, y — uzunlik bo'yicha L chetidan.
2. **Tekshiruv:**
   - har teshik detal ichida;
   - petlya soni eshik soniga mos;
   - zapchast soni teshikka mos (konfirmat soni = teshik soni).
3. **Prisadka narxi** TZ-04 dagi tasdiqlangan stavkadan olinadi.

## Tegadigan fayllar
- `scripts/fr3d_import.py`
- yangi dekoder yoki `scripts/teshik_qoida.py`
- `app/data/fragments-mc.json`
- testlar

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Teshik koordinatasi xato bo'lsa, stanok noto'g'ri teshadi. Shuning uchun stanok fayllari TZ-11 dagi sinovdan (texnolog tasdig'i) oldin `SINOV` belgisida qoladi.
- **Moliya:** prisadka narxi qo'shiladi — faqat tasdiqlangan stavka bilan.
- **Orqaga qaytarish:** `git revert`.

## Egasidan kerak
- Variant tanlash (A yoki B).
- B uchun **D6** — sex konstruktiv standarti: teshik turlari, masofalar, diametrlar.

## Qabul
- 38 modulning har birida teshik bor va hammasi detal ichida.
- Petlya va konfirmat soni zapchast soniga mos.
- Testlar yashil.

## Tadqiqot — 1-qadam (2026-10-15, "1 polk 2 fasad" moduli)
- **Topildi:** Bazis faylida mahkamlagich va furnitura **joylashuvi bilan** saqlangan. Har obyektda `tf` — siljish (Rx, Ry, Rz) va burilish. Obyektlar:
  - `1005` guruh — "Евровинт 7х50 (32) симм", "polkoderjatel nikel" va boshqalar;
  - `1001` — "Линия стыка" (birikish chizig'i);
  - `3001` — har bir dona: "Евро 51мм Алкан", "petlya…", "Ручка 160 мм", "nojka…", "polkoderjatel…".
  - Bitta modulda: 22 ta dona (3001), 12 ta guruh (1005).
- **Ma'nosi:** teshik qayerda bo'lishi faylda bor — evrovint, petlya, polka ushlagich va ruchka joylari.
- **Hali yo'q:**
  1. Ichma-ich guruh koordinatalarini panel koordinatasiga o'tkazish. Parser ierarxiyani soddalashtiradi (11.7) — guruh/dona tartibi ro'yxat ketma-ketligidan tiklanadi.
  2. Har mahkamlagich qaysi panelga tegishli — evrovint ikki panelni bog'laydi: birida yuza teshigi, ikkinchisida chet teshigi.
  3. Teshik diametri va chuqurligi — `THole` hali ochilmagan. Har mahkamlagich turi uchun jadval kerak: egasi tasdiqlaydi yoki ishlab chiqaruvchi ma'lumoti.
- **Keyingi qadam:** 1–2 band — 1 modulda teshiklarni panelga tushirish va 3D'da ko'rib tekshirish. Keyin 38 modulga.


## Tadqiqot — 2-qadam (2026-10-15): fayl daraxti ochildi
- **Tuzilma:** har yozuv `<idx:4><soni:4><tur:1><qiymat>`; tur 0 yoki 8 — ichida `soni` ta yozuv. Shu bilan guruhlar ichma-ichligi to'liq tiklanadi.
  - O'z dekoderimiz: `scripts/bazis_daraxt.py`. 38 faylning hammasi o'qildi.
  - Maydon raqamlari har faylda boshqacha — dekoder ularni har fayl uchun o'zi aniqlaydi.
- **Topilgan xato (tuzatildi):** eski tekis o'qish fayl oxiridagi **amallar tarixini** (undo) ham detal deb sanagan. Tarixda: "Удаление 40 объектов", "Зеркальное отражение", "Замена фурнитуры".
  - Import endi faqat asosiy modelni oladi. 30 modul aynan o'zgarmadi.
  - O'zgargan 8 modul:

| Modul | Detal | Zapchast | Plita, m² | Izoh |
|---|---|---|---|---|
| MC-KP-10 yash 3 x | 106 → 25 | 447 → 83 | 8.25 → 2.11 | 3 tortma (eski: 16 tadan) |
| MC-KP-06 kargo 200 | 14 → 7 | 85 → 24 | 1.58 → 0.78 | o'chirilgan butilkadon va fasadlar chiqdi |
| MC-KR-01 krovat detski | 52 → 26 | 334 → 145 | 12.48 → 6.24 | hamma detal ikki marta edi (ko'zgu nusxa) |
| MC-KR-02 spalni 001 | 23 → 18 | 42 → 18 | 3.05 → 2.57 | |
| MC-KR-03 spalni 002 | 19 → 16 | 0 → 0 | 2.39 → 2.33 | |
| MC-KR-04 spalni 003 | 32 → 32 | 18 → 10 | 11.36 → 11.36 | o'lcham: 1708×2010×416 → 2000×1750×1166 |
| MC-KR-05 spalni 005 | 21 → 21 | 68 → 40 | o'zgarmadi | almashtirilgan "евро 51 алкан" ham sanalgan edi |
| MC-PA-01 Парта | 8 → 8 | 10 → 6 | o'zgarmadi | evrovint 8 → 4 |

  - **MC-KR-04:** karavot Bazis'da 90° burilgan guruh ichida, tortmalar esa guruhdan tashqarida. Eski o'qish burilishni hisobga olmagan. Endi bo'yi bosh qismi bilan 1166 mm, uzunligi X o'qida (MC-KR-05 dagidek).
  - `id-links.json` dan faqat tarixdagi 13 nom chiqdi. Ular orasida tasdiqlangan yoki rad etilgan yozuv yo'q edi.
- **Teshik ma'lumoti faylda qayerda:**
  - Panellarda tayyor teshik ro'yxati **yo'q**. Bazis teshikni mahkamlagichdan hisoblaydi — biz ham shunday qilamiz.
  - Mahkamlagich guruhida Bazis'ning mahkamlash sxemasi bor (zlib bilan siqilgan):

| Mahkamlagich | Fayldagi parametrlar |
|---|---|
| Evrovint 7×50 | d1 — plastdagi teshik, d2 — toretsdagi teshik, h — vint uzunligi |
| Eksantrik + shkant | eksantrik D2=15, H2=12.5, D1=10, H1=11, D=7, H=35, x2=35; shkant 8×30: plastga 10, toretsga 20 |
| Hammasi | joylashtirish qoidasi: chetdan cheklov (StartIndent, EndIndent), uzunlikka qarab soni jadvali, qadam |

  - **Evrovint ikki xil:** 307 guruhdan 279 tasida 7 / 4.5 mm, 28 tasida 8 / 5 mm (bir xil "Евровинт 7х50 (32) симм" nomi bilan). Har teshik o'z faylidagi qiymatni oladi. Sexda qaysi biri ishlatilishini egasi tasdiqlaydi.
  - **Joyi bor, diametri faylda yo'q:** petlya, polka ushlagich, ruchka, oyoq.
    - Polka ushlagich: sxema ichida Bazis kutubxona obyekti ("BZ85") bor — hali ochilmagan. Nomida "D5".
    - Bularga **D6** (sex standarti) kerak yoki BZ85 ni ochish.
- **Keyingi qadam (3):**
  1. Evrovint, eksantrik va shkant teshiklarini panel koordinatasiga tushirish.
  2. O'lcham o'zgarganda teshiklarni Bazis qoidasi bo'yicha qayta joylash.
  3. Bazis o'lchamida fayldagi joy bilan aynan mosligini tekshirish.

## 3-qadam (2026-10-15): evrovint teshiklari — BAJARILDI
- **Qanday:** `scripts/bazis_teshik.py`.
  - Har vint uchun A detal (boshi turgan, plastdan o'tuvchi teshik Ø d1) va B detal (toretsga, Ø d2, chuqurligi h − A qalinligi) geometriya bo'yicha topiladi.
  - Vintning o'z X o'qi — vint yo'nalishi (fayldan tekshirildi).
  - Tortma konstruktori ichidagi sxemasiz vintlar — o'sha nomli vintning shu fayldagi sxemasidan.
- **Bazis joylashtirish qoidasi** (fayldagi sxemadan): soni — uzunlik jadvalidan; chetdan kamida StartIndent; qo'shni oraliq qadamga karrali; simmetrik.
  - 377 birikmadan 360 tasida fayldagi joy bilan aynan mos.
  - Qolgan 17 tasi Bazis'da qo'lda surilgan — fayldagi joyida (eng yaqin chetdan masofa) saqlanadi.
- **Fragmentda:** `birikmalar` — qoida yoki qo'lda joy + detal shablonlari (formula bilan). Ilova (`cutlist.js`) teshikni modulning haqiqiy o'lchamida hisoblaydi.
  - O'lcham o'zgarsa vint soni Bazis jadvali bo'yicha o'zgaradi va zapchast soni unga teng bo'ladi. Misol: "penal polki 5x" chuqurligi 290 → 660 mm — evrovint 12 → 18 ta.
- **Natija (38 modul):** 724 vint, 1077 teshik. Bazis o'lchamida har modulda fayldagi bilan aynan mos (±0.6 mm — detal o'lchami butun mm).
- **Detal satrlari:** teshiklari farqli nusxalar endi alohida satr (masalan, 5 polkadan vint bilan qotirilgan bittasi). Kroy va maydon o'zgarmaydi.
- **Zapchast ro'yxati tuzatildi:** mahkamlagich guruhi ("Евровинт 7х50 (32) симм", "POLKADERJATEL") birikma sxemasi, zapchast emas — endi sanalmaydi. Avval har vint ikki marta chiqardi (vint + guruh).
- **Stanok fayllari:** varaqdagi fayllarga (DXF, NC, PTP, G-code) faqat plast teshiklari kiradi. Torets teshiklari varaqda teshilmaydi — gorizontal prisadka stanogi uchun (TZ-11). BPJ ga ham kirmaydi.
  - Stanok fayllari TZ-11 dagi texnolog sinovigacha `SINOV` belgisida qoladi.
- **Prisadka:** teshik soni barcha nusxalar bo'yicha (`nusxa`). Narxga faqat usta tanlasa kiradi (S3).
- **Testlar:** `tests/verify_teshik.mjs` (17), `tests/verify_mc.mjs`.

## Ochiq qolgan (egasidan D6)
- **To'ldirish uchun jadval:** `Smart3D_malumot/D6-teshiklar-va-zapchast-2026-10-15.xlsx` — quyidagi teshik o'lchamlari va zapchast to'plamlari savoli.
- **Zapchast to'plamlari (topildi 2026-10-15, tuzatilmagan — qaror kerak):** tortma yo'naltirgichi va kiyim ilgichida to'plam ham, ichidagi qismlar ham zapchast bo'lib sanalgan ("Направляющие Салазка" ichida salazka; salazka ichida samorez; "GTV Штанга … с креплениями" ichida штанга va крепление). Hozir narxsiz — summaga ta'sir yo'q; ERP narxi ulanganda ikki marta hisoblanadi.
- **Petlya:** kosa diametri, chuqurligi, eshik chetidan masofa; yon devordagi planka teshiklari.
- **Polka ushlagich:** teshik diametri va chuqurligi, polka ostidan markazgacha masofa. Bazis kutubxona obyekti (BZ85) shifrlangan — ochilmaydi.
- **Ruchka:** teshik diametri (teshiklar orasi nomida bor: 160 mm).
- **Eksantrik + shkant** (1 modul, Shkaf 001): parametrlar faylda bor (D2=15, H2=12.5 …), lekin qaysi teshik qaysi detalga — texnolog tasdiqlashi kerak.
- **Evrovint diametri:** fayllarda ikki xil — 7 / 4.5 mm va 8 / 5 mm. Har modul o'z faylidagini oladi. Sexda qaysi biri ishlatilishini tasdiqlang.
- ~~`holes.json` eksporti~~ — bajarildi (2026-10-15): 3D eksportdagi `smart3d-holes.json` da MebelCity teshiklari (torets cheti bilan) bor.

## D6 natija (2026-10-17, egasi #136: "taklif bo'yicha qil") — `dizayn` f7dd5a2
- **Qiymatlar sex fayllaridan** (30 buyurtma: 61 `.project`, 30 `.b3d`), `app/js/engine/d6.js`:
  - petlya kosasi Ø35×13 — eshik uchidan 105, qirradan 21,5 (534 eshikning hammasida, 1-yuzada); vintlar Ø3×2 — ±24, 6 mm ichkarida;
  - planka Ø3×3 — yon devor old qirrasidan 37, oralig'i 32, markazi kosa balandligida (sexdagi yon devorda ham 74/106);
  - polka ushlagich Ø5×9 — markazi polka ostidan 2,5 mm (1068 tadan 1032), old qirradan 65, orqadan 45 (909 ushlagich);
  - ruchka Ø5 o'tuvchi — oralig'i 160 (309 tadan 302); eshikda tik, qirradan 40, yaqin teshigi uchidan 50; tortmada — markazda;
  - petlya soni (sexdan): ≤1000 — 2, ≤1600 — 3, ≤2000 — 4, undan katta — 5. Kupe eshik va konfirmatli polka — teshiksiz.
- **Qayerda:** MC (38) modullarida — har nusxa o'z joyidan (chap/o'ng yon devor — ko'zgu); qo'lda va AI chizgan modullarda; stanok modeli (2-yuza — XNC side 2, KDT `_2`), BPJ, eski CNC, prisadka narxi (kosa — "hinge" stavkasi).
- **Tekshiruv:** 38 MC moduli Bazis bilan — polka ushlagich 76/76, ruchka 46/46, petlya 123/132; 32/38 modul aynan. MC va qo'lda chizilgan yo'l bir xil natija beradi. `tests/verify_d6.mjs` (23).
- **Qolgan:**
  - burchak (gluxoy) modullarida sexda 4 ta petlya, bizda 2 ta (4 modul) — texnolog;
  - eksantrik (MC-SH-01), tortma napravlyayushiy teshiklari (sex fayllarida Ø3 bor) — D6 jadvalida yo'q;
  - **sinov kuni:** birinchi yon devorda planka va ushlagich teshiklari ICHKI yuzada chiqqanini tekshirish (chiqmasa — `YUZA_TESKARI = true`, bitta sozlama);
  - umumiy SP (85) modullari — teshiklari shablon, stanokka chiqmaydi; Bazis'dan yuklangan loyihada teshik o'qilmaydi (fayldagi furnituradan qo'yish mumkin).

## Prisadka aniqligi (2026-10-22, `agent/prisadka`) — Bazis importidan JOYLASHUVI BILAN teshiklar
- **Topilgan kamchilik (o'lchangan):** `.b3d` importi faqat teshik SONINI berardi (`narx_uchun`), stanok/KDT fayliga hech narsa tushmasdi — 30 buyurtmada sexning haqiqiy KDT si 16 273 teshik (detal soniga ko'paytirilgan), bizniki 0.
- **Qilingan:** `app/js/engine/bazis/teshikJoy.js` — mahkamlagich obyektlari (daraxt.js endi shifrlanmagan mahkamlash sxemasini ham o'qiydi) → panel freymida teshik joyi: evrovint (A: o'tuvchi, B: qirra), petlya (kosa, 2 vint, yon devorda planka belgilari), samorez/metka, polka ushlagich, ruchka, ekssentrik/Minifix, shkant, nomi o'lcham obyektlar. `fragment.bazisJoy` — ixcham matn qatorlari (himoya.js limiti); `cutlist` da `stanok_uchun` teshiklar: **narxga va hole_count ga kirmaydi**. Ko'r teshiklar faqat 2-yuzada bo'lsa panel ag'darib yoziladi (sex KDT qoidasi; faqat Bazis importi).
- **Natija (`node scripts/prisadka_solishtir.mjs`, 30 buyurtma):** recall 91,0%, precision 94,9% (jismoniy mos), aynan (o'zi/180°) 85,2%. Tur bo'yicha recall/precision: konfirmat yuza 96,0/98,9, qirra 96,2/98,4, kosa 86,3/87,0, belgi 88,0/90,0, polka 87,7/94,6, ruchka 87,4/98,8, ekssentrik Ø15 82,6/95,3, shkant 68,0/80,4. Himoya testi: `tests/verify_prisadka_real.mjs`.
- **Narx soni (teshik.js) ERP bilan:** 14 haqiqiy ERP buyurtmasi — МЕТКА = samorez + metka obyektlari (568 = 568), ЭКСЕРТРИК 130 = 130, ЕВРО 2370 = 2370, ПЕТЛЕ 340 = 340, ШКАНТ = shkant + «6x10»/«7x12» (49 ↔ 54).
- **Texnolog/egasi javobi kerak (dalil yetmadi):** (1) shifrlangan sxemali petlya oilasi (21/13, 21,5/13 Samet — aniq; ruscha shifrlanganlarda 22/12 yoki 21/13, planka 37 yoki 38 — buyurtmaga qarab); (2) ОВАЛ КАТТА/КИЧИК/КИЧИК 5 — KDT da aniq tur yo'q; (3) Присадка Паз — ERP miqdori METR (3 ta buyurtmada guruch uzunligi bilan mos), b3d da paz yozuvlari bor, lekin uzunligi dekodlanmagan; (4) 1-yuza tanlash qoidasi teshiksiz-ko'r panellarda (~25% da ko'zgu farqi, fizik jihatdan teng); (5) slayd belgilari Ø3×3 yoki Ø2,5×2,5; (6) ekssentrik juft Ø10 (ba'zi buyurtmalarda manbasi aniqlanmadi).
