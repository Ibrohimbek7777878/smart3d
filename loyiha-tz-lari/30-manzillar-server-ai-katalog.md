# TZ-30 — Sahifa manzillari, server modullari, ustama 35%, Asosiy 100 material, AI katalogdan konstruksiya

**Sana:** 2026-10-17 · **Navbat:** 30 · **Holat:** BAJARILDI (`dizayn` ae9c5f1, push qilindi; testchi: O'TDI)
**Asos:** egasi #179 (manzilda doim `app.html`), #180–#181 ("ha boshla", ustama 35% qolsin, repo ommaviy — xavfsizlik), #182 (material to'liq o'zgarmaydi, asosiy 100 ta), #183 (AI faqat bizdagi modullardan quradi).

## 1. Natija

| Agent (model) | Holat | Natija | Commit |
|---|---|---|---|
| Backend · Server modullari (Opus) | BAJARILDI | `server/index.js` 1156 → 107 qator: `server/routes/*` (18 fayl) va `server/lib/*` (10 fayl). API manzillari o'zgarmadi. Ilova manzillari serverda (`routes/sahifalar.js`) → `app.html`, CSP bir xil; noma'lum yo'l — 404 | b4535c8, 7250404 |
| Backend · Ustama 35% (koordinator) | BAJARILDI | `materials.json` → `price_src: "egasi, 2026-10-17"`; "Narx aniqligi" ustamani tasdiqlangan deb hisoblaydi (45% → 61%) | e063493 |
| Frontend · Sahifa manzillari (Opus) | BAJARILDI | `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/yangi`, `/loyiha/<raqam>`, `/sozlamalar`, `/sozlamalar/narxlar`, `/buyurtmalar`, `/tg`. Eski `app.html#s=…` havolalar yangi manzilga o'tadi. Kirmagan foydalanuvchi → `/kirish?qaytish=…`, kirgach o'sha sahifa. "Orqaga" avval oynani yopadi. Telegram ichida manzil o'zgarmaydi (Telegram `initData` ni hash'dan o'qiydi). Internetsiz ham ochiladi | 778d3cb, 1daae37 |
| Frontend · Material va Asosiy 100 (Opus) | BAJARILDI | Och yog'och dekorlar 3D da o'z rangida; polka korpus dekoriga ergashadi; Bazis modulida "Material" Bazis ro'yxatini ochadi. "Asosiy 100" — sex buyurtmalari va ombor bo'yicha narxli 100 dekor (rang: 23 aniq, 77 taxminiy "≈") | 726f18e |
| Backend · AI konstruksiya katalogdan (Opus) | BAJARILDI | Xona turini taniydi (oshxona, yotoqxona, mehmonxona-TV, dahliz, garderob, shkaf-kupe, bolalar, ofis, hammom). Faqat katalog modullari; katalogda yo'q buyum — kartada qizil "bajarilmadi". Oshxona: L/P shakl, "ustkisiz", duxovka penali SP-K-020, idish yuvish mashinasi SP-TX-002. Bitta modul: eshik soni, eni bo'yicha tanlash. Karta har qurishda chiqadi | 1637ae1, dafb6c8 |
| Test · Yakuniy (Sonnet, 22:19–22:48) | O'TDI | Node 35 skript, server 80/80, web 39/39 (yangi `marshrut`, `mat100`, `aikatalog` bilan), yangilanish va internetsiz yashil. Ilova va server manzil qoidalari 25 yo'lda bir xil. Yangi o'zgarishlarda maxfiy narsa topilmadi | — |

## 2. AI: 14 so'rov (testchining ro'yxati, brauzerda)

- Oldin: 5 to'liq, 6 qisman, 3 bajarilmadi.
- Endi: 14/14 — karta chiqadi, faqat katalog modullari, ustma-ust 0.
- Katalogda moduli yo'q, shuning uchun qurilmaydi — kartada qizil "bajarilmadi":
  - krovat yonidagi tumba;
  - plita ostidagi duxovka moduli.
- Bu modullar katalogga qo'shilsa, AI ularni ham ishlatadi.

## 3. Xavfsizlik (repo ommaviy, egasi #180–#181)

- Joriy kodda kalit, parol, token, mijoz ismi va real telefon yo'q.
- Asosiy server production'da `JWT_SECRET` (kamida 32 belgi) bo'lmasa ishga tushmaydi.
- `server/src/` — ishlatilmaydigan eski variant, unda sukut kalit bor. Hech qayerdan chaqirilmaydi, lekin o'chirish tavsiya qilinadi.
- Git tarixida ichki manzil, bitta email va ERP xlsx fayllari qolgan. Tarixni qayta yozish faqat egasi "ha" desa.

## 4. Egasi tasdiqlashi kerak

1. **Stoleshnitsa narxlari** (26/38 mm × 3050/4200). Egasi bergan bazada (2026-10-16 to'plami) list narxi yo'q:
   - material jadvalida (8 varaq) stoleshnitsa qatori yo'q;
   - faqat "Стяжка столешницы 150мм" 20 000, "Распил Столешница" 10 000, fiksator 6 500;
   - buyurtma fayllarida "Столешница 26/38мм" bor, lekin `cost="0"`;
   - do'kon ro'yxatida (NARX.pdf) ham yo'q.
   Qaysi faylda ekanini aytish yoki narxlarni yozish kerak. Narx o'ylab topilmaydi.
2. `server/src/` o'chirilsinmi.
3. Git tarixini tozalash (ichki manzil, email, ERP xlsx).
4. Tarixda qolgan hisoblar parolini almashtirish.
5. Production'ga yangi versiyani kim joylaydi. Proksi (nginx) bo'lsa, yangi manzillar Node serverga borishi kerak, aks holda `/loyihalar` 404 beradi.
6. TZ-29 dagi ochiq savollar: ish haqi, 1000 mm ruchka, burchak petlya, AI oshxona talqinlari, Gola/Tandem, "Excelni chatga".
