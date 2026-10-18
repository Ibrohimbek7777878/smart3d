# Smart3D — dizayn topshirig'i (Claude Design uchun)

**Sana:** 2026-10-15 · **Egasi:** Bittada · **Til:** barcha ekran matni — o'zbek (lotin)

> **Bu hujjat kim uchun:** Claude Design (yoki istalgan dizayner).
> Hujjatda loyiha haqida hamma narsa bor: Smart3D nima, kim uchun, nimani hal qiladi, hozir nima tayyor va dizayn qanday bo'lishi kerak.
> Bu yerdagi raqamlarning hammasi **haqiqiy** — ilova kodidan va MebelCity sexining haqiqiy modullaridan hisoblangan.
> Raqam, mijoz soni, sharh yoki narxni **o'ylab topish taqiqlangan** (8-bo'lim).

---

## 0. Qisqacha (30 soniyada)

1. **Smart3D** — mebel ustalari uchun brauzer ilovasi. Ish tartibi: xona o'lchanadi → tayyor modullar joylanadi → mijozga 3D ko'rsatiladi. Detallar ro'yxati, raskroy, smeta va stanok fayllarini ilova **o'zi** chiqaradi.
2. **Kerakli dizayn — 2 qism:**
   - **(A) Landing** — ro'yxatdan o'tishdan oldingi sahifa. Smart3D nima ekanini tushuntiradi, karusel va 3D animatsiya bilan qiziqtiradi va ro'yxatdan o'tkazadi.
   - **(B) Ilova** — ro'yxatdan keyin. Juda sodda: 4 qadam (**Xona → Mebel → Narx → Fayllar**).
3. **Asosiy "ilmoq":** 3D modul. Avval rangsiz, keyin rangli ko'rinadi, keyin bo'laklarga sochiladi: har detal nomi va o'lchami bilan, har zapchast soni bilan. Mehmon o'lchamni o'zi o'zgartirib ko'radi; saqlash va fayllar uchun ro'yxatdan o'tadi.
4. **Uslub** — Bittada Usta ilovasi bilan bir oila (`Smart3D_malumot/dark_namuna/`):
   - qorong'i **va** yorug' rejim;
   - laym (#DCF262) aksent;
   - Plus Jakarta Sans shrifti;
   - katta yumaloq kartalar.

---

## 1. Smart3D nima va qanday ishlaydi

**Bir jumlada:** usta telefonida yoki kompyuterida mebel loyihasini 15 daqiqada chizadi va sex uchun kerakli hamma narsani — detal, kroy, narx, stanok fayli — o'sha zahoti oladi.

**Ish zanjiri (ilovada hozir ishlaydi):**

```
1. ZAMER        2. MEBEL            3. 3D / 2D           4. NARX                 5. FAYLLAR
xona o'lchami → tayyor modullar  → mijozga ko'rsatish → detal + kroy + smeta → sex va stanok uchun
(devor, deraza, (o'lchami min/max   (aylantirish,        (plita soni, kromka,    (Excel, kroy xaritasi,
 quvur, rozetka) chegarasida)        foto, 360°)          zapchast, tannarx)      GibLab, DXF, G-code…)
```

**Har qadamda nima sodir bo'ladi:**
- **Zamer:** xona eni, chuqurligi va bo'yi. Shakli to'rtburchak, L-shakl yoki ixtiyoriy ko'pburchak. Teshiklar (deraza, eshik), quvur va rozetka qo'shiladi.
- **Mebel:** katalogdan modul tanlanadi.
  - Har modul **parametrik** — enini o'zgartirsangiz, ichidagi har detal formulasi bo'yicha qayta hisoblanadi. Masalan, 2 eshikli shkaf eni 800 mm bo'lsa, har eshik (800 − 4) / 2 = **398 mm**.
  - Har modulning **min/max** chegarasi bor (sex standartlari). Chegaradan chiqsa, ogohlantirish chiqadi: `⚠️ eni 1500 mm > max 1070 → 1070 ga siqildi`.
  - Oshxona uchun stoleshnitsa, sokol, dobor, karniz va moyka avtomatik quriladi.
- **AI:** o'zbekcha matn yoki ovoz orqali, masalan: *"oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf"*. AI xonani va mebelni o'zi joylaydi.
- **Narx:**
  - plitalar haqiqiy raskroy (nesting) bo'yicha hisoblanadi — necha varaq ketgani;
  - kromka metri, zapchast, teshiklar va ish haqi qo'shiladi → **sex tannarxi** va **mijozga narx**;
  - narxi bazada yo'q zapchast — **"narx yo'q"** deb ochiq ko'rsatiladi, o'ylab topilmaydi.
- **Fayllar** — 17 xil:
  - **Mijozga:** chop etiladigan hisobot (A4/PDF), 1080p rasm, 360° panorama, GLB (3D/AR).
  - **Sexga:** Excel smeta (5 bo'lim), detallar CSV.
  - **Stanokka:** GibLab (.project), XNC, DXF, G-code, NC (Excellon), PTP, Biesse (.cix), Homag (.mpr), Altendorf formatka.
  - **Boshqa:** OBJ, teshiklar JSON, loyiha fayli (qayta ochish uchun).

**Haqiqiy raqamlar** (marketingda faqat shular ishlatiladi):

| Nima | Raqam | Manba |
|---|---|---|
| Tayyor modullar | **121** (83 umumiy + 38 MebelCity sexining haqiqiy Bazis modullari) | `fragments.json`, `fragments-mc.json` |
| ERP katalogi | **1 281** plita, **1 978** zapchast — haqiqiy SKU bilan | `materials-index.json`, `furnitura-catalog.json` |
| Fayl formatlari | **17** | Export bo'limi |
| Tekshirilgan qurilmalar | **7** (360 px Android'dan 1920 px kompyutergacha) | brauzer testlari |
| Misol: 3 m oshxona | 7 modul + stoleshnitsa + sokol → **82 detal, 6 varaq** | sinov oshxonasi |

---

## 2. Kimlar uchun (foydalanuvchilar)

| Kim | Qayerda, nima bilan | Nima kerak | Dizaynga ta'siri |
|---|---|---|---|
| **Usta** (asosiy) | Sexda yoki mijoz uyida, **telefon** qo'lida, chang, qo'lqop, quyosh | tez chizish, o'lchamni xatosiz kiritish, mijozga ko'rsatish | katta tugmalar (≥ 44 px), yuqori kontrast, qorong'i rejim, kam matn |
| **Sex egasi** | Ofisda, kompyuter | narx, tannarx, foyda, kroy xaritasi, stanok fayli | aniq jadvallar, katta raqamlar, eksport bir joyda |
| **Zamerchi / dizayner** | Mijoz oldida, planshet | chiroyli 3D, rasm, 360° | to'liq ekranli 3D, bir tugmada rasm |
| **Mijoz** (ilovaga kirmaydi) | Telegram'da rasm yoki PDF oladi | ko'rinishi va narxi | hisobotda Bittada logosi, sodda kotirovka |

**Odatdagi usta:** 25–50 yosh, Bazis'ni bilmaydi yoki u qimmat va murakkab, kompyuteri yo'q bo'lishi mumkin. Telegram va telefon ilovalariga o'rgangan.

---

## 3. Muammo → yechim (landing uchun asos)

| Ustaning og'rig'i | Smart3D'da |
|---|---|
| Bazis qimmat, murakkab, faqat kompyuterda | Brauzerda, telefonda ham ishlaydi, o'rnatish shart emas |
| Detallarni qo'lda hisoblash — xato, plita isrof | Detallar formulada o'zi chiqadi, raskroy avtomatik |
| Narxni hisoblash soatlab ketadi, zapchast unutiladi | Har modulning zapchasti ichida; smeta bir zumda |
| Mijoz chizmani tushunmaydi | 3D, 1080p rasm, 360° tur |
| Stanokka fayl tayyorlash — alohida dastur | GibLab, DXF, G-code, Biesse, Homag — bir tugma |
| "Narx qayerdan chiqdi?" degan savol | Har raqamning manbasi bor; narxsiz zapchast "narx yo'q" deb belgilanadi |

---

## 4. Brend va dizayn tizimi

### 4.1 Ranglar — Bittada tokenlari (`Smart3D_malumot/README.txt`)

| Token | Qorong'i | Yorug' | Qayerda |
|---|---|---|---|
| `--bg` fon | `#0D0C10` | `#F3F1EA` | sahifa foni |
| `--sfc` karta | `#1E1D24` | `#FFFFFF` | kartalar, panellar |
| `--sfc2` 2-daraja | `#29282F` | `#F1EFE8` | karta ichidagi blok, input |
| `--txt` matn | `#F5F4F7` | `#1B1A20` | asosiy matn |
| `--mut` xira matn | `#9B9AA3` | `#6E6C76` | izoh, birlik |
| `--line` chiziq | `rgba(255,255,255,.10)` | `rgba(0,0,0,.13)` | chegara |
| `--acc` laym | `#DCF262` | `#DCF262` | asosiy tugma **foni**, faol tab |
| `--acc-text` | `#DCF262` | `#5C8A0C` | laym **matn** (yorug'da to'q yashil — laym o'qilmaydi) |
| `--acc-ink` | `#1B1A20` | `#1B1A20` | laym ustidagi matn |
| `--danger` | `#F58B8B` | `#DC5B5B` | xato, "narx yo'q", chegaradan tashqari |
| `--pch` shaftoli | `#F5A48B` | — | chiqim, ogohlantirish |
| `--cyan` | `#A6E6F2` | — | ma'lumot, o'lcham chiziqlari |
| `--lav` | `#C9B4F7` | — | ikkinchi darajali belgi |

- **Qoida 6.1:** har ekran **ikkala rejimda** ham chiziladi. Standart rejim — qurilma sozlamasi bo'yicha; topbar'da ☀ tugmasi bilan almashtiriladi.

### 4.2 Shrift va o'lchamlar
- **Plus Jakarta Sans** (Google Fonts), raqamlarda `tabular-nums`.
- **Shkala:** 12 / 14 / **16 (asosiy matn)** / 20 / 24 / 32 / 48 (landing sarlavhasi, telefonda 32).
- **Narx va katta raqamlar:** 24–32, qalin 700, `--acc-text` rangida (namunadagidek).
- **Raqam formati:**
  - pul — `3 326 349 so'm` (minglar probel bilan);
  - o'lcham — `600×450×708 mm`;
  - telefon — `+998 90 123 45 67` (qoida S1).

### 4.3 Shakl
- **Radius:** karta 24 · tugma 16 yoki to'liq pill · input 14 · chip pill.
- **Oraliq:** 4 / 8 / 12 / 16 / 24 / 32 / 48. Telefonda chetdan 16 px.
- **Soya:** qorong'ida soya yo'q, faqat `--line` chegara; yorug'da yengil soya (`0 1px 2px rgba(0,0,0,.06)`).
- **Ikonlar:** chiziqli, yumaloq uchli (Lucide yoki Phosphor), 20–24 px. Emoji faqat dekor sifatida, ma'no tashimaydi.
- **Topbar tugmalari:** yumaloq kvadrat 44×44, `--sfc` fon (namunadagi `+`, `☀`, `🌐`, avatar kabi).

### 4.4 Logo (qoida 6.3 va S4 — **o'chirilmaydi**)
- **Belgi:** Bittada belgisi — laym fonli yumaloq kvadrat ichida "B" (6-skrinshotda). Logo faylini egasi beradi; hozircha shu shakl.
- **Mahsulot nomi:** `Smart3D` ("3D" — `--acc-text`), ostida kichik `by Bittada`.
- **Har chiqadigan hujjatda Bittada logosi bo'ladi:** PDF hisobot, Excel, chop etish, 1080p rasm, 360°. Usta (sex) logosi ham chiqadi, lekin Bittada'nikidan kichikroq.

### 4.5 Harakat (animatsiya)
- **UI:** 150–250 ms, `ease-out`.
- **3D:** silliq, 60 fps maqsad, 600–1200 ms o'tishlar.
- **`prefers-reduced-motion`:** animatsiyalar o'chadi, faqat statik holatlar va tugmalar qoladi.
- **Landingdagi og'ir 3D:** ekranga kelganda yuklanadi (lazy). Kuchsiz telefonda — avval rasm, keyin 3D.

---

## 5. Sayt xaritasi

```
/                 Landing (ro'yxatdan o'tishgacha)
/royxat           Ro'yxatdan o'tish
/kirish           Kirish
/boshlash         Onboarding (faqat birinchi marta, ≤ 3 qadam)
/loyihalar        Loyihalarim (ro'yxat)
/loyiha/:id       Muharrir: Xona → Mebel → Narx → Fayllar (+ ✨ AI)
/sozlamalar       Profil, sex nomi va logosi, tema, til
```

---

## 6. (A) LANDING — bo'limma-bo'lim

**Maqsad:** mehmon 10 soniyada tushunadi → 3D bilan o'ynaydi → "o'zimniki kerak" deydi → ro'yxatdan o'tadi.
**Usul:** o'ynab ko'rish bepul, natijani **saqlash va fayllarni olish** — ro'yxatdan keyin.

### 6.1 Topbar (yopishqoq)
- **Chapda:** logo.
- **O'rtada** (kompyuterda): `Imkoniyatlar` · `Qanday ishlaydi` · `Kimlar uchun` · `Savollar`.
- **O'ngda:** ☀/🌙 · `Kirish` (oddiy tugma) · **`Ro'yxatdan o'tish`** (laym).
- **Telefonda:** logo, ☀ va **`Boshlash`**. Menyu ☰ ichida.

### 6.2 Hero — birinchi ekran
- **Sarlavha** (variantlar, birini tanlang):
  - **"Zamerdan stanokkacha — bitta ilovada, telefoningizda."**
  - "Mebelni chizing. Kroy, narx va stanok fayli o'zi chiqadi."
- **Ost matn:** "Smart3D — mebel ustalari uchun. Xonani o'lchang, tayyor modullarni joylang, mijozga 3D'da ko'rsating. Detallar, raskroy va smeta — avtomatik."
- **Tugmalar:** **`Bepul sinab ko'rish`** → pastdagi 3D demo (6.4) · `Ro'yxatdan o'tish`.
  - *"Bepul" so'zi tarif aniq bo'lgandagina qoladi — egasi tasdiqlaydi.*
- **Fakt chiplari** (faqat haqiqiylari): `121 ta tayyor modul` · `17 xil fayl` · `Telefonda ham ishlaydi` · `O'zbek tilida AI`.
- **Vizual:** o'ngda (telefonda tepada) — **3 m oshxonaning 3D sahnasi**:
  - sekin aylanadi;
  - barmoq yoki sichqoncha bilan buriladi;
  - 3 soniyadan keyin bitta modul (pastki shkaf) ajralib chiqadi va "ichida nima bor?" yorlig'i chiqadi → bosilsa 6.4 ga tushadi.

### 6.3 Muammo → yechim
3 ta karta. Har kartada chapda og'riq (`--pch` rangida, ikon bilan), o'ngda yechim (`--acc-text`, ✓ bilan):
1. "Detalni qo'lda hisoblaysiz — xato va plita isrof" → "Detallar va raskroy o'zi chiqadi"
2. "Narx soatlab hisoblanadi, zapchast unutiladi" → "Smeta bir zumda, zapchast ichida"
3. "Mijoz chizmani tushunmaydi" → "3D, rasm va 360° tur"

### 6.4 ⭐ "Modul ichida nima bor?" — asosiy 3D animatsiya
Landingning yuragi. Haqiqiy MebelCity moduli — **pastki shkaf "1 polka, 2 eshik"** (`MC-KP-02`, 600×450×708 mm). Ma'lumoti Ilova A da.

**Sahna — bitta 3D oyna** (kompyuterda ekranning 60%, telefonda to'liq kenglik, 4:5). Ostida boshqaruv paneli.

**Avtomatik ssenariy** — ekranga kelganda bir marta o'ynaydi, keyin mehmon o'zi boshqaradi:

| # | Holat | Nima ko'rinadi | Davomi |
|---|---|---|---|
| 1 | **Rangsiz** | Oq-kulrang "chizma" modul: detallar chegarasi ingichka chiziq bilan, o'lcham chiziqlari (`--cyan`): 600 / 450 / 708 | 1,5 s |
| 2 | **Rangli** | Material "quyiladi": korpus — oq LDSP, eshiklar — yog'och tekstura, kromka chetlari ko'rinadi | 1,2 s |
| 3 | **Sochilish** | Har detal o'z tekisligiga perpendikulyar uchib ajraladi (eshiklar oldinga, yon devorlar yonga, orqa devor orqaga, polka tepaga). Har biri yonida yorliq: **nom + o'lcham** (`Yon devor · 692×450`) | 1,5 s |
| 4 | **Zapchastlar** | Detallar orasida zapchastlar paydo bo'ladi: ruchka, oyoqcha, polka ushlagich, mahkamlagich — har birida **soni** (`×4`) | 1,2 s |
| 5 | **Hisob** | Yonda (telefonda pastda) hisoblagichlar 0 dan sanaladi: **10 detal · 26 zapchast · 7,8 m kromka · 2,1 m²** | 0,8 s |
| 6 | **Yig'ilish** | Hammasi qaytib yig'iladi va modul sekin aylanadi | 1,2 s |

**Mehmon boshqaruvi** (barmoq bilan ham, tugma bilan ham — qoida 6.2):
- `Rangli | Rangsiz` — segmentli almashtirgich. **Sochilgan holatda ham ishlaydi** — rangsiz sochilganda detallarning shakli, rangli sochilganda material ko'rinadi.
- **"Sochish" slayderi** (0–100%) — sudrab, detallarni asta ajratish.
- Detal **bosilsa** — kartochka: nomi, tayyor o'lchami, materiali, kromkasi (qaysi tomonlar).
- **Eni slayderi 600 → 1070 mm** (modulning haqiqiy min/max chegarasi). Sudralganda:
  - detallar jonli o'zgaradi: eshik `298 → 398 mm` (eni 800 da), polka `568 → 768 mm`;
  - hisoblagichlar ham yangilanadi.
  - Bu Smart3D'ning "parametrik" kuchini ko'rsatadi.
- **Ostidagi tablar:** `Pastki shkaf (10 detal)` · `Osma shkaf (8 detal)` · `Shkaf-kupe (41 detal)`. Raqamlar Ilova A da.
- **CTA:** `Bu modulni loyihamga qo'shish` → ro'yxatdan o'tish. Ro'yxatdan keyin modul **shu o'lcham bilan** yangi loyihada turadi — mehmonning ishi yo'qolmaydi.

**Texnik eslatma:** 3D model o'ylab chizilmaydi — ilovaning o'z GLB eksportidan (`buildGLB`) va o'z detal hisobidan (`cutlist`) olinadi. Shunda landing va ilova raqamlari doim bir xil.

### 6.5 "Qanday ishlaydi" — karusel (5 qadam)
- **Har slaydda:** chapda qadam raqami, sarlavha va 1 qator matn; o'ngda ilova skrinshoti yoki qisqa video (telefon ramkasida).
  1. **Zamer** — "Xona o'lchamini kiriting yoki AI'ga ayting"
  2. **Mebel** — "Tayyor modulni tanlang — o'lchami o'zi moslashadi"
  3. **3D** — "Mijozga ko'rsating, rasm va 360° tur yuboring"
  4. **Narx** — "Plita, kromka, zapchast — tannarx va mijoz narxi"
  5. **Fayllar** — "Kroy xaritasi, Excel va stanok fayli — bir tugmada"
- **Boshqaruv:** 5 s da avtomatik o'tadi; sichqoncha ustida yoki barmoq tekkanda to'xtaydi. Barmoq bilan suriladi, nuqtalar bosiladi, ← → tugmalar ishlaydi.
- **4-slaydda kichik animatsiya:** detallar plita varag'iga "tushib" joylashadi (raskroy). Ostida: `6 varaq · 82 detal` (3 m oshxona misoli).

### 6.6 Nimalar olasiz — 3 ustun
- **Mijozga:** 3D, 1080p rasm, 360° tur, PDF hisobot.
- **Sexga:** detallar ro'yxati, raskroy xaritasi, Excel smeta.
- **Stanokka:** GibLab, DXF, G-code, Biesse, Homag, Altendorf.
- Fayl nomlari kichik "chip"larda. Kompaniya logotiplari ishlatilmaydi — faqat format nomi.

### 6.7 Kimlar uchun
3 karta: **Usta** · **Sex egasi** · **Dizayner / zamerchi** — har birida 3 ta foyda (2-bo'limdan).

### 6.8 Savollar (akkordeon)
- "Bazis kerakmi?" → Yo'q, brauzerda ishlaydi.
- "Telefonda ishlaydimi?" → Ha, 360 px ekrandan boshlab tekshirilgan.
- "Narxlar qayerdan olinadi?" → ERP katalogidagi haqiqiy narxdan. Narx yo'q bo'lsa, "narx yo'q" deb ko'rsatiladi.
- "Internetsiz ishlaydimi?" → Ochilgan ilova internetsiz ham ochiladi (PWA).
- "Narxi qancha?" → **[egasi yozadi]**

### 6.9 Yakuniy chaqiriq + footer
- **Katta karta:** "Birinchi loyihangizni hoziroq chizing" + `Ro'yxatdan o'tish`.
- **Footer:** Bittada logosi, aloqa **[egasi beradi]**, til, ☀.

### 6.10 Landing qoidalari ("majbur qilish", lekin halol)
- ✅ **Mumkin:**
  - ro'yxatdan o'tmasdan 3D demo bilan o'ynash;
  - saqlash, smeta, kroy va fayl yuklash — ro'yxatdan keyin;
  - demo natijasi loyihaga o'tadi.
- ❌ **Mumkin emas:**
  - soxta sharh, soxta "1000+ usta" kabi raqam;
  - soxta taymer yoki "faqat bugun";
  - kirishda to'liq ekranni yopuvchi oyna.

---

## 7. Ro'yxatdan o'tish va kirish

**Bitta ekran, bitta karta, 3 maydon.** Chapda (kompyuterda) — kichik aylanuvchi 3D modul va 3 ta foyda.

| Maydon | Turi | Tekshiruv |
|---|---|---|
| Ismingiz | matn | majburiy |
| Telefon | `+998 __ ___ __ __` maska | 9 raqam; bazaga `998XXXXXXXXX` (qoida S1) |
| Parol | parol, 👁 ko'rsatish tugmasi bilan | kamida 8 belgi, kuchi chiziqcha bilan ko'rsatiladi |
| Sex nomi | matn, **ixtiyoriy** | — |

- **Asosiy tugma:** `Ro'yxatdan o'tish`. Ostida: `Akkauntingiz bormi? Kirish`.
- **Xatolar** maydon ostida, oddiy tilda:
  - "Bu raqam bilan akkaunt bor — kirish";
  - "Parol kamida 8 belgi".
- **Kirish ekrani:** telefon + parol + `Kirish`.
- **⚠️ Dasturchi uchun:**
  - hozirgi server email bilan ro'yxatdan o'tkazadi (`/api/register`: email, parol, ism, telefon). Telefon bilan kirish uchun server ham o'zgaradi — alohida TZ;
  - "parolni tiklash" hozir yo'q.

---

## 8. Onboarding (faqat birinchi kirishda, ≤ 3 qadam)

1. **"Nima yasaymiz?"** — 4 ta katta karta, ikonli:
   - `🍳 Oshxona`
   - `🚪 Shkaf / garderob`
   - `🛏 Boshqa mebel`
   - `✨ AI'ga aytib beraman`
2. **"Xona o'lchami"** — tayyor tugmalar `3.6×3 m` · `4.2×3.1 m` · `5×4 m` · `6×4 m` yoki o'z o'lchami. AI tanlangan bo'lsa — matn maydoni va 🎤 tugmasi.
3. **Muharrir ochiladi.** 3 ta qisqa maslahat pufakchasi chiqadi (o'tkazib yuborsa bo'ladi):
   - "Modulni sudrang";
   - "Ikki barmoq — kattalashtirish";
   - "Narx doim tepada".

---

## 9. (B) ILOVA — ro'yxatdan keyin

### 9.1 Asosiy tamoyil: **4 qadam, hammasi bitta ekranda**
Hozirgi 5 tab (Zamer, Katalog, AI, Smeta, Export) **4 qadamli yo'lga** aylanadi:

```
① Xona  →  ② Mebel  →  ③ Narx  →  ④ Fayllar          ✨ AI — har doim pastda o'ngda suzuvchi tugma
```

- Qadamlar raqamli va tartibli, lekin istalganiga o'tsa bo'ladi.
- Tugagan qadamda ✓ belgisi.
- **Narx doim ko'rinadi** — topbar'da laym rangli chip: `5 701 103 so'm`. Narx to'liq bo'lmasa, yonida `*` va "to'liq emas" yozuvi.

### 9.2 Joylashuv
**Kompyuter (≥ 1024 px):**
```
┌───────────────────────────────────────────────────────────────────────────┐
│ [B] Smart3D   Loyiha: Oshxona-Aziza ✎      [5 701 103 so'm]  ☀  🌐  (JA) │
├────────────┬──────────────────────────────────────────────┬───────────────┤
│ ① Xona  ✓  │                                              │  Qadam paneli │
│ ② Mebel    │            2D / 3D SAHNA                     │  (tanlangan   │
│ ③ Narx     │      [2D|3D]  📸  🔄360°  ⌖                   │   qadamning   │
│ ④ Fayllar  │                                              │   mazmuni)    │
│            │  ┌ Tanlangan modul kartasi ┐                 │               │
│ Loyihalar  │  │ Eni [–] 800 [+]  ...     │                 │               │
│ Sozlamalar │  └──────────────────────────┘          (✨AI) │               │
└────────────┴──────────────────────────────────────────────┴───────────────┘
```
**Telefon (< 768 px):**
- tepada — topbar va narx chipi;
- o'rtada — sahna (ekranning ~55%);
- pastda — **tortiladigan panel** (bottom sheet: 3 holat — yig'iq, yarim, to'liq);
- eng pastda — 4 qadamli menyu (Bittada Usta'dagi pastki menyu uslubida).
- Tanlangan modul kartasi ham bottom sheet bo'ladi.

**Planshet:** kompyuter joylashuvi, chap menyu faqat ikonlar bilan.

### 9.3 Sahna (2D/3D) — qoida 6.2: ishora asosiy, tugma zaxira
- **Sudrash** — modulni surish (devorga va qo'shni modulga yopishadi).
- **Ikki barmoq** — kattalashtirish va surish.
- **Burish:**
  - 3D'da — kamerani aylantirish;
  - modulni burish — **aylana dastagi** bilan (tanlanganda paydo bo'ladi). ⟳ 90° tugmasi zaxira. *Bu hozir yo'q — yangi.*
- **Modul tanlansa:** kontur `--acc` rangida, o'lcham chiziqlari `--cyan`.
- **Tugmalar:** `2D | 3D` segment · `📸 Rasm (1080p)` · `🔄 360°` · `⌖ Markazga`.

### 9.4 Tanlangan modul kartasi
- **Sarlavha:** nom va kod chipi (`MC-KP-02`).
- **O'lchamlar** — 3 qator: Eni / Chuqurligi / Bo'yi.
  - Har qatorda `[–] 800 [+]` stepper: ±10 mm, ustiga bosib yozsa ham bo'ladi.
  - Ostida kichik `min 600 · max 1070`.
- **Chegaradan chiqsa** — `--danger` qatori: `⚠️ eni 1500 mm > max 1070 → 1070 ga siqildi`.
- **Tugmalar:** `◀ ▶` (50 mm surish) · `⟳ 90°` · `⧉ Nusxa` · `🗑 O'chirish`.
  - O'chirishda o'z oynasi (8.4) chiqadi — brauzerning `confirm()` oynasi emas.
- **"Ichini ko'rish"** tugmasi → landingdagi kabi **sochilgan ko'rinish**: shu modulning detallari va zapchastlari. Ilovada ham shu "vau" bo'lsin.

### 9.5 ① Xona
- **Shakl tanlash:** `▣ To'rtburchak` · `◩ L-shakl` · `✎ Erkin` (nuqtalar bilan).
- **O'lchamlar:** Eni / Chuqurligi / Bo'yi (mm) + tayyor o'lcham chiplari.
- **Teshiklar** (deraza, eshik): turi, kengligi, devori → ro'yxat.
- **Quvur / rozetka:** turi, devori, boshlanishi, balandligi.
- **Oshxona elementlari** — kalitlar: Stoleshnitsa · Sokol · Dobor (balandligi) · Karniz (balandligi) · Moyka (o'lchami, boshlanishi, devordan masofasi).

### 9.6 ② Mebel
- **Tepada** — qidiruv: "shkaf 2 eshik…".
- **Kategoriya chiplari:** Barchasi · Oshxona pastki · Oshxona ustki · Penal · Shkaf · Krovat · Stol · Hammom · Javon…
- **Modul kartasi:**
  - kichik 3D rasm (izometrik);
  - nom;
  - `600×450×708 mm`;
  - `min 600 · max 1070`;
  - taxminiy narx `~504 865 so'm`.
- **Qo'shish:** karta bosilsa — sahnaga qo'shiladi; kompyuterda sudrab ham tashlasa bo'ladi.
- **Materiallar** (shu qadamda, tepada): `Korpus: LDSP 16` · `Fasad: MDF 18` + ERP qidiruvi ("Эггер 18…") → narx shu zahoti yangilanadi.

### 9.7 ③ Narx
- **Tepada 3 ta katta raqam kartasi** (namunadagi kabi):
  - `Mijozga narx` (laym);
  - `Sex tannarxi`;
  - `Foyda (+35%)`.
- **"Mijozga kotirovka" jadvali:** modul · o'lcham · soni · narx.
- **"Sex tannarxi" jadvali:**
  - plitalar (varaq soni, m²);
  - kromka (m);
  - zapchast (dona);
  - teshiklar;
  - ish haqi.
- **Narxi yo'q qator** — `--danger` belgisi: `⚠️ 12 ta zapchastning narxi bazada yo'q — 0 deb olindi`. Bosilsa, ro'yxati ochiladi.
- **Raskroy:**
  - varaq rasmlari karusel bo'lib chiqadi (detallar rangli, qoldiq kulrang);
  - ostida `6 varaq · 82 detal · isrof %`;
  - `⚙️ Parametrlar` (arra qalinligi, trim, qoldiq) — alohida oynada.
- **Detallar ro'yxati:** ixcham jadval, guruhlab yig'iladi.

### 9.8 ④ Fayllar
Uch guruh, katta kartalar. Har birida **bitta asosiy tugma**, qolganlari "Yana" ichida:
- **Mijozga:** `🖨 Hisobot (PDF)` · `📸 Rasm` · `🔄 360°` · `GLB (3D/AR)`
- **Sexga:** `📊 Excel smeta` · `Detallar (CSV)` · `Loyiha fayli`
- **Stanokka:** `GibLab` · `DXF` · `G-code` · `Biesse` · `Homag` · `PTP` · `NC` · `XNC` · `Altendorf`

Qo'shimcha:
- **Tepada — "Tekshiruv" kartasi:** ✓ yoki ⚠️ ro'yxati (masalan, "2 ta detal sig'madi").
- **Bazis (BPJ):** ko'rsatilmaydi yoki "tez orada" deb kulrang turadi (qoida S5 — Bazis eksporti pauzada).

### 9.9 ✨ AI (suzuvchi tugma)
- **Pastdan panel ochiladi:**
  - katta matn maydoni;
  - `🎤 Ovoz` tugmasi;
  - 3 ta misol chip: *"oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf"*, *"4.2x3.1 xona, 1 garderob, 1 stol"*, *"5x4 mehmonxona, divan, 2 ta toko"*.
- **`🪄 Qurish`** — loyiha bo'sh bo'lmasa, o'z oynasi chiqadi: "Joriy 7 ta mebel almashtiriladi. Davom etasizmi?" `[Bekor] [Almashtirish]`.

### 9.10 Loyihalarim
- **Kartalar to'ri:** 3D eskiz, nom, mijoz, sana, narx chipi.
- **Tepada:** `+ Yangi loyiha` (laym) va qidiruv.
- **Bo'sh holat:** rasm + "Birinchi loyihangizni boshlang" + tugma.

---

## 10. Komponentlar (bitta to'plam — landing va ilova uchun)

| Komponent | Variantlar |
|---|---|
| Tugma | asosiy (laym), ikkinchi (`--sfc2`), xavfli (`--danger`), ikon-tugma 44×44; holatlar: oddiy / ustida / bosilgan / o'chiq / yuklanmoqda |
| Input | matn, raqam + `mm` birlik, telefon maskasi, parol 👁, xato holati |
| Stepper | `[–] 800 [+]` · min/max izohi |
| Segment | `2D \| 3D`, `Rangli \| Rangsiz` |
| Chip | filtr, fakt, kod (`MC-KP-02`), holat (`narx yo'q`) |
| Karta | oddiy, raqam kartasi (sarlavha + katta raqam + izoh), modul kartasi, loyiha kartasi |
| Badge | laym (`1 ta · 49 900 000`), qizil (`27 kun kech`) — namunadagidek |
| Bottom sheet | 3 holatli (telefon) |
| Oyna (modal) | tasdiq (`confirm()` o'rniga), parametrlar |
| Toast | muvaffaqiyat, xato, ma'lumot — pastda, 3 s |
| Karusel | nuqtalar, ← →, barmoq bilan surish, avtomatik o'tish |
| 3D ko'rsatkich | sahna + boshqaruv paneli + yorliqlar (sochilgan detal nomi va o'lchami) |
| Bo'sh holat | rasm + 1 qator + tugma |
| Skelet | yuklanayotgan karta va jadval |

---

## 11. Holatlar (har ekran uchun chizilsin)

- **Yuklanmoqda:** logo va ingichka laym chiziq (hozirgi `boot` ekrani o'rniga).
- **Internet yo'q:** tepada sariq qator "Internet yo'q — o'zgarishlar qurilmada saqlanmoqda".
- **Xato:** karta ichida, oddiy tilda, `Qayta urinish` tugmasi bilan.
- **Narx yo'q:** qizil chip va izoh — hech qachon yashirilmaydi.
- **Chegaradan tashqari o'lcham:** 9.4 dagi qator.
- **Bo'sh katalog yoki qidiruv:** "Topilmadi — boshqa so'z bilan qidiring".

---

## 12. Moslashuvchanlik va qulaylik

- **Tekshiriladigan o'lchamlar** (ilova testlaridagi matritsa):
  - 360×740 (Android)
  - 390×844 (iPhone)
  - 844×390 (telefon yonboshda)
  - 768×1024 (iPad)
  - 1024×768 (iPad yonboshda)
  - 1366×768 (noutbuk)
  - 1920×1080 (kompyuter)
- **Gorizontal aylantirish yo'q.** Bosiladigan joy ≥ 44×44 px.
- **Kontrast:** WCAG AA. Yorug' rejimda laym matn ishlatilmaydi — `--acc-text` (#5C8A0C).
- **Fokus halqasi** `--acc` rangida — klaviatura bilan ham ishlaydi.
- **Asosiy matn ≥ 16 px.** Raqamlar — `tabular-nums`.

---

## 13. Qat'iy qoidalar (dizaynda buzilmaydi)

1. Qorong'i **va** yorug' rejim — har ekranda (6.1).
2. 3D'da boshqaruv — ishora; tugma — zaxira (6.2).
3. Bittada logosi har chiqadigan hujjatda; usta logosi kichikroq (6.3, S4).
4. Raqam, narx, sharh **o'ylab topilmaydi**; narx yo'q bo'lsa "narx yo'q" (4.3).
5. Brauzerning oddiy oynalari (`confirm`, `alert`) yo'q — faqat o'z oynalarimiz.
6. Xizmatlar (yig'ish, yetkazish) smetaga **avtomatik qo'shilmaydi** — usta o'zi tanlaydi (S3).
7. Bazis eksporti reklama qilinmaydi (S5 — pauzada).
8. Telefon formati `+998 XX XXX XX XX` (S1); miqdorlar butun son (S2).
9. Barcha matn o'zbek (lotin), qisqa, oddiy so'zlar. Texnik so'zlar ustaning tilida: zamer, kroy/raskroy, kromka, fasad, korpus, stoleshnitsa, sokol, zapchast, LDSP, HDF.

---

## 14. Claude Design'dan kutilayotgan natija

1. **Dizayn tizimi sahifasi:**
   - ranglar (2 rejim), shrift, radius, oraliq;
   - 10-bo'limdagi barcha komponentlar va ularning holatlari.
2. **Landing** — telefon (390) va kompyuter (1440), **ikkala rejimda**:
   - hamma bo'limlar (6.1–6.9);
   - 6.4 3D animatsiyasining 6 ta kadri (storyboard) va boshqaruv paneli.
3. **Ro'yxat, kirish, onboarding** — telefon va kompyuter.
4. **Ilova:**
   - Loyihalarim (bo'sh va to'la);
   - muharrir — 4 qadamning har biri;
   - tanlangan modul kartasi (oddiy va ogohlantirish bilan);
   - sochilgan ko'rinish;
   - AI paneli;
   - tasdiq oynasi.
   Hammasi telefon, planshet va kompyuterda, ikkala rejimda.
5. **Bosiladigan prototip:** Landing → 3D demo → Ro'yxat → Onboarding → Muharrir → Narx → Fayllar.
6. **Harakat spetsifikatsiyasi:** 6.4 va karusel uchun vaqtlar, easing va kadrlar.

### Qabul ro'yxati
- [ ] Har ekran qorong'i va yorug'da bor
- [ ] Telefonda gorizontal aylantirish yo'q, tugmalar ≥ 44 px
- [ ] 3D animatsiyada rangsiz → rangli → sochilish → zapchast → hisob → yig'ilish bor; rangli/rangsiz sochilgan holatda ham almashadi
- [ ] Raqamlar Ilova A bilan bir xil, soxta raqam yo'q
- [ ] Ro'yxat 3 majburiy maydon bilan
- [ ] Muharrirda narx doim ko'rinadi, 4 qadam aniq
- [ ] Bittada logosi hisobot, Excel va rasm namunalarida bor

---

## Ilova A — 3D demo uchun haqiqiy ma'lumot
Manba: `app/data/fragments-mc.json` + ilovaning `cutlist()` hisobi. Korpus LDSP 16 mm, orqa HDF 3 mm. Tayyor o'lcham (kromkasiz), mm. Zapchast nomlari Bazis'dagidek.

### A1. Pastki shkaf "1 polka, 2 eshik" — `MC-KP-02`, 600×450×708
Chegara: eni 600–1070 · bo'yi 600–880 · chuqurligi 450–580

| Soni | Detal | O'lcham | Material |
|---|---|---|---|
| 2 | Yon devor (bok) | 692×450 | LDSP 16 |
| 1 | Tub (pol) | 600×450 | LDSP 16 |
| 2 | Planka | 568×80 | LDSP 16 |
| 1 | Old planka (Фронтальная) | 90×600 | LDSP 16 |
| 1 | Polka | 568×410 | LDSP 16 |
| 2 | Eshik (Дверь) | 704×298 | LDSP 16, 4 tomoni kromka 2 mm |
| 1 | Orqa devor (xdf) | 706×598 | HDF 3 |
| **10** | **detal** | **2,11 m²** | kromka **7,79 m** |

**Zapchast (26 dona):**
- polka ushlagich (polkoderjatel nikel) ×6
- oyoqcha (nojka nikel 100 mm) ×4
- ruchka 160 mm ×2
- Евро 51 мм (Алкан) ×8
- Евровинт 7×50 ×6

**Eni 800 bo'lsa** (slayder uchun): eshik 2 × **398**, polka **768**, tub 800, planka **768**, orqa 706×798 · detal 10 · **2,62 m²** · kromka **8,99 m** · zapchast 26.

### A2. Osma shkaf "1 polka, 2 eshik" — `MC-KU-04`, 600×300×600
Chegara: eni 600–1070 · bo'yi 460–1140 · chuqurligi 290–400

- **Detallar (8 ta, 1,57 m², kromka 6,49 m):**
  - 2 × tepa/tub 600×300
  - 2 × yon devor 568×300
  - 1 × polka 568×270
  - 2 × eshik 598×298
  - 1 × orqa HDF 598×598
- **Zapchast (20 dona):**
  - polka ushlagich ×6
  - ruchka 160 mm ×2
  - Евро 51 мм ×8
  - Евровинт 7×50 ×4

### A3. Shkaf — `MC-SH-02`, 1800×600×2200
Chegara: bo'yi 1780–2590 · chuqurligi 350–600

- **41 detal · 17,72 m² · kromka 36,66 m · 134 zapchast.**
- **Asosiy detallar:**
  - 2 × yon devor 2184×600
  - 2 × o'rta devor (2084 va 376)
  - tom 1800×600, tub 1768×600
  - 4 × polka 576×550
  - 3 × eshik (2114×598, 2 × 1714×598)
  - 4 ta tortma (yon, orqa, falsh-panel, HDF tub, fasad 197×596)
  - orqa HDF 2114×1798
- **Zapchast:**
  - petlya ×12
  - ruchka ×7
  - sharikli yo'naltiruvchi L400 ×4
  - samorez ×56
  - евро ×26
  - евровинт ×29

### A4. 3 m oshxona (karusel va raskroy animatsiyasi uchun)
- **Pastki modullar:** MC-KP-08 (moyka), MC-KP-11, MC-KP-02, MC-KP-04.
- **Ustki modullar:** MC-KU-04, MC-KU-07, MC-KU-03.
- **Qo'shimcha:** yaxlit stoleshnitsa (bitta) va sokol.
- **Natija:** **82 detal → 6 varaq**, hammasi sig'adi.
- Bu misolda 12 ta zapchastning narxi ERP'da yo'q. Shuning uchun narx raqami **landingda ishlatilmaydi**; ilova maketlarida "to'liq emas" belgisi bilan ko'rsatiladi.

---

## Ilova B — Lug'at (ekran matnlari uchun)

| So'z | Ma'nosi |
|---|---|
| Zamer | xona va devorlarni o'lchash |
| Modul | tayyor parametrik mebel bo'lagi (shkaf, tumba…) |
| Korpus / fasad | mebel tanasi / old eshik va tortma yuzi |
| Kromka | plita chetiga yopishtiriladigan lenta (0,4 yoki 2 mm) |
| Kroy / raskroy | detallarni plita varag'iga joylab kesish xaritasi |
| Stoleshnitsa / sokol | oshxona ish stoli usti / pastki plintus |
| Zapchast / furnitura | petlya, ruchka, yo'naltiruvchi, mahkamlagich |
| LDSP / HDF / MDF | laminatlangan DSP / yupqa orqa devor plitasi / MDF |
| Tannarx | sexning haqiqiy xarajati |
| Kotirovka | mijozga beriladigan narx |
