# Smart 3D — To'liq Texnik Shartnoma (TZ) v2.0

> **Sana:** 2026-10-13 · **Versiya:** 2.0 · **Holat:** Tasdiqlash uchun
> **Muddat:** Shartnoma kunidan 10 ish kuni
> **Manba:** Foydalanuvchi promptlari (SORIZLAR.md #19) + mavjud holat tahlili

---

## 0. Loyha haqida qisqacha

| | |
|---|---|
| **Nomi** | Smart 3D |
| **Maqsad** | Mijozga mebel konstruksiyasini tez tayyorlab, 3D ko'rsatib, darhol tan narx chiqarish |
| **Foydalanuvchi** | Mijoz (zamerchi) · Usta (sex) · Admin (boss) |
| **Platforma** | Web (mobil + planshet + desktop) |
| **Muddat** | 10 ish kuni |
| **Hozirgi holat** | ~40% tayyor (demo ishlaydi) |

---

## 1. Asosiy talablar (TZ)

### 1.1 Zamer (o'lchash kiritish)
- Xona o'lchami (uzunlik × kenglik × balandlik)
- Deraza, eshik, ustun, quvur joylari
- **4 usulda kiritish:**
  1. Jadval to'ldirish (forma)
  2. Yozma prompt (AI matn)
  3. Ovoz (STT — speech-to-text)
  4. PDF/rasm yuklab olish (kelajakda)

### 1.2 Konstruksiya (AI)
- Tayyor modullardan foydalanib, xonaga modul joylashtirish
- **2 ta AI arxitekturasi:**
  - **AI-1 (Konstruktor):** prompt → modul tanlash → joylashtirish → chizma
  - **AI-2 (Nazoratchi/Tuzatuvchi):** AI-1 chiqishini tekshiradi, xato/noto'g'ri qismlarni tuzatadi, qayta chizadi
- Har bir modulda **min/max chegaralar** (masalan: shkaf 300–1200 mm)
- Modul razmeri o'zgarsa → **narx avtomatik o'zgaradi**

### 1.3 Narx hisobi (real-time)
- **Ombor narxlari** o'zgarsa → tan narx avtomatik o'zgaradi
- **Xizmat narxlari** (ish haqi, kromka, yig'ish) o'zgarsa → o'zgaradi
- Zapchastlar (furnitura) narxi bilan hisob
- **Umumiy summa** + tafsilotli smeta

### 1.4 Smeta jadvali
- Har bir modul uchun: material, o'lcham, miqdor, narx
- Umumiy: material + ish haqi + kromka + furnitura = **JAMI**
- PDF/Excel export

### 1.5 VR / Render
- 3D render — **bir necha daqiqada** vizualizatsiya
- VR export (WebXR — quloqchin bilan yurish)
- Telefon/planshetda ham ishlashi

### 1.6 Mobil
- iOS/Android brauzerida to'liq ishlashi
- Responsive dizayn (bottom nav, touch-gestures)

### 1.7 AI'siz rejim (Muhim!)
- Tizim **AI'siz ham** ishlashi kerak
- Avval AI bilan boshlanadi → keyinchalik **to'liq AI'siz** (qoidalar engine) ishlaydi
- AI — qo'shimcha, asosiy emas

---

## 2. Export formatlari (kiritilgan)

| # | Format | Nima | Holat |
|---|---|---|---|
| 1 | **OBJ + MTL** | 3D model | ✅ tayyor |
| 2 | **BPJ** | Bazis Progect | ✅ tayyor |
| 3 | **XLS/XLSX** | Smeta/kesim listi | ⚠️ CSV bor, XLSX kerak |
| 4 | **PROJECT (.project)** | GibLab | ✅ tayyor |
| 5 | **DXF** | Raskroy chizmasi | ✅ tayyor |
| 6 | **NC (Excellon)** | Teshik dasturi | ✅ tayyor |
| 7 | **G-code** | CNC kesim (ISO) | ✅ tayyor |
| 8 | **PTP** | Panel pozitsiyalari | ✅ tayyor |
| 9 | **Rasm (PNG/SVG)** | 2D reja + 3D render | ⚠️ qisman |
| 10 | **PDF** | Smeta/hisobot | ✅ tayyor |
| 11 | **XNC CSV** | GibLab Excel import | ✅ tayyor |

---

## 3. Stanoklarga avtomatik moslash (MUHIM)

### 3.1 Kerak bo'lgan stanok turlari
| Stanok | Format | Vazifa |
|---|---|---|
| **Prisadkat** (burg'ilash) | Excellon / .drd | Teshiklash |
| **Homag** (WoodWOP) | .cpu / .bzz | Kesim + teshik |
| **Kromka** (edge banding) | CSV / XML | Kromka yo'nalishi |
| **Altendorf** (panel saw) | CSV / G-code | Panel kesish |
| **Biesse** | .cix / .bzz | Kesim + teshik |
| **SCM** | .nc | Kesim |
| **Hundegger** | .nc | Kesim |
| **Lazer** | DXF / SVG | Kesim |

### 3.2 Moslash mexanizmi
```
Smart3D → format tanlash → post-prosessor → stanok fayli
```
- Har bir stanok uchun **post-prosessor** (cnc.js ichida)
- **Namuna fayl** kerak (sexdan olinadi) → moslashtiriladi
- Hozir: DXF, NC, G-code, PTP tayyor
- Qolganlar: namuna fayl kutilmoqda

### 3.3 GibLab integratsiya (kroy.bittada.uz)
- `.project` fayl yaratish ✅ tayyor
- **Neshta list ketishi** hisobi ✅ (raskroy)
- **Qancha ostatka qolishi** hisobi ✅ (delovoy qoldiq)
- GibLab'ga to'g'ridan-to'g'ri yuborish (API) — kelajakda

---

## 4. Material nomlari muammosi va yechimlar

### 4.1 Muammo
- Xodimlar material nomlarini **boshqacha-boshqacha** yozadi
- Copy-paste qilishadi, qisqartirishadi
- Qidiruvda topilmaydi

### 4.2 Yechimlar (4 qatlamli)

**1. ID tizimi (asosiy)**
- Har bir mahsulotga **8 xonali ID** beriladi
- Masalan: `00123456` → "LDSP Kronoshpan 5796"
- Xodim ID yozadi → aniq mahsulot chiqadi

**2. Kategoriya tizimi**
- LDS, AGT, Frente, MD, XDF va boshqalar
- Har bir kategoriya → ID oralig'i
- Masalan: LDS = 00100000–00199999

**3. Qidiruv (multi-til)**
- **4 tilda** qidiruv: Rus, O'zbek, Ingliz, Eski kirill
- Qisqa nom bilan ham topadi
- Transliteratsiya (kirill ↔ lotin)
- fuzzy matching (xato yozilgan ham topadi)

**4. AI mapping (o'qitish)**
- Xodim noto'g'ri nom yozsa → AI moslashtiradi
- Tarixiy ma'lumotlardan o'qitish
- "Bunday yozganlar shuni nazarda tutgan" — pattern

### 4.3 Amaliyot
```json
{
  "id": "00123456",
  "name_uz": "LDSP Kronoshpan 5796 Buk Art",
  "name_ru": "ЛДСП Кроношпан 5,796 Бук Арт",
  "name_en": "LDSP Kronoshpan 5796 Beech Art",
  "name_old": "ЛДСП Кроношпан 5,796 Бук Арт",
  "sku": "K014 SU",
  "category": "LDS",
  "aliases": ["kronoshpan", "krono", "buk", "5796", "крона"]
}
```

---

## 5. Ovozli funksiyalar

| Vazifa | Texnologiya | Holat |
|---|---|---|
| **STT** (o'z → matn) | Yandex SpeechKit | ⚠️ API kalit kerak |
| **TTS** (matn → o'z) | Gemini / Yandex TTS | ⚠️ API kalit kerak |
| **Ovozli buyruq** | Web Speech API | ✅ bor (browser) |
| **AI suhbat** | Gemini API | ⚠️ API kalit kerak |

---

## 6. Kamchiliklar va yechimlar (TZ tahlili)

### 6.1 Hozir yo'q, lekin kerak

| # | Kamchilik | Yechim | Muddat |
|---|---|---|---|
| 1 | **Backend yo'q** (server, DB, auth) | Node.js/Express + PostgreSQL yoki Supabase | 5–7 kun |
| 2 | **Login/ro'yxatdan o'tish** | Email/telefon + parol (yoki SMS) | 2 kun |
| 3 | **Multi-tenant** (bir nechta sex) | Har bir sex = alohida workspace | 3 kun |
| 4 | **Real-time narx** (ombor bilan) | WebSocket / polling + admin panel | 3 kun |
| 5 | **Buyurtma boshqaruvi** | Buyurtma → konstruksiya → smeta → sex | 4 kun |
| 6 | **Mijozlar bazasi (CRM)** | Mijoz + tarix + smeta | 3 kun |
| 7 | **To'lov tizimi** | Click/Payme/Stripe (kelajakda) | 5 kun |
| 8 | **Material nomi normalizatsiyasi** | ID + aliases + fuzzy search | 3 kun |
| 9 | **CNC post-prosessorlar** | Namuna fayllar kerak → moslash | 2 kun/fayl |
| 10 | **Render sifati** | Three.js → raytracing (kelajakda) | 5 kun |
| 11 | **AI API integratsiya** | Gemini/Yandex API kalit | 1 kun |
| 12 | **Ovozli (STT/TTS)** | Yandex Speech + Gemini | 2 kun |
| 13 | **PDF/XLSX professional** | Ya'ni matnli emas, haqiqiy format | 2 kun |
| 14 | **PWA → native ilova** | Capacitor / React Native (kelajakda) | 10 kun |

### 6.2 Muhim kamchiliklar (tez hal qilinadi)

| # | Muammo | Yechim | Holat |
|---|---|---|---|
| 1 | Fragmentlar 63 ta (kam) | 600+ qo'shish (sizdan fayl) | ⏳ kutilmoqda |
| 2 | Material bazasi statik | Admin panel + real-time | ⏳ backend kerak |
| 3 | AI lokal qoidalar | LLM API (Gemini) ulash | ⏳ kalit kerak |
| 4 | CNC namuna fayl yo'q | Sexdan 1–2 fayl olish | ⏳ kutilmoqda |
| 5 | Deploy yo'q | tunel agent / VPS | ⏳ Sobir javobi |

### 6.3 Yechimlar jadvali

| Muammo | Yechim 1 (tez) | Yechim 2 (to'liq) |
|---|---|---|
| Backend yo'q | Firebase/Supabase (BaaS) | Node.js + PostgreSQL |
| Narx real-time | localStorage + admin JSON | WebSocket + DB |
| AI ishlamaydi | Lokal qoidalar (hozir) | Gemini API |
| Material topilmaydi | ID + qisqa qidiruv | AI mapping + o'qitish |
| CNC moslashmaydi | DXF/NC (universal) | Har bir stanok uchun post |
| Mobil | Responsive PWA | Native ilova (Capacitor) |

---

## 7. Ishlash tartibi (foydalanuvchi yo'li)

```
1. Mijoz / Zamerchi kiradi
2. Xona o'lchamini kiritadi (forma yoki ovoz yoki prompt)
3. AI konstruksiya quradi (modullar joylashtiradi)
4. Nazoratchi AI tuzatadi (agar xato bo'lsa)
5. 3D render ko'rsatiladi (bir necha daqiqada)
6. Mijoz tanlaydi → narx shakllanadi (real-time)
7. Smeta chiqadi (PDF/Excel)
8. Export: OBJ/BPJ/DXF/NC/G-code/.project
9. Stanokka mos fayl yuklanadi
10. Sex ishlaydi
```

---

## 8. Resurslar (nima kerak)

### 8.1 Data
| Data | Manba | Holat |
|---|---|---|
| 600+ fragment | Sizdan fayl | ⏳ |
| Material bazasi (ERP) | XLSX → JSON | ✅ 1281 ta |
| Furnitura katalogi | ERP | ✅ 1978 ta |
| Narxlar (ombor) | ERP (2026-10-13) | ✅ |
| CNC namuna fayllar | Sexdan | ⏳ |
| Kroy/GibLab kodlari | kroy.bittada.uz | ✅ tadqiq qilindi |

### 8.2 Texnologiya
| Komponent | Tanlov | Sabab |
|---|---|---|
| Frontend | Vanilla JS + Three.js | Hozir tayyor, tez |
| Backend | Node.js / Supabase | Tez boshlash |
| DB | PostgreSQL / Firebase | Real-time + masshtab |
| AI | Gemini API | Kuchli + arzon |
| Voice | Yandex Speech + Gemini | O'zbek tilini yaxshi |
| Deploy | VPS / tunel agent | Arzon |
| Render | Three.js → raytracing | Bosqichma-bosqich |

### 8.3 Inson resurslari
| Rol | Nima qiladi | Muddat |
|---|---|---|
| Dasturchi (men) | Kod, integratsiya | 10 kun |
| Siz (owner) | Data, tasdiqlash, test | Doimiy |
| Sex ustasi | CNC namuna, test | 1–2 kun |
| Sobir (tunel) | Deploy yordam | 1 kun |

---

## 9. Muddat va bosqichlar (10 kun)

| Kun | Ish | Natija |
|---|---|---|
| 1–2 | Backend + DB + auth | Server ishlaydi |
| 3–4 | Material nomi normalizatsiya (ID + qidiruv) | Qidiruv ishlaydi |
| 5–6 | Real-time narx + admin panel | Narx o'zgaradi |
| 7 | CNC post-prosessorlar (namuna fayl bilan) | Stanok fayllari |
| 8 | AI integratsiya (Gemini) + nazoratchi AI | AI ishlaydi |
| 9 | Ovoz (STT/TTS) + mobil optimizatsiya | Ovoz + mobil |
| 10 | Test + deploy + hujjat | Tayyor |

---

## 10. Muvaffaqiyat mezonlari (DoD)

- [ ] Mijoz xona o'lchamini kiritadi → 10 daqiqada 3D konstruksiya + narx
- [ ] Material nomi noto'g'ri yozilsa ham topiladi (ID yoki qidiruv)
- [ ] Ombor narxi o'zgarsa → smeta avtomatik yangilanadi
- [ ] Export: OBJ, BPJ, DXF, NC, G-code, .project, PDF, XLSX
- [ ] Telefon/planshetda to'liq ishlaydi
- [ ] VR rejimida xonada yurish mumkin
- [ ] AI'siz ham ishlaydi (qoidalar engine)
- [ ] Ovozli kiritish (STT) ishlaydi
- [ ] Har bir modul min/max chegaralarda
- [ ] Zapchastlar narxi hisobga olingan

---

## 11. Xavflar

| Xavf | Ehtimol | Yechim |
|---|---|---|
| Backend muddati oshadi | O'rta | Supabase (BaaS) — tezroq |
| CNC namuna fayl kelmaydi | Yuqori | Universal DXF/NC bilan davom |
| AI API kalit ololmaymiz | O'rta | Lokal qoidalar bilan ishlaydi |
| 600 fragment kelmaydi | O'rta | 63 ta bilan ishlaydi, keyin qo'shamiz |
| Deploy qilinmaydi | Past | Lokal server + tunnel |

---

## 12. Xulosa

**Hozir tayyor (~40%):** Konstruksiya, raskroy, 12 export formati, ERP material bazasi, PWA, VR, 63 fragment.

**Qolgan (~60%):** Backend, real-time narx, AI API, ovoz, CNC post-prosessorlar, material normalizatsiya, multi-tenant, buyurtma boshqaruvi.

**Eng muhim 3 ta kamchilik:**
1. **Backend** — server, DB, auth (bo'lmasa real-time yo'q)
2. **Material nomi topilmaydi** — ID + fuzzy search (siz aytgan muammo)
3. **CNC namuna fayl** — stanoklarga moslash uchun kerak

**Keyingi qadam:** Backend boshlaymi yoki avval material ID tizimini qilaymi?

---

*TZ v2.0 · Smart 3D · 2026-10-13*
