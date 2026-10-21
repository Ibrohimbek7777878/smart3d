# Bazis .b3d — yozish tuzilmasi (TZ-33 B2, SINOV)

Manba: sex namunalari (30 ta .b3d) ustida teskari muhandislik; mijoz ma'lumoti bu hujjatda yo'q. Yozuvchi — `b3dYoz.js`,
o'quvchi — `b3d.js` + `daraxt.js`. Isbot: `tests/verify_b3d_yoz.mjs`. **Bazis'da ochilishi bu kompyuterda tekshirilmagan.**

## 1. Fayl
```
"BZ85"                         4 bayt
01 00 00 FF 00                 oqim belgisi + rejim 0 (oddiy)   → SARLAVHA oqimi
01 00 00 FF 01                 oqim belgisi + rejim 1 (zlib)    → MODEL oqimi (fayl oxirigacha)
```
Fayl oxirida alohida nazorat summasi YO'Q: faqat zlib ichidagi Adler-32 va PNG chunk CRC-32. (Sarlavha PNG ichida ham zlib bor —
`IDAT`; "eng katta zlib blok" qidiruvi shuning uchun PNG ichiga tushadi, b3d.js `4002` soniga qarab to'g'ri blokni tanlaydi.)

## 2. Oqim (sarlavha ham, model ham bir xil)
```
sxema:  <nomlar soni:4>  { <uzunlik:4> <ASCII nom> } ...        nomlar tartibi: avval uzunlik, keyin harf tartibi; 0-nom = ''
ildiz:  bitta tugun
tugun:  <nom indeksi:4> <soni:4> <tur:1> <qiymat>
        tur 0 / 8 tuzilma: `soni` ta bola tugun (8 — faqat "Val"); nom indeksi FFFFFFFF = ro'yxat elementi (nomsiz)
        tur 1 / 2  mantiq true / false (qiymat baytsiz)         tur 3  i8 (1 bayt, 0..255)
        tur 4      i32                                            tur 5  double (8 bayt)
        tur 6      <uzunlik:4 (belgi)> UTF-16LE                   tur 7  blob <uzunlik:4> baytlar
```
Butun son qoidasi (barcha 6 ta "Bazis 15" faylida istisnosiz): 0..255 → i8, qolgani (manfiy, katta, `Type`, `Color`, `FastID`) → i32.
**Isbot:** 6 ta "Bazis 15" faylida model daraxtini o'qib qayta yozish baytma-bayt aynan (sxema tartibi, turlar, sonlar).

## 3. Sarlavha oqimi (ildiz `Header`, 3 bola)
`Version` i8 (13) · `Thumbnail` blob (PNG, 256×256 RGB) · `Article` { `Name` s, `ID` i8, `OrderName` s, `LDistance`/`.Min`/`.Max` d,
`Furniture` b, `FileType` i8 (1), `ExtraInfo` {}, `RotationList` {} }.

## 4. Model oqimi (ildiz `Document`, 9 bola, shu tartibda)
`VersionMajor` i8 (10) · `VersionMinor` i8 (13) · `Estimate` {} · `FurnList` { `F<FastID>` ta'riflar } · `Model` { `Obj` ... } ·
`ModelParams` { `Name`="Model" } · `Camera` · `HardwareKey` · `Undo` { `ActiveIndex`, `FirstOperationNumber`, `StartName`, `Operations` }.
Sxemada ishlatilmagan nom yo'q: `F<FastID>` nomlari ham sxemaga kiradi.

### Obyekt (`Obj`), birinchi maydon doim `Type` (i32), ikkinchisi `Name`, keyin `ID`
| Type | Nima | Maydonlar (shu tartibda) |
|------|------|--------------------------|
| 1001 | gabarit ramka / chiziq | `Name`, `ID`, [`Vis`], `Color`, [`Trans`], `Width`, `Height`, `Depth`, `GridSize`, `LDistance`, [`DatumMode`] |
| 1005 | modul (guruh) | `Name`, `ID`, `Trans`, `DatumMode`, `JointLength`, `Symmetrize`, `Objs` { ichki obyektlar } — ichma-ich mumkin |
| 4002 | **panel** | `Name`, `ID`, `Color`, `Trans`, `Mat` s, `Thick` d, `TexDir` i8, [`TexAngle`], `Contour` blob, [`Butts`], [`Cuts`] |
| 3001 | furnitura nusxasi | `Name`, `ID`, `Color`, `Trans`, `FastID` i32 (→ `FurnList/F<FastID>`), `SalonType` i8 |
| 2004, 4001, 4004 | yo'naltiruvchi qismlari | yozuvchi chiqarmaydi |

- `Trans` = 7 double: `X Y Z Rx Ry Rz Rw` — joy ota guruh koordinatasida; global = ota + lokal (daraxt.js `qosh`). Kvaternion → o'qlar:
  ustunlar AxisX/Y/Z (`oqdanKvaternion` — `kvaternionMatritsa` ning teskarisi).
- `Contour` blob = `<soni:4>` + elementlar; chiziq: `0x10` + x1 y1 x2 y2 (4 double); yoy: `0x12` + markaz, p1, p2 (6 double) + yo'nalish (1 bayt).
  Kontur panelning lokal tekisligida (0..dl × 0..dw), qalinlik lokal +Z. Detal o'lchami = kontur bbox.
- `Butts` { `Butt` { `Mat` s ("Кромка …"), `Thick` d, `Elem` i8 (kontur elementi indeksi), `Sign` s, `Overhung` d, `Allowance` d, `Clip` b } }.
- Furnitura ta'rifi `F<FastID>`: `Name`, `FastID`, `DatumMode`, `ParamType`, `ParamOffset`, `ParData` { `Elements` }, `MinX..MaxZ`, `Holes` { `Hole` ... },
  `RotHoleIndex`, `RotEdgeIndex`.

## 5. "Bazis 24" shakli (yozilmaydi)
Bayt 8–9 (`00 14`/`00 15`/`00 13`) sarlavha sxemasi nomlari soni; yangi fayllarda sarlavhada qo'shimcha `Table`, `Params`, `Encrypt`, `Password`,
`Algorithm`; sarlavhadan keyin ~2–25 KB buzilgan (aralashtirilgan) matn bloki; model rejimi `FF 03`, model boshida 95 yozuvli jadval.
Yozuvchi eng sodda ("Bazis 15", bayt 9 = `0F`) shaklni yozadi — yangi Bazis eski shaklni ochishi KUTILADI, lekin tasdiqlanmagan.

## 6. Yozuvchi nima qiladi va nima qilmaydi
- Yozadi: modul (1005) → gabarit ramka + panellar (o'lcham, joy, material, kromka) + furnitura (3001 + `FurnList`).
- Yozmaydi: teshiklar/pazlar (`Cuts`, `Holes` — panelda), furnitura 3D shakli (faqat quti ta'rifi), animatsiya, `Undo` tarixi, material kutubxonasi
  (`Mat` — matn, Bazis o'zining kutubxonasidagi nom bilan solishtiradi), `HardwareKey` = 0 (litsenziya kaliti yo'q).
- Furnitura joyi — 3D dagi zapchast belgilari (SketchUp eksportidagi joy va burilish); joyi noma'lum furnitura (MC oyoqchasi) — modul burchagida; ro'yxat va soni to'g'ri.

## 7. Panel joyining manbasi (2026-10-19: «chizilgan spalniy va Bazis'da ochilgan natija bir xil emas» tuzatishi)
- **Bitta manba**: SketchUp eksportidagi model (`web/src/features/editor/eksport/model.js` `eksportModeli`) → `modelLoyiha.js` `modeldanLoyiha` → `b3dYoz`.
  Oldin panel joyi BPJ dan olinardi; u MC modullarda 3D bilan 0,0 mm bir xil edi (joy formulalari), lekin umumiy (SP) modullarda kesim detallarini
  3D panellarga taxminiy moslar edi (`takePanel`, bo'lmasa «navbat»; shuningdek eshiklar/tortmasiz 3D) — garderob eshiklari korpusdan chiqib, polkalar tarqab ketardi.
- O'qlar (haqiqiy BPJ bilan 77/77 panel aynan, `loyiha.js` bilan bir xil): **Bazis X = OFF − x, Y = z (bo'yi), Z = y (chuqurlik)** — burilish, ko'zgu emas (det = +1);
  OFF — barcha X ≥ 0 bo'lishi uchun butun son. Birlik — mm.
- Panel `Trans`: pos = kontur (0,0) burchagi va qalinlikning boshlanish yuzi; AxisX — dl, AxisY — dw, AxisZ — qalinlik (o'ng qo'l; kvaternion — ustunlar = o'qlar).
  Ramka `bpj.js panelRamka` bilan: kromka `elemIndex` (0 — oldi/pastki, 1 — o'ng, 2 — yuqori, 3 — chap) BPJ dagidek.
- Modul guruhi (1005): `Trans` = panellar gabaritining burchagi (burilishsiz), ichidagi panel va furnitura `Trans`i guruhga nisbatan (haqiqiy fayllardagidek:
  `korpus 1` guruhi siljish bilan, panel — nisbiy). Modullar xonadagi joyida (modul p.x/y/z/rot).
- Detal ma'lumoti (nom, material, kromka) — kesim ro'yxati detalidan (`ref`, bo'lmasa o'lchami ±1 mm); 3D panelga mos kesim detali bo'lmasa — modeldagi nom/material, kromkasiz.
- 3D da butun modul bitta massiv quti bo'lib chizilgan, kesim ro'yxatida esa standart karkas detallari (yon×2, ust, past, orqa, shift*, eshik*) bo'lgan modullar
  (komod, kir yotoq, toshqin, divan quti …) massiv quti emas — yig'ilgan karkas bo'lib yoziladi (tashqi gabarit 3D dagi quti bilan bir xil).
- Yozilmaydi: texnika (kesim detali yo'q), 3D dagi belgi-detallar (< 2 mm, masalan stol oyog'i 50×50×1).
- Tekshiruv: `tests/verify_b3d_yoz.mjs` [4] — Yotoqxona va oshxona (har panel AABB = eksportModeli ±0,5 mm, yig'ilgan korpus, eshiklar old tekisligida, modullar ustma-ust emas),
  [3] — sex fayllari: o'qish → yozish → o'qish, har panel global AABB aynan (±0,5 mm). Bazis'da ochish — egasi (`Smart3D_malumot/sinov-fayllar/`).
- Noma'lumlar (Bazis'da sinab ko'rilmagan): `HardwareKey` = 0 qabul qilinishi, `TexDir`, `DatumMode` ma'nolari, FurnList ta'rifi minimal bo'lishi.
