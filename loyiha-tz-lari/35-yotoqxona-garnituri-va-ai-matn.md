# TZ-35 — Yotoqxona garnituri (klassik) va AI matnni bo'laklarga ajratish

**Sana:** 2026-10-18 · **Navbat:** 35 · **Holat:** BAJARILDI (`dizayn` faf5392, CI yashil; egasi tasdig'i — qabul sinovi 17:05) (egasi #239–#244: "yotoqxona mebel yaxshi chiqmagan … ikkalasini ham bugun qil")
**Asos:** egasi prompti: "spalniy garnitur, classic model, spalniy razmeri 1800x2100 mm ldsp, bosh va oyoq qismida yumshoq detallari, shkafi 2400x2300 mm 3 qismdan (o'rtada kiyim ilish, 2 chekkasi polka), trimosi tortmali tepasida oyna, ruchkasiz push mexanizmda, umumiy rangi kashemir".
**Maqsad natija (egasi ko'rsatgan rasm):** ramkali klassik shkaf (karniz, tsokol), yumshoq boshli krovat, 6 tortmali trimo + ramkali oyna; ikki ko'rinish "eshiklar yopiq" / "eshiklar va tortmalar ochiq".

## 1. Hozirgi holat (o'lchangan)
- AI prompti natijasi: oddiy bitta shkaf 1800×2100. Tahlilchi birinchi o'lchamni oladi.
- Tilda yo'q: krovat, trimo, ko'zgu, yumshoq qism, push mexanizmi, ramkali klassik fasad, karniz/tsokol.
- Tushunilmagan qismlar ro'yxati bo'sh — xato jim o'tib ketadi.
- Yotoqxona shabloni katalogdagi 7 yotoqxona modulidan faqat 3 tasini ishlatadi; krovat — oddiy katta quti.

## 2. Vazifalar
| Qism | Mazmun | Agent (Sonnet) |
|---|---|---|
| A. 3D shakllar | krovat (karkas, matras, yumshoq bosh va oyoq), trimo (tortma qatorlari + ramkali oyna paneli), klassik ramkali fasad, karniz/tsokol, divan/stol/stul | `agent/mebel3d` |
| B. Matnni bo'laklarga ajratish | garnitur = bir nechta modul + joylashuv; yangi turlar (krovat, trimo, oyna, push, klassik); o'lchamni mebelga bog'lash ("krovat 1800×2100", "shkaf 2400×2300", "3 qism"); rang butun garniturga; tushunilmaganlar HAR DOIM ro'yxatda | `agent/garnitur` |
| C. Joylash | krovat orqa devorga, shkaf yon devorga, trimo qarshi devorga; ustma-ust 0; devordan 3 mm | B ichida |

## 3. Qoidalar
- Faqat katalogdagi tayyor modullar (130 ta); yangi modul o'ylab chizilmaydi.
- Katalogda yo'q qism (masalan yumshoq bosh, push mexanizmi) — kartada qizil "bajarilmadi" va sabab; jim tashlanmaydi.
- Narx/hisob/kesim o'zgarmaydi; 3D shakllar faqat ko'rinish.
- Mebel o'lchami modul chegarasidan chiqsa — eng yaqin chegaraga keltiriladi va kartada aytiladi.

## 4. Xavf — O'RTA
AI matn tahlili (`aiTur.js`, `katalogTanlash.js`, `konstruksiyaTili.js`) boshqa xona turlariga ham ta'sir qiladi. Himoya: `verify_ai_katalog` (89 tekshiruv) yashil qolishi shart, yangi tekshiruvlar qo'shiladi.
**Orqaga qaytarish:** alohida commitlar — `git revert`.

## 5. Egasidan
1. Katalogda yumshoq bosh/oyoqli krovat moduli yo'q (faqat MC-KR-04 "spalni 003" quti). 3D da yumshoq ko'rinishi chiziladi, lekin kesim ro'yxatida yumshoq detal (karkas, matras) bo'lmaydi. Yetadimi, yoki sexda yumshoq qism alohida buyurtma qilinadimi?
2. Ruchkasiz push mexanizmi — furnitura (Blum Tip-On/Push) narxi katalogda yo'q (TIP-ON narxsiz). Narxni bering yoki "push" belgisi faqat ko'rinish bo'lib turadi.
3. 3 qismli shkaf, o'rtada shtanga (kiyim ilish), chetlarda 5 tadan polka — mavjud MC-SH-01 uslubi bilan quriladi (egasi #150 tasdiqlagan qoida).
