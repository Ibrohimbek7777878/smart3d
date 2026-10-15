# TZ-18 — Uch til: o'zbek, rus, ingliz (har bir matn)

**Sana:** 2026-10-15 · **Navbat:** 18 · **Holat:** TASDIQ KUTILMOQDA
**Asos:** egasi (2026-10-15): "tilni ham qo'sh, rus, ingliz, o'zbek bo'lsin va har bir harf, har bir text o'zgarishi kerak".
**Bog'liq:** TZ-09 (yangi frontend — o'zbekcha matnlar shu yerda lug'atga olinadi), TZ-16 (Telegram — til Telegram'dan olinadi), TZ-12 (AI).

---

## 1. Nimalar tarjima qilinadi
1. **Sayt (landing)** — barcha matn: menyu, sarlavhalar, tugmalar, 3D yorliqlari, savollar, footer.
2. **Ilova** — barcha ekranlar: kirish, onboarding, loyihalar, muharrir (4 qadam), sozlamalar, oynalar. Shuningdek toast, xato va ogohlantirish, maslahatlar, tasdiq oynalari.
3. **Dvigatel matnlari** — tekshiruv ogohlantirishlari (`rules.js` — ular allaqachon kod bilan: `E_OPENING_OUT_OF_WALL` va hokazo), detal nomlari (Yon devor, Tub...), xizmat nomlari, narx jadvali satrlari.
4. **Mijozga hujjatlar** — PDF hisobot, Excel smeta, rasm ustidagi yozuvlar.
5. **Server xatolari** — taxminan 50 joy. Server xato kodini qaytaradi, ekran uni tanlangan tilda ko'rsatadi.
6. **Modul nomlari (121) va kategoriyalar.**
7. **AI** — javob tanlangan tilda. Matndan zamer o'zbek, rus va ingliz tilidagi so'rovni tushunadi: server AI orqali, internetsiz lokal qoidalarga esa rus va ingliz so'zlari qo'shiladi.

## 2. Tarjima qilinmaydi — egasi tasdiqlaydi
| Nima | Nega |
|---|---|
| ERP mahsulot nomlari (1281 plita, 1978 furnitura) | Bu tovarning ERP'dagi asl nomi. O'ylab topilgan tarjima bo'lmasin (qoidalar 4.3, 4.4) |
| Stanok fayllari ichidagi yozuvlar (GibLab, BPJ, DXF, G-code, stanok CSV) | Ularni stanok dasturi o'qiydi — o'zgarsa import buzilishi mumkin |
| Foydalanuvchi yozgan matn (loyiha nomi, mijoz ismi) | Uni foydalanuvchining o'zi yozgan |
| "Smart3D", "Bittada" | Brend nomi |

## 3. Foydalanuvchi uchun qanday ishlaydi
- **Til tanlash:** dizayndagi 🌐 tugmasi → O'zbekcha / Русский / English.
- **Tanlov eslab qolinadi:** kirgan bo'lsa — akkauntda (serverda), kirmagan bo'lsa — qurilmada.
- **Birinchi ochilishda** — brauzer tili (Telegram'da — Telegram tili); mos kelmasa — o'zbek.
- **Almashganda** sahifa qayta yuklanmaydi; 3D yorliqlar ham darhol almashadi.
- **Pul birligi:** o'zbekcha "so'm", ruscha "сум", inglizcha "UZS". Raqam formati hamma tilda bir xil: `1 234 567`.
- **Sana** — tilga mos formatda.

## 4. Texnik yondashuv
- **Lug'atlar:** `web/src/i18n/uz.json`, `ru.json`, `en.json` — har matn o'z kaliti bilan. `uz` TZ-09 da tayyorlanadi.
- **Dvigatel:** ogohlantirish va detal nomlari kod bo'yicha tarjima qilinadi. Hisob mantiqi o'zgarmaydi; hozirgi o'zbekcha matn ham qoladi (eski sayt va testlar uchun).
- **Modul nomlari:** alohida fayllar — `app/data/i18n/modules.ru.json`, `modules.en.json`. Asl `fragments*.json` o'zgarmaydi.
- **Hujjatlar:** `xlsxexport.js` va PDF hisobotga til parametri qo'shiladi.
- **Server:** xato javobiga `code` qo'shiladi, hozirgi matn o'zgarmaydi (testlar uchun). `users` ga `lang` maydoni.
- **Shriftlar:** Manrope va JetBrains Mono kirill harflarini qo'llaydi — dizayn shrifti o'zgarmaydi.
- **To'liqlik testi:**
  - uchala lug'atda kalitlar bir xil, bo'sh qiymat yo'q;
  - rus va ingliz rejimida sahifa matnida lug'atdan tashqari qolib ketgan o'zbekcha matn yo'qligi avtomatik tekshiriladi.

## 5. Dizayn buzilmasligi
- **O'zbek tili** — dizayn bilan pikselma-piksel bir xil (TZ-09 dagi solishtirish).
- **Rus va ingliz tili** — matn uzunroq bo'lishi mumkin. 390px va 1440px da har ekranda kesilish, toshib chiqish va gorizontal aylantirish yo'qligi tekshiriladi.
- Joy yetmasa — dizaynni o'zgartirmasdan qisqaroq tarjima tanlanadi.

## 6. Tarjima sifati
- Tarjimani men qilaman.
- **Atamalar jadvali** (~50 atama) avval sizga tasdiqlash uchun beriladi:
  - ruschasi — sexda ishlatiladigan atamalar: ЛДСП, кромка, присадка, раскрой, столешница, фасад, цоколь;
  - inglizchasi — mebel sanoati atamalari: chipboard, edge banding, drilling, cutting layout, countertop, front, plinth.
- Tavsiya: rus tilidagi matnni sexdan bir kishi ko'rib chiqsa yaxshi.

## 7. Bosqichlar (har biri alohida commit)
| № | Bosqich | Tekshiruv |
|---|---|---|
| 1 | Atamalar jadvali | sizning tasdig'ingiz |
| 2 | Lug'at tuzilmasi, 🌐 tanlash, eslab qolish | brauzer testi |
| 3 | Sayt — rus va ingliz | to'liqlik testi, 390/1440 |
| 4 | Ilova — rus va ingliz | to'liqlik testi, 390/1440 |
| 5 | Dvigatel matnlari, detal va modul nomlari | node testlar |
| 6 | Hujjatlar (PDF, Excel) | 3 tilda fayl ochiladi |
| 7 | Server xato kodlari, `users.lang` | server testlari |
| 8 | AI — 3 tilda so'rov va javob | `verify_ai` + yangi testlar |
| 9 | Yakuniy: 3 til × telefon / planshet / kompyuter | hisobot |

## 8. Tegadigan fayllar
- Yangi `web/src/i18n/*`; `web/src/**` — matnlar kalitga.
- `app/js/engine/rules.js`, `cutlist.js` (detal nomlari kodi), `xlsxexport.js`, PDF hisobot.
- Yangi `app/data/i18n/modules.{ru,en}.json`.
- `app/js/ai.js` — rus va ingliz so'zlari.
- `server/index.js` (xato kodlari, `users.lang`), `server/test/*`.
- `tests/*`.

## 9. Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Matn juda ko'p; noto'g'ri tarjima chalg'itadi; uzun matn dizaynni buzishi mumkin.
  - Kamaytirish: atamalar jadvali tasdig'i, to'liqlik testi, 390/1440 tekshiruvi.
- **Moliya:** hisobga tegilmaydi, faqat matn. Narx 3 tilda bir xil ekani test bilan tasdiqlanadi.
- **Orqaga qaytarish:** `git revert`; til tanlovi o'zbek tiliga qaytadi.

## 10. Navbat
- TZ-09 dan keyin (TZ-09 o'zbekcha lug'atni tayyorlaydi), TZ-16 dan oldin.

## 11. Egasidan kerak
1. Atamalar jadvalini tasdiqlash (1-bosqichda beriladi).
2. 2-bo'limdagi "tarjima qilinmaydi" ro'yxatiga rozilik.
3. **"Boshla".**

## 12. Qabul
- Har ekran 3 tilda; lug'atdan tashqari matn qolmagan (test bilan).
- O'zbek tilida dizayn o'zgarmagan; rus va ingliz matni hamma o'lchamda sig'adi.
- Mijozga hujjatlar tanlangan tilda.
- Narx 3 tilda bir xil; barcha testlar yashil.

## 13. Muddat (taxmin)
- Taxminan **3–4 ish kuni**, TZ-09 dan keyin. Bu taxmin, aniq hisob emas.
