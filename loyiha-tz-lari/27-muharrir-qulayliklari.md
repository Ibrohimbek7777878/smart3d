# TZ-27 — Muharrir qulayliklari: eshik qiya ochilishi, yurishda tanlash, "orqaga" tugmasi, "Davom ettirish" bo'limi

**Sana:** 2026-10-17 · **Navbat:** 27 · **Holat:** BAJARILDI 2026-10-17 (`dizayn` 6004d64; egasi #137: "shu jihatlarini to'g'irla") — test `web_qulaylik`, 26 web to'plam yashil
**Asos (#137, 4 ta skrinshot):**
- eshiklar bir-biriga tegib qoladi — to'liq emas, Bazis'dagidek biroz qiya ochilsin;
- sichqoncha bilan aylantirish ishlamayapti;
- "ichida yurish"da boshqa modulni tanlab bo'lmaydi;
- ishni qolgan joyidan davom ettirib bo'lmaydi — har safar yangisini ochish kerak;
- sichqonchaning "orqaga" tugmasi ilovadan chiqarib yuboradi;
- "Nima yasaymiz" bo'limlari yonida "Ishni davom ettirish" bo'limi: chala qolgan hamma ishlar.

## 1. Tekshiruv (2026-10-17)
- **Skrinshotlar — eski versiya.** Chapda 4 qadam, AI tugmasi va "Nima yasaymiz" bor — TZ-25 gacha bo'lgan ko'rinish. 37831-portda server yo'q. Brauzer ilovani PWA keshidan ochadi, serverga ulanmaydi: sarlavhadagi qizil bulut — "internet yo'q". Shuning uchun:
  - loyiha saqlanmaydi, "Loyihalarim" bo'sh;
  - aylantirish xatosi (TZ-23 A1) ham eski nusxada qolgan. Yangisida tuzatilgan — `dizayn` b71c889.
- **Yurish rejimi** (`web/src/services/korinish.js`) har bosishni to'xtatadi (`stopPropagation`). Mebelni tanlash kodiga bosish yetib bormaydi.
- **Eshik** 100° gacha ochiladi (TZ-22 xavfsiz burchagi). Yonma-yon modullarda eshiklar bir-biriga yaqinlashib qoladi.
- **"Orqaga"** — ilovada brauzer tarixi yo'q. Birinchi bosishda saytdan chiqib ketadi.

## 2. Bajariladigan ishlar
1. **Eshik qiya ochiladi** — eng ko'pi 45° (Bazis'dagidek). Xavfsiz burchak kichikroq bo'lsa — o'sha. Tortma o'zgarmaydi.
2. **Yurish rejimida bosish** (siljimasdan) — modul tanlanadi, eshik ochiladi (oddiy rejimdagidek). Sudrash — qarash, avvalgidek.
3. **"Orqaga" (brauzer va sichqoncha tugmasi)** ilova ichida ishlaydi. Har bosishda:
   - avval eng ustdagi oyna yopiladi: til menyusi, tasdiq, varaq, AI, "Ichini ko'rish", detal kartasi;
   - keyin rejim o'chadi: yurish, o'lchash, devor/eshik asbobi; keyin modul chizish paneli, o'ng panel, tanlov;
   - keyin oldingi ekranga qaytiladi (ish joyi ↔ loyihalar ↔ sozlamalar).

   Ilovadan chiqib ketmaydi. Telegram ichida — Telegram'ning o'z "orqaga" tugmasi (TZ-16), tegilmaydi.
4. **"Davom ettirish" bo'limi:**
   - **Ish joyida** (loyiha bo'sh bo'lsa) tez boshlash qatorida "Davom ettirish (N)" chipi turadi — chala qolgan loyihalar ro'yxati varaqda: nomi, mijoz, modul soni, narx, sana → "Davom ettirish".
   - **"Loyihalarim"** tepasida "Davom ettirish" qatori — eng oxirgi chala ishlar.
   - **Chala** — kamida 1 modul bor, o'chirilmagan loyiha (buyurtma holati hozircha yo'q — C1).
   - Kirishda oxirgi loyiha baribir o'zi ochiladi (TZ-25).
5. **Serverni ishga tushirish yo'riqnomasi** (egasi o'zi yoki ruxsat bilan): yangi versiyani 37831-portda ochish.
6. **Tahlil** — oddiy mijoz va usta-konstruktor ko'zi bilan: chatda (qoida 1.7).

## 3. Tegadigan fayllar
- `app/js/items.js` — eshik burchagi.
- `web/src/services/korinish.js` — yurishda bosish.
- `web/src/app/tarix.js` (yangi), `app/klaviatura.js`, `app/bootstrap.js` — orqaga.
- `web/src/features/projects/*`, `features/editor/ishjoyi/MatnQatori.jsx`, `editor/Varaqlar.jsx` — "Davom ettirish".
- Lug'atlar (uz, ru, en). Testlar: `web_ishjoyi` (yangi tekshiruvlar), `web_korinish`.
- **Tegilmaydi:** hisob, narx, kesim, stanok fayllari, server.

## 4. Xavf, moliya, orqaga qaytarish
- **Xavf: PAST** — faqat ko'rinish va navigatsiya.
- **Moliya:** tegilmaydi.
- **Orqaga qaytarish:** `git revert`.

## 5. Qabul
- Eshiklar 45° dan ko'p ochilmaydi va bir-biriga tegmaydi.
- Yurish rejimida modul bosilsa — tanlanadi.
- "Orqaga" oynani yopadi yoki oldingi ekranga qaytaradi va ilovadan chiqarmaydi.
- "Davom ettirish (N)" chala loyihalarni ko'rsatadi va ochadi.
- Barcha testlar yashil.
