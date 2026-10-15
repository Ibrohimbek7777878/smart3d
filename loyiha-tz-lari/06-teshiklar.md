# TZ-06 — Modullarga teshiklar (prisadka)

**Sana:** 2026-10-15 · **Navbat:** 6 · **Holat:** A VARIANTI — TADQIQOT (egasi tanladi, 2026-10-15).

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
