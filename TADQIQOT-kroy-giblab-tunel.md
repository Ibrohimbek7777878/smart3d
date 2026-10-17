# Tadqiqot: <ichki-host-kroy> (GibLab) + <ichki-host-tunel>

> Manba: https://<ichki-host-tunel> → https://<ichki-host-kroy> (faqat o'qish, hech narsa o'zgartirilmadi)
> Sana: 2026-10-13 · Hisob: <hisob>

## 1. Bittada Tunel — arxitektura (Smart3D uchun BEPUL DEPLOY MODEL)

`<ichki-host-tunel>` — lokal ilovalarni internetga chiqarish xizmati (Cloudflare-tunnel uslubida).

**Model:**
- Lokal mashinada **agent** ishlaydi → **WebSocket (WSS)** orqali tunel serverga **outbound** ulanadi
- Server HTTPS trafikni shu WS tunel orqali lokal ilovaga qaytaradi
- Port ochish/CGNAT muammosi yo'q — faqat outbound WSS yetarli

**Har bir tunnel kartasi:**
| Maydon | Misol |
|---|---|
| Nomi | GibLab |
| MANZIL | `https://<ichki-host-tunel>/t/giblab/` |
| DOMEN (shaxsiy) | `https://<ichki-host-kroy>/` |
| TOKEN | UUID (Ko'rsatish/Nusxalash) |
| AGENT URL | `wss://<ichki-host-tunel>/ws/tunnel/<uuid>/` |
| Statistika | bugungi so'rovlar/xatolar, Loglar, O'chirish |

**Hozirgi holat:** 2 tunnel — GibLab (ONLAYN, 1671 so'rov/bugun), Kroy (OFLAYN → kroy.mebel-city.uz).

**Smart3D uchun xulosa:** aynan shu agent + WSS model bilan Smart3D demo'i
`smart3d.bittada.uz` ga chiqariladi — lokal python http.server o'rniga agent ishga tushiriladi.

## 2. GibLab (kroy) — nima?

**GibLabLocal** — GWT (Google Web Toolkit) bilan yozilgan **kroy (kesish) + kotirovka** dasturi.
Bizning BPJ'dagi `exports.giblab` XML (`<project importBMV="4.5">`) shu tizimga tegishli.

- API: `POST /sitelocal/xsite` (GWT-RPC, `//OK[...]` javob, application/json)
- UI: chap menyu (StackMenu) + loyihalar daraxti (papka → loyiha → mahsulot)
- 9 til: English, Український, Русский, Polski, Lietuvių, Türk, **O'zbek**, Română, Español
- Fayl kengaytmasi: **`.azpro`** (papka sifatida — ichida mahsulot loyihalari)

**Loyihalar ierarxiyasi:**
```
12_10_2026/                          ← sana papkasi
  Axmad aka 4747_4XPP3L_15_11_42_azpro/   ← mijoz papkasi
    Axmad aka kuxnya 3130            ← mahsulot (108 000 UZS)
```

## 3. GibLab loyiha tuzilishi (Smart3D smeta bilan moslashuv uchun)

**Sarlavha:** Наименование · Валюта (UZS) · Дата заказа · Дата готовности
**Xarajatlar:** Стоимость · С-ть материала · С-ть оперacji
**Amallar:** Отменить/Вернуть/Saqlash · Сохранить отчет · **Експортировать** · Импортировать ·
Импорт из Excel · Импорт из других программ · Печать отчета

**Operatsiyalar jadvali** (№, Тип, Код/Изделие, Наименование, Ст. м-ла, Ст. оп-и, Ст-ть, П-ть, Н.Стр):
| Tiplar | Ma'no |
|---|---|
| **CS** | Material qatori (ЛДСП Ультрадекор 4,575 Белый 16мм = 81 000; ХДФ Белый = 27 000; Столешница 26мм) |
| **EL** | Кромка (Кромка 19/1 ПВХ Белый гладкий) |
| **XNC** | Detal (kodlar `1_1`, `10_2`…; nomlar: stoyka, pol, Дверь, tom, bok, planka — o'zbekcha!) |

**Mahsulot paneli:** Параметры · Детали · Листы и остатки · **Раскрой**

## 4. Раскрой (nesting) parametrlari — to'liq ro'yxat

Bu ro'yxat Smart3D `nesting.js` ning KEYINGI bosqich spetsifikatsiyasi (hozir MVP'da faqat
kerf + guillotine BSSF bor):

**Material hisobi:**
- Narx hisobi: Площади материала / Количеству листов / Площади деталей
- Округление листов: К целому, 1/2, 1/3, 1/4 (умumiy/yoki ширина/длина бўйича)
- Operatsiya narxi: Длине реза / Периметру деталей / Площади деталей / Площади материала / Кол-ву листов / Кол-ву деталей
- Стоимость материала (Лист), Цена операции (метр/рез)

**Ostatka (qoldiq):**
- Min размер остатка 1/2 taraf bo'yicha
- Площадь делового остатка (ishlatiladigan qoldiq maydoni)
- Qoldiq o'lchamlari torцовka bilan

**Cheklovlar:** Minimalный размер детали

**Раскрой parametrlari:**
- Толщина пилы (kerf) + guruh detallari uchun alohida
- Торцовка по длине/ширине (+ "пропил bilan")
- Мин. отступ в конце
- Начальное направление резов: Любое / По длине / По ширине / preferensiya bilan
- **Учет текстуры** (tex yo'nalishi!)
- Сложные полосы (murakkab lentalar)
- Макс. вращений: 2–6
- **Высота пакета** (stack!) + Кратность
- Max разновидностей деталей на карте кроя: 1–10 / не ограничено

**Предпочтения:** Большой пакет · Сортировка полос/в полосе (убывание/возрастание/узкие в центр) ·
min/max ширина полосы · max длина полосы · Мин. обрезка · Объединение деталей ·
Группировка по свойствам · **Сохранение чертежа карт кроя** · Припуск на обработку ·
Режим ввода размеров заготовки (Вставить)

## 5. Sozlamalar bo'limi

- Режимы ввода деталей
- Сохранение отчетov
- **Постпроцессоры** (CNC)
- **XNC Редакtor**
- **Импорт из 3D-Constructor** (Bazis 3D Constructor'dan to'g'ridan-to'g'ri import!)
- Папка для загрузки · Обновление
- **Сервисы (pluginlar):** `giblab://CatalogExcel`, `giblab://ComarchERP`,
  `giblab://FileContent`, `giblab://RemaindersConnector` (qoldiqlar), `giblab://DropboxContent`

## 6. Lisensiyalar — CNC post-protsessorlar ro'yxati (muhim!)

Mijozlarning ishlatadigan станокlar (Smart3D CNC yo'nalishi uchun ustuvorlik ro'yxati):
| Modul | Mashina |
|---|---|
| GibCNCHelper (kengaytirilgan) | umumiy yordamchi |
| PDF файлы чертежей | chizmalar |
| KDTEdgeBanding | KDT kromka mashinasi |
| KDT + Nanxing (InoTouchPad) | ko'p qirrali svrevli |
| Этикетка модuli | yorliq bosib chiqarish |
| XDWoodCam / AES Go / AES Sirius (GCode) | ishlash markazi |
| **BiesseWorks v3.x** | Biesse |
| IGEMS / NCStudio / Excitech (GCode) | CNC |
| HIRZT/Maggi (iLENIA) | CNC |
| Holz-Her (NC-hops) | Holz-Her |
| **Homag (WoodWOP v6.x)** | Homag |
| IMA (ImaWop) | IMA |
| … (ro'yxat davom etadi) | |

Kod kaliti: `FF01-0177-77B7-3F82-66A4`

## 7. Smart3D ga bevosita qo'llaniladigan narsalar

1. **Deploy:** Tunel agent modeli → Smart3D demo'ni `smart3d.bittada.uz` ga chiqarish
2. **Nesting 2.0:** yuqoridagi 4-bosqich parametrlari — MVP'ga qo'shish kerak emas,
   lekin MVP'da ulanadigan konfiguratsiya JSON sifatida saqlansa yetarli
3. **Smeta moslashuvi:** CS/EL/XNC operatsiya tiplari + "С-ть материала / С-ть операций"
   ajratishi — Smart3D smeta satrlarini shu ko'rinishga yaqinlashtirish
4. **Integratsiya:** "Импорт из 3D-Constructor" (Bazis) — Smart3D BPJ export'ining
   teskari yo'nalishi: Bazis → Smart3D import (keyingi bosqich)
5. **XNC:** detal kodlari `N_M` (detal№_nusxa№) — Smart3D cutlist `ref` bilan mos
6. **Til:** O'zbek tilidagi UI allaqachon bor (GibLab'da) — Smart3D uchun ham normal holat
