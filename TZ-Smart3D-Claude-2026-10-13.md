# TZ — Smart 3D: Bazis va GibLab'siz mebel konstruksiya tizimi

**Sana:** 2026-10-13 · **Versiya:** 1 · **Holat:** TASDIQ KUTMOQDA — kod yozilmaydi
**Kim uchun:** Smart3D'ni quruvchi dasturchi / OpenCode agenti va loyiha egasi
**Asos:** asl 8 bandli TZ · `HANDOFF.md` (13.10, demo ~30%) · egasining 13.10 dagi talablari ·
Bittada serveridagi haqiqiy ma'lumotlar tahlili (13.10 o'lchangan)

---

## 0. Bir jumlada

Usta mijozning uyida xonani o'lchaydi va tayyor modullarni qo'yadi (qo'lda, yozib yoki gapirib).
1 soatdan kam vaqtda quyidagilar chiqadi: 3D va render, tannarx va smeta, zapchastlar ro'yxati,
kroy (nechta list ketadi, qancha qoldiq qoladi) va sexdagi har bir stanok uchun tayyor fayl.
Bazis ham, GibLab ham kerak bo'lmaydi.

---

## 1. Asosiy qoidalar (butun tizim uchun)

1. **Yagona manba.** Loyiha = xona + modullar + materiallar (bitta `project` JSON). Narx, kesim
   listi, kroy, stanok fayllari va 3D — hammasi shundan HISOBLANADI. Ularning hech biri alohida
   qo'lda saqlanmaydi.
2. **AI — yordamchi, majburiy emas.** AI faqat tizimning oddiy buyruqlarini chaqiradi. Har bir
   buyruqni forma yoki jadval orqali qo'lda ham bajarish mumkin. AI o'chirilsa, tizim to'liq
   ishlayveradi.
3. **AI o'lcham ham, detal ham o'ylab topmaydi.** Detallar faqat kutubxonadagi modul formulasidan
   chiqadi. AI modulni tanlaydi va unga o'lcham, material, joy beradi — xolos.
4. **Ma'lumot buzilmaydi.** Har bir modul, detal va materialning o'zgarmas ID'si bor.
   Import → eksport → qayta import natijasi bir xil bo'lishi shart (§11).
5. **Narx jonli.** Material, furnitura va xizmat narxlari Bittada ERP'dan olinadi. Narx o'zgarsa,
   ochiq loyihalar qayta hisoblanadi. Mijozga berilgan smeta esa muzlatiladi (snapshot) va unda
   "narx o'zgardi: ±X" deb ko'rsatiladi.
6. **Narxsiz narsa narxsiz qoladi.** Narxi yo'q material tanlansa, smetada "narx yo'q" belgisi
   chiqadi. Narx hech qachon o'ylab topilmaydi.
7. Telefon va planshetda ishlaydi, internetsiz ham (PWA).
8. **Formulalar xavfsiz hisoblanadi.** Modul formulalari (`"h-8"`, `"w>600?2:1"`) faqat cheklangan
   ifoda tili bilan hisoblanadi. JS `eval` ishlatilmaydi — hozir `cutlist.js` da `eval` bor, u
   almashtiriladi.

---

## 2. Ish oqimi (usta ko'zi bilan)

| # | Qadam | Kiritish usullari | Natija | Vaqt maqsadi |
|---|---|---|---|---|
| 1 | Zamer: devorlar, deraza, eshik, quvur/rozetka | qo'lda chizish · jadval · BLE lazer · ovoz | 2D reja + 3D xona | ≤ 10 daq |
| 2 | Modul qo'yish | katalogdan sudrash · jadval · yozma prompt · ovoz | joylashgan modullar | ≤ 15 daq |
| 3 | Material tanlash | loyiha bo'yicha standart (korpus/fasad/orqa/kromka) + modulda almashtirish | materiallar | ≤ 5 daq |
| 4 | Tekshiruv | avtomatik (Validator) | xatolar ro'yxati | darhol |
| 5 | 3D / VR / render | 1 tugma | jonli 3D darhol, foto-render ≤ 3 daq | ≤ 3 daq |
| 6 | Smeta va tannarx | avtomatik | mijoz narxi, tannarx, zapchast ro'yxati, PDF | darhol |
| 7 | Kroy | avtomatik yoki fayl tashlab | listlar soni, qoldiqlar, kroy kartalari | ≤ 30 sek |
| 8 | Sex paketi | 1 tugma | ZIP: stanok fayllari + labellar + chizmalar | darhol |

**Jami: zamerdan sex paketigacha ≤ 60 daqiqa (maqsad — 30 daqiqa).**

---

## 3. Modul (fragment) kutubxonasi

### 3.1 Fragment sxemasi (majburiy maydonlar)

```json
{
  "id": "OSH-P-E1", "versiya": 3,
  "nom": {"ru": "Нижний шкаф с дверью", "uz": "Pastki shkaf eshikli",
          "uz_kir": "Пастки шкаф эшикли", "en": "Base cabinet with door"},
  "tur": "oshxona_pastki",
  "olcham": {"w": {"std": 600, "min": 300, "max": 900, "qadam": 50},
             "h": {"std": 720, "min": 700, "max": 900},
             "d": {"std": 560, "min": 450, "max": 600}},
  "slotlar": ["korpus", "fasad", "orqa", "kromka_korpus", "kromka_fasad"],
  "detallar": [
    {"kod": "yon", "soni": 2, "uzunlik": "h", "en": "d", "slot": "korpus",
     "kromka": {"old": "kromka_korpus"}, "tekstura": "uzunlik"},
    {"kod": "tub", "soni": 1, "uzunlik": "w-2*t", "en": "d", "slot": "korpus",
     "kromka": {"old": "kromka_korpus"}},
    {"kod": "eshik", "soni": "w>600?2:1", "uzunlik": "h-4",
     "en": "w>600?(w/2-3):(w-4)", "slot": "fasad", "kromka": "hammasi:kromka_fasad"}
  ],
  "teshiklar": [{"detal": "yon", "tur": "konfirmat", "diametr": 5, "chuqurlik": "o'tadi",
                 "x": "t/2", "y": [50, "d-50"]}],
  "furnitura": [{"komplekt": "KMP-00012", "soni": "eshik_soni*(h>900?3:2)"},
                {"id": "FUR-00340", "soni": 4}],
  "cheklovlar": ["w>600 => eshik_soni=2"],
  "manba": "1245_Shkaf_1800.b3d"
}
```

`t` — tanlangan korpus materialining qalinligi (slotdan olinadi).

### 3.2 Qoidalar

- O'lcham min/max chegarasidan chiqsa, Validator ruxsat bermaydi va o'lchami mos keladigan modulni
  taklif qiladi.
- O'lcham o'zgarsa, quyidagilar avtomatik qayta hisoblanadi: detal o'lchamlari → yuza → narx → kroy.
- Fragment versiyalanadi. Kutubxonada modul o'zgarsa, eski loyihalar eski versiyada qoladi.
- 3D model alohida chizilmaydi — u detallardan avtomatik quriladi. Shuning uchun 3D va kesim listi
  doim bir-biriga mos keladi.

### 3.3 600 ta fragmentni yig'ish

- **Manba:** serverdagi real Bazis fayllari — 2 933 ta `.b3d` (`/home/user/bazis fayllar oktiyabr/`)
  va 994 ta `.b3d` (`/var/www/bazis_b3d/`). Ikki papkadagi fayllar qisman takrorlanadi.
- **Usul — yarim avtomatik.** Tizim eng ko'p takrorlanadigan modullarni nomzod sifatida beradi,
  bazischi ularni tekshirib, formulaga aylantiradi. To'liq avtomatik ajratish (3D-masofa bo'yicha
  klasterlash) 2026-08-13 da sinalgan va yaroqsiz chiqqan.
- Qo'lda kiritish uchun Excel shablon ham bo'ladi (B1).

---

## 4. Material reestri va "nom muammosi"

### 4.1 Hozirgi holat (Bittada bazasi, 13.10 da o'lchangan)

- 19 135 ta aktiv mahsulot bor. Ulardan 3 430 tasi **namuna** (Образец) — konstruksiyaga kirmasligi kerak.
- O'lchami kiritilgan plita — 2 454 ta, shulardan **narxi borlari atigi 1 080 ta**.
- 9 881 ta mahsulot (63%) narxsiz. 2 895 tasida SKU yo'q yoki SKU o'rniga "n" yozilgan.
- Nomlar faqat ruscha va har xil yozilgan:
  `ЛДСП Эггер 5,796 Дуб Галифакс глазурованный черный 18мм ST37`,
  `ЛМДФ 1/2 Твист светлый 5,0325 7,5мм`. List o'lchami nom ichida yashirin kod bilan berilgan
  (`5,796` = 2800×2070).
- Yechim tovarlari 8 xonali kod + "Y" bilan belgilanadi, masalan `10100432Y` (Samet Master petlya).
  Narx komplekt bo'yicha beriladi: petlya + montaj planka.

### 4.2 Yechim: Bittada ID + 7 qatlam (AI — eng oxirida)

1. **Bittada ID.** Har bir material va zapchastga o'zimiz qisqa, o'zgarmas ID beramiz:
   `KAT-NNNNN`, masalan `LDSP-00123`, `LMDF-…`, `MDF-…`, `HDF-…`, `AGT-…`, `FAS-…` (fasad/frente),
   `KRM-…` (kromka), `FUR-…` (furnitura), `KMP-…` (komplekt). Labelda, smetada va stanok faylida
   shu ID yoziladi.
2. **Atribut parser (AI'siz).** Nomdan quyidagilarni ajratib oladi: kategoriya, brend, dekor kodi
   (H3178, U707, 0110), tekstura (ST37), qalinlik, list o'lchami (`5,796`→2800×2070,
   `5,0325`→2750×1830, `5,175`→2500×2070). Kromkada `22/0,8` → eni 22, qalinligi 0,8.
3. **Bog'lanish jadvali.** Bitta Bittada ID ga bir nechta tashqi kod bog'lanadi: ERP product id, SKU,
   Yechim 8 xonali kodi, Eman id, shtrix-kod. Bittada'da Eman uchun xuddi shunday andoza bor
   (`ProductEmanLink`: nomzodlar, holat, kim tasdiqlagan).
4. **Sinonim lug'ati — 4 yozuvda.** Ruscha, o'zbekcha lotin, o'zbekcha kirill, inglizcha va sex
   jargoni:
   - ЛДСП = LDSP = ldsp = DSP
   - белый = oq = оқ = white
   - Эггер = Egger = эгер
   - петля = petlya = hinge
5. **Normalizator.** Kirill↔lotin transliteratsiya (ў/қ/ғ/ҳ, ё), harf katta-kichikligi, bo'shliqlar.
   `16мм`, `16 mm` va `16` bir xil deb tushuniladi.
6. **Qidiruv tartibi:**
   ID yoki kod → atribut filtri (`oq ldsp 16` → LDSP + белый + 16 mm) → sinonim → semantik
   qidiruv (embedding) → faqat oxirida AI.
   AI topgan moslik xodim tasdiqlamaguncha doimiy bo'lmaydi.
7. **O'rganish halqasi.** Usta qidiruvdan keyin natijani tanlasa, "so'rov → ID" juftligi lug'atga
   yoziladi. "AI'ni o'qitish" aslida shu lug'at va misollar demakdir — modelni qayta o'qitish
   (fine-tune) kerak emas.

Bundan tashqari, quyidagilar konstruksiya katalogidan chiqariladi: namunalar, marketing mahsulotlari,
o'lchamsiz plitalar va arxivdagi tovarlar. Katalogga faqat oq ro'yxatdagi kategoriyalar kiradi.

### 4.3 Qabul mezoni

- Test to'plami: 4 yozuvda, jargon bilan yozilgan 200 ta real so'rov.
  To'g'ri natija 1-o'rinda — ≥ 95%, birinchi 5 talik ichida — ≥ 99%.
- Avtomatik noto'g'ri bog'lanish — 0 ta. Noaniq holatda tizim savol beradi.

---

## 5. Narx dvigateli (real-time)

```
Tannarx = plita     (kroy natijasidagi HAQIQIY listlar, chiqindi bilan)
        + kromka    (metr, zapas bilan)
        + furnitura (komplektlar bo'yicha)
        + xizmatlar (arra, kromka urish, oval kromka, prisadka, rover)
        + ish haqi + transport/o'rnatish
Mijoz narxi = tannarx × kategoriya ustamasi
```

- **Xizmat narxlari** Bittada'da bor: `widget_service` — 211 ta xizmat va `ServicePricing`
  (tannarx `cost_price`, mijoz narxi `client_price`, amal sanasi `valid_from`).
- **Narx manbai — Bittada ERP, faqat o'qish.** Ulanish yo'li: mavjud `mcp_api` (`/api/mcp/v1/`,
  `X-MCP-Key`) yoki yangi read-only narx endpointi. Bittada tomonidagi har qanday o'zgarish
  ALOHIDA TZ va ruxsat bilan qilinadi.
- **Offline rejim:** oxirgi narxlar keshdan olinadi va smetada "narx sanasi" ko'rsatiladi.
- **BOM qoidalari Bittada'da allaqachon bor** (`bom/`): kg↔dona konvertatsiyasi, zapas, xizmat
  qoidalari, chiqindi %. Ularni qayta ixtiro qilmaslik — shu qoidalarni o'qish kerak.

---

## 6. AI qatlami (2 ta AI + tekshiruvchi)

```
Usta (matn yoki ovoz; 4 yozuv, jargon, xatolar bilan)
  → AI-1 "Tarjimon"   : gapni tushunib, aniq buyruqqa aylantiradi (JSON)
  → AI-2 "Konstruktor": buyruqni tizim toollari orqali bajaradi
  → Validator (AI'siz): tekshiradi → xato bo'lsa AI-2 ga qaytaradi (≤ 3 urinish)
  → usta tasdiqlaydi
```

**AI-1 Tarjimon**
- Ustaning tushunarsiz yoki noto'g'ri gapini to'g'rilab, qat'iy sxemali buyruqqa aylantiradi.
- Material nomini o'zi "topmaydi" — §4 dagi qidiruv toolini chaqiradi.
- Gap noaniq bo'lsa, TAXMIN QILMAYDI. Bitta qisqa savol beradi, masalan:
  "Pastki qator 600 mi yoki 800 mi?"

Buyruq misoli:
```json
{"amal": "modul_qosh", "modul_turi": "oshxona_pastki_eshikli", "kenglik": 600,
 "devor": "A", "chapdan": 1200, "material": {"korpus": "LDSP-00123", "fasad": "AGT-00045"}}
```

**AI-2 Konstruktor**
- Faqat kutubxonadagi fragmentlardan foydalanadi.
- Toollari: `fragment_qidir`, `modul_qoy`, `olcham_ber`, `material_ber`, `tekshir`, `smeta`.
- Yangi detal yarata olmaydi.

**Validator (AI'siz).** Tekshiradi: min/max chegaralari, modul devorga sig'ishi, modullar
to'qnashuvi, deraza va eshik, eshik ochiladigan joy, standart balandliklar, majburiy furnitura,
narxsiz material.

**AI'siz rejim.** Xuddi shu buyruqlar forma yoki jadvaldan beriladi.

**Jurnal.** Har bir AI tuzatishi saqlanadi: usta nima dedi → AI nima tushundi → usta tasdiqladimi.
Shu jurnaldan lug'at va qoidalar o'sib boradi, vaqt o'tib AI'ga ehtiyoj kamayadi.

**Provayder.** Sozlanadigan (Claude yoki Gemini). Kalit faqat serverda turadi.

**Qabul mezoni.** 50 ta real usta iborasidan ≥ 90% i birinchi urinishdayoq to'g'ri buyruqqa
aylanadi. Noto'g'ri o'lcham hech qachon jim o'tib ketmaydi.

---

## 7. Ovoz

- **STT va TTS:** Yandex SpeechKit (o'zbek va rus tillari). O'zbekcha sifati sinov bilan tasdiqlanadi.
- **Jonli suhbat:** Gemini Live — FAQAT server-proxy orqali. Bittada'da ishlab turgan andoza:
  `client_erp/glive_consumer.py`. Brauzerdan to'g'ridan-to'g'ri ulanish 3.1 modelida `1011` xato
  beradi; bundan tashqari, kalit brauzerga chiqmasligi kerak.
- **Oqim:** ovoz → matn → AI-1, ya'ni yozma buyruq bilan bir xil yo'l.
- Ovoz o'chiq bo'lsa ham hamma narsa ishlaydi.

---

## 8. 3D, VR, render

- **Jonli 3D** (three.js, PBR) — darhol chiqadi. Materiallar haqiqiy dekor rasmlari bilan ko'rinadi
  (B2 dagi "tekstura rasmi" ustuni).
- **Foto-render ≤ 3 daqiqa.** Serverda navbat bilan ishlaydigan worker (Blender Cycles yoki
  path-tracer). Natija: JPG 1920×1080 va 360° panorama (telefonda VR ko'rish uchun).
- **VR:** WebXR (bor) + **GLB/glTF eksport** — VR uchun standart format. OBJ+MTL ham qoladi.
- **Mijozga havola:** 3D va smeta bitta sahifada.

---

## 9. Kroy (GibLab o'rniga)

### 9.1 Muhim fakt

kroy.bittada.uz — GibLab'ning o'zi emas, faqat **tunnel**. Haqiqiy GibLab lokal kompyuterda
o'rnatilgan yopiq, sotib olinadigan dastur. Uning kodi hech qayerda yo'q, uni ko'chirib bo'lmaydi
(`/home/user/bittada/TZ-KROY-GIBLAB-TUNNEL-UZILISHI.md`).

Demak kroy — **o'zimizning dvigatelimiz**. U demo'da allaqachon bor: lenta usuli 87,4%,
gilyotina 78,3%. GibLab faqat solishtirish o'lchovi bo'lib xizmat qiladi.

### 9.2 Talablar

- **Kirish:** Smart3D loyihasi YOKI tashlangan fayl — GibLab `.project`, Bazis `.b3d` yoki Excel
  kesim listi.
- **Chiqish:**
  - listlar soni (material bo'yicha) va har bir listning kartasi;
  - ishlatilish foizi;
  - qoldiqlar va ularning o'lchamlari;
  - kesim uzunligi;
  - PDF va DXF.
- **Sozlamalar:** arra eni (kerf), chetki kesim (trim), tekstura yo'nalishi, minimal qoldiq o'lchami.
  Gilyotina rejimi majburiy, chunki Holzma va Altendorf faqat to'g'ri chiziq bo'ylab kesadi.
- **Qoldiq ombori.** Ishlatilmagan qoldiq (masalan ≥ 300×300) labellanib omborga olinadi va keyingi
  kroyda birinchi navbatda ishlatiladi.
- **Ko'p buyurtmali kroy.** Materiali bir xil bo'lgan bir nechta buyurtma birga kesiladi — chiqindi
  kamayadi (Sunpina usuli).
- **GibLab `.project` o'qish va yozish** bayt-ma-bayt mos bo'lishi kerak (demo'da 57/57). Bittada'da
  aniq meta o'qish allaqachon bor: `widget_fms/services/bazis_meta.py`.

### 9.3 Benchmark (qabul mezoni)

Serverda **5 722 ta real GibLab `.project` fayli** bor: ularda detallar ham, GibLab natijasi ham
saqlangan (takrorlar bo'lishi mumkin). Shulardan kamida 200 tasida bir xil sozlama bilan
solishtiriladi:

- holatlarning ≥ 90% ida list soni GibLab'nikidan ko'p bo'lmasligi kerak;
- o'rtacha chiqindi GibLab'nikidan ko'pi bilan 2 foiz punktga yomon bo'lishi mumkin;
- 1 ta loyihaning kroyi ≤ 30 sekundda tayyor bo'lishi kerak.

---

## 10. Stanoklarga moslash

### 10.1 Usul

1. Har bir detal **neytral detal dasturi**ga aylantiriladi: kontur, teshiklar (diametr, chuqurlik,
   koordinata), paz, kromka tomonlari, tekstura.
2. Neytral dasturdan har bir stanok uchun alohida **post-prosessor** fayl yasaydi. Yangi stanok
   qo'shish = yangi post-prosessor yozish; tizimning qolgan qismi o'zgarmaydi.
3. Har detalga **label + QR** chiqadi: buyurtma, modul, detal nomi, o'lcham, material ID, kromka
   belgilari. Operator QR'ni skanerlaydi va shu detalning dasturi/chizmasi ochiladi. Sunpina
   zavodlari shu usulda ishlaydi; Bittada'da "Detal QR" allaqachon bor.

### 10.2 MebelCity sexi stanoklari (Bittada'dagi ishlab chiqarish bosqichlaridan olingan)

| Stanok | Bosqich | Chiqadigan fayl | Nima kerak |
|---|---|---|---|
| Holzma (Homag guruhi, formatli arra) | Arra | kesim dasturi (odatda PTX/SAW — namuna bilan aniqlanadi) + kroy kartasi | stanok kompyuteridan 1–2 ta namuna fayl |
| Altendorf (qo'lda ishlaydigan arra) | Arra | chop etiladigan kroy kartasi (polosa tartibida) + labellar | — |
| Kromka stanogi | Kromka | detallar bo'yicha kromka ro'yxati (qaysi tomon, qaysi lenta); belgilar labelda | stanok modeli |
| Oval kromka | Oval kromka | ro'yxat + chizma | — |
| Prisadka | Prisadka / Bazis Prisadka | teshik dasturi (CNC bo'lsa) yoki teshik sxemasi (PDF) | stanok modeli + namuna fayl |
| Biesse Rover (CNC) | Rover | `.bpp` / `.cix` | 1–2 ta namuna fayl |
| Homag CNC (agar bo'lsa) | — | woodWOP `.mpr` | bormi-yo'qmi aniqlansin |

13.10 da butun server qidirildi (`.bpp/.cix/.ptx/.saw/.mpr/.nc`) — bunday namuna fayllar **UMUMAN
YO'Q**. Ularni faqat sexdagi stanok kompyuterlaridan olish mumkin.

### 10.3 Xavfsizlik

Yangi post-prosessor birinchi marta faqat **sinov rejimida** ishlatiladi: 1 ta arzon detalda
tekshiriladi va sex texnologi tasdiqlagandan keyingina ishlab chiqarishga ochiladi. Tasdiqlanmagan
stanok fayli "SINOV" belgisi bilan chiqadi.

---

## 11. Eksport va ma'lumot butunligi

**Formatlar:**
- mavjud 11 tasi: OBJ+MTL, DXF, NC, PTP, BPJ, GibLab `.project`, XNC CSV, Cutlist, Smeta,
  Project JSON, Hisobot;
- yangi: GLB, XLS (smeta va kesim listi), stanok post-prosessorlari, Sex paketi (ZIP).

**Butunlik qoidalari:**
- **Har eksportdan oldin nazorat yig'indilari solishtiriladi:** detallar soni, umumiy yuza (m²),
  kromka metri, teshiklar soni. Ular kesim listi, kroy va stanok fayllarida bir xil bo'lishi SHART.
  Farq bo'lsa, eksport to'xtaydi va sababi ko'rsatiladi.
- **Round-trip testlari:**
  - Project JSON → eksport → import → natija bir xil (kanonik JSON xeshi teng);
  - `.project`: o'qish → yozish → bayt-ma-bayt bir xil.
- Hech qaysi eksport loyihaning o'zini o'zgartirmaydi — faqat o'qiydi.
- Loyihada fragment versiyasi saqlanadi, shuning uchun kutubxona yangilansa ham eski loyiha
  o'zgarmaydi.

---

## 12. Backend, saqlash, Bittada'ga ulanish

- Login, loyihalar va ularning versiyalari, mijozga havola, buyurtma.
- **Buyurtmani Bittada ERP'ga yuborish** — keyingi bosqich, alohida TZ va ruxsat bilan. Hozircha
  Bittada'dan faqat narx o'qiladi.
- **Obuna (SaaS, boshqa sexlar uchun)** — keyinroq. Lekin arxitektura boshidanoq ko'p sexli bo'ladi:
  har bir sexning o'z narxlari, materiallari va stanoklari.
- **Joylashuv:** `smart3d.bittada.uz` — Sobir tunneli orqali yoki alohida serverda (§19, 3-savol).

---

## 13. Kerakli bazalar — ANIQ RO'YXAT (OpenCode'ga beriladi)

| # | Baza | Fayl | Majburiy ustunlar | Manba | Holat |
|---|---|---|---|---|---|
| B1 | Fragmentlar | `fragments.json` yoki Excel shablon | §3.1 sxemasi | bazischi + `.b3d` fayllar | 30 ta bor, 600 ta kerak |
| B2 | Plita + kromka reestri | `materials.xlsx` | Bittada ID, kategoriya, brend, dekor kodi, tekstura, rang (4 yozuvda), qalinlik, list o'lchami, narx, valyuta, narx sanasi, ERP id, SKU, tekstura rasmi, faol | Bittada `/catalog/` (namunalarsiz) | 1 281 ta bor, tozalash kerak |
| B3 | Furnitura / zapchast | `furnitura.xlsx` | Bittada ID, nom (4 yozuvda), turi, birligi, narx, ERP id, Yechim kodi | Bittada katalogi | 1 978 ta bor, narx ulanmagan |
| B4 | Komplektlar | `komplekt.xlsx` | komplekt ID, tarkibi (ID × soni); komplekt narxi hisoblanadi | namuna: `yechim dona komplekt narxi.xlsx` | yo'q |
| B5 | Yechim katalogi | `yechim.xlsx` | 8 xonali kod+Y, nom, narx, kategoriya, mos Bittada ID | Yechim'ning to'liq ro'yxati | faqat 39 qatorli namuna bor |
| B6 | Xizmat narxlari | `services.json` | xizmat ID, nom, birlik (m / list / dona / daqiqa), tannarx, mijoz narxi, amal sanasi | Bittada `widget_service` (211 ta) | bor, eksport kerak |
| B7 | Sinonim lug'ati | `synonyms.json` | atama → kanonik qiymat, til/yozuv | boshlang'ich versiyasini biz tayyorlaymiz, keyin o'sib boradi | yo'q |
| B8 | Stanok profillari | `machines.json` + namuna fayllar | stanok, format, maksimal list o'lchami, kerf, trim, teshik diametrlari | sex texnologi | yo'q |
| B9 | "Oltin to'plam" (test uchun) | papka | 20 ta real buyurtma: `.b3d` + `.project` + haqiqiy smeta + 3D rasm | Bittada serveri | tanlash kerak |

**Yakuniy qabul (B9 asosida):** 3 ta real buyurtmani (oshxona, shkaf-kupe, bolalar xonasi) haqiqiy
usta Smart3D'da qayta quradi. Talablar:
- zamerdan sex paketigacha ≤ 60 daqiqa;
- detallar soni Bazis bilan bir xil;
- listlar soni GibLab bilan ±1 farqda;
- smeta haqiqiy smetadan ±5% farqda.

---

## 14. Sunpina'dan olinadiganlar (bizda yo'q yoki zaif)

1. Har detalda QR yoki shtrix-kod bor va stanok dasturi skaner bilan ochiladi (§10).
2. Ko'p buyurtmali kroy va qoldiq ombori (§9).
3. Zavodga buyurtma bitta paket bo'lib ketadi. Sunpina'da bu sahna + narx + chizma; bizda — Sex
   paketi ZIP (§11).
4. Mijoz bosqichlari: Sunpina'dagi 17 ta bosqich Bittada'ning "Buyurtma yo'li" TZ'siga ulanadi
   (`Buyurtma-yoli_Sunpina-va-Bittada_TZ.html`, 2026-10-08).
5. Parametrik modul va min/max chegaralari (§3) — bizda bor, kengaytiriladi.
6. Butun ish bitta brauzer dasturida bajariladi (yfk20 kabi) — Smart3D ham shunday bo'ladi.

---

## 15. Bittada'da tayyor turgan narsalar (qayta yozilmasin)

Hammasi Bittada serverida, `mebelcity_platform` loyihasida:

| Nima | Qayerda |
|---|---|
| GibLab `.project` uchun aniq parser va meta | `widget_fms/services/` (`parser.py`, `bazis_meta.py`) |
| `.b3d` parser (panel, kontur, furnitura nuqtalari) | `client_erp/services/b3d_panels.py`, `b3d_render.py` |
| 3D xona + zamer + BLE lazer (ModuleCatalog) | `client_erp/module_pick_views.py`, `client_erp/templates/client_erp/module_pick.html` |
| BOM narx qoidalari va AI orqali moslash | `bom/services/pricing.py`, `bom/services/ai_smart_match.py` |
| Semantik qidiruv (pgvector + gemini-embedding-001) | `semantic/` |
| Gemini Live server-proxy | `client_erp/glive_consumer.py`, `gemini_live.py` |
| Tashqi katalogni moslash andozasi | `products/models/eman_link.py` (`ProductEmanLink`) |
| GibLab uchun `goods.xls` eksporti | `/catalog/goods-export/` |
| Xizmat narxlari | `widget_service` (`Service`, `ServicePricing`) |
| Detal QR | `client_erp` `detal_qr.html`, `ClientDetalCard` |
| MCP API | `mcp_api/` (`/api/mcp/v1/`) |

---

## 16. Ustuvorlik va muddat

**Halol baho:** to'liq ro'yxat 20.10 ga sig'maydi. Eng katta to'siq kod emas, balki **ma'lumot**:
600 ta fragment, narxlar (63% narxsiz) va stanoklarning namuna fayllari.

**P0 — 20.10 gacha (realistik qism):**
1. Material reestri v1: plita + kromka, namunalarsiz; Bittada ID, parser, sinonim lug'ati v1,
   4 yozuvda qidiruv.
2. Narxlar Bittada'dan avtomatik olinadi (API yoki kunlik eksport), xizmat narxlari ham.
3. Fragment sxemasi yakunlanadi va Excel shablon tayyorlanadi; 600 ta fragmentni kiritish boshlanadi.
4. AI-1 + AI-2 + Validator (matn bilan) va AI'siz forma rejimi.
5. Tannarx kroy natijasidagi haqiqiy list soni bilan hisoblanadi.
6. Kroy benchmark — kamida 50 ta real `.project` bo'yicha birinchi natija.
7. Altendorf uchun kroy kartasi va labellar (buning uchun namuna fayl kerak emas).
8. Butunlik nazorati (§11 dagi nazorat yig'indilari) va `eval`ni olib tashlash.

**P1 — keyin (taxminan 4–6 hafta, ma'lumotlar qachon kelishiga bog'liq):**
- 600 ta fragment;
- furnitura komplektlari va Yechim katalogi;
- Holzma, Rover, Prisadka va Kromka post-prosessorlari (namuna fayllar kelgach);
- foto-render worker va GLB eksport;
- ovoz (Yandex + Gemini Live);
- backend (login, loyihalar, mijozga havola);
- qoldiq ombori va ko'p buyurtmali kroy;
- benchmarkni 200 ta faylgacha kengaytirish.

**P2:**
- buyurtmani Bittada ERP'ga yuborish;
- obuna (boshqa sexlar uchun);
- rus va ingliz tilidagi interfeys.

---

## 17. Resurslar

| Resurs | Nima uchun | Hajmi (taxminan) |
|---|---|---|
| Dasturchi + OpenCode | asosiy qurilish | 1 kishi |
| Bazischi / konstruktor | fragmentlarni tekshirish va formulaga aylantirish | 600 × 5–10 daq ≈ 50–100 soat |
| Ombor / narx operatori | material bog'lanishlarini tasdiqlash, narxsiz plitalarga narx qo'yish | 1–2 kun + narxlar |
| Sex texnologi | stanok namuna fayllari, kerf/trim sozlamalari, sinov detallari | har bir stanokka 0,5–1 kun |
| Server | backend + render worker (CPU yetadi; GPU — renderni tezlashtirish uchun, ixtiyoriy) | — |
| API kalitlar | LLM (Claude yoki Gemini), Yandex SpeechKit, Gemini Live — faqat serverda | ishlatilishiga qarab oylik to'lov |
| Qurilmalar | planshet + telefon (Android va iPhone) sinov uchun; BLE lazer (bor) | — |

---

## 18. Xavflar

| Xavf | Daraja | Himoya |
|---|---|---|
| Stanok fayli noto'g'ri → detal brak bo'ladi yoki stanok shikastlanadi | 🔴 Yuqori | namuna fayl + sinov rejimi + texnolog tasdig'i (§10.3) |
| AI noto'g'ri o'lcham beradi | 🔴 Yuqori | faqat kutubxona fragmentlari, Validator, usta tasdig'i |
| Narxsiz material → smeta past chiqadi | 🟡 O'rta | "narx yo'q" belgisi, smeta "to'liq emas" deb belgilanadi |
| Kroy GibLab'dan yomonroq chiqadi | 🟡 O'rta | benchmark; o'tish davrida GibLab parallel ishlatiladi |
| Bittada Usta'dagi ModuleCatalog bilan dublikat | 🟡 O'rta | §19, 2-savol |
| Material noto'g'ri bog'lanadi | 🟡 O'rta | AI faqat taklif beradi, odam tasdiqlaydi, test to'plami |
| Bittada ERP'ga zarar | 🟢 Past | Bittada'dan faqat o'qiladi; u yerdagi har bir o'zgarish alohida TZ bilan; **moliya qismiga hech narsa yozilmaydi** |

---

## 19. Ochiq savollar (javobingiz kerak)

1. Prisadka va kromka stanoklarining modeli qanday? "Homag" deganingiz Holzma arrami yoki alohida
   Homag CNC ham bormi?
2. Smart3D va Bittada Usta'dagi "3D xona/modullar" (ModuleCatalog — zamer + BLE lazer):
   birlashtiramizmi yoki Smart3D alohida mahsulot bo'ladimi?
3. Smart3D qayerda turadi: Sobir tunneli orqali (lokal kompyuterda) yoki serverda?
4. Bittada ID formati `KAT-NNNNN` sizga ma'qulmi?
5. Smeta narxi qachon muzlatiladi: mijozga yuborilganda yoki shartnoma tuzilganda?
6. Yechim'ning to'liq katalogini (8 xonali kodlar + narxlar) qayerdan olamiz — Excel'da bera oladimi?

---

## 20. Tegilmaydi

- kroy.bittada.uz va tunel.bittada.uz — faqat o'qiladi. code.bittada.uz ga kirilmaydi.
- Bittada ERP (`mebelcity_platform`) — bu TZ bo'yicha unda hech narsa o'zgartirilmaydi, faqat
  o'qiladi. Moliya (`finance/`) qismiga umuman tegilmaydi.
- Infratuzilmaga (nginx, systemd) tegilmaydi.
