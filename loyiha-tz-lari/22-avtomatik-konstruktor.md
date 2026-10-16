# TZ-22 — Avtomatik konstruktor (sun'iy intellektsiz, qoidalar bilan)

**Sana:** 2026-10-16 · **Navbat:** 22 · **Holat:** TASDIQ KUTILMOQDA
**Asos:** egasi (2026-10-16): "konstruksiya chizib bera oladimi … hammasini ideal qilib berish kerak … ishlab chiqarishga berganda natija aniq bo'lishi kerak … tizim o'zi sun'iy intellektsiz konstruksiya qilishi kerak".
**Bog'liq:**
- TZ-05 — umumiy modullar, pauza;
- TZ-06 — teshiklar;
- TZ-11 — stanok fayllari;
- TZ-12 — AI;
- TZ-14 — sex standartlari sahifasi;
- TZ-15 — ustki shkaf balandligi;
- TZ-21 — Bazis faylini yuklash.

---

## Hozirgi holat (tekshirilgan, 2026-10-16)
- **Avtomatik joylashtirish bor, AI'siz ishlaydi, lekin sodda:** `app/js/ai.js` → `suggestLayout`. Kamchiliklari:
  1. **Devordan masofa.** Modullar devordan 50 mm uzoqda qo'yiladi.
  2. **Devor to'liq to'ldirilmaydi.** Faqat 900 va 600 mm bilan to'ldiriladi, oxirida 599 mm gacha bo'sh joy qoladi.
     - Dobor (planka) qo'yilmaydi.
     - Modul enlari modul chegarasi (min/max) ichida moslanmaydi.
  3. **Noto'g'ri modullar ishlatiladi.** Umumiy SP-K-* modullari qo'yiladi, ularning geometriyasida xato bor (TZ-05, pauza).
     - MebelCity'ning 38 ta MC-* moduli ishlatilmaydi.
     - MC modullari Bazis fayllaridan aynan olingan va ishlab chiqarish uchun aniq.
  4. **Xona elementlari hisobga olinmaydi:** deraza, eshik, suv, gaz va ventilyatsiya nuqtasi.
  5. **Ustki shkaflar bilan muammo:**
     - pastki shkaflar bilan bir chiziqda emas;
     - U shakldagi oshxonada ustki shkaf umuman yo'q;
     - burchakda ustki burchak moduli yo'q.
  6. **Ergonomika qoidalari yo'q.** Masalan: plita bilan moyka orasidagi ish yuzasi, plitaning derazadan va xolodilnikdan uzoqligi.
  7. **Faqat oshxona** quriladi (bitta shkafdan tashqari).
- **Ko'rinishi.** Ro'yxatdan o'tgandan keyingi namuna oshxona ham shu funksiya bilan quriladi (`web/src/store/project.js`). Skrinshotda modullar devordan ajralib, bo'shliq bilan turgani shuning uchun.
- **Matnni tushunish.** Erkin matnni xona va buyurtmaga aylantirish (`parseZamer`) ham AI'siz ishlaydi. Til modeli (TZ-12) ixtiyoriy.

## Maqsad
1. Usta xonani va nima kerakligini kiritadi.
2. Tizim o'zi, AI'siz va internetsiz to'liq konstruksiyani quradi:
   - devor millimetrigacha to'ldiriladi;
   - sex qoidalariga mos bo'ladi;
   - ishlab chiqarishga tayyor bo'ladi.
3. Bir xil kirish ma'lumoti — har doim bir xil natija beradi.

AI faqat erkin matn yoki ovozni formaga aylantiradi. U bo'lmasa ham forma ishlaydi.

## Bajariladigan ishlar
1. **Kirish (forma, AI'siz)** — mavjud "Xona" qadami kengaytiriladi:
   - **xona:** devorlar;
   - **eshik va deraza:** joyi, eni, balandligi, deraza tokchasi balandligi;
   - **kommunikatsiya:** suv, gaz va ventilyatsiya nuqtalari;
   - **oshxona shakli:** I, L, U, parallel yoki "tizim tanlasin";
   - **texnika:** xolodilnik (eni bilan), plita yoki varochnaya, duxovka, moyka, idish yuvish mashinasi, vityajka;
   - **ustki shkaflar:** kerakmi yoki yo'qmi;
   - **materiallar:** korpus va fasad.
2. **Konstruktor yadrosi** — yangi `app/js/engine/konstruktor/`. Sof funksiya: sahifaga bog'liq emas, alohida test qilinadi.
   - **Devor bo'laklari:**
     - burchaklar ajratiladi;
     - eshik ochiladigan zona bo'sh qoladi;
     - deraza ostiga pastki shkaf tokcha balandligiga qarab qo'yiladi, deraza ustiga ustki shkaf qo'yilmaydi.
   - **Langarlar:**
     - moyka — suv nuqtasiga eng yaqin joyga;
     - plita — gaz nuqtasiga;
     - xolodilnik — qator chetiga.
     - Masofa qoidalari: plita derazadan, xolodilnikdan va burchakdan uzoqligi, plita bilan moyka orasidagi ish yuzasi. Raqamlar sex standartlarida turadi, admin ularni ekrandan o'zgartiradi (TZ-14 sahifasi).
   - **Millimetrgacha to'ldirish:**
     - modul eni o'z min/max chegarasi va qadami ichida tanlanadi;
     - qoldiq sex qoidasidagi dobor bilan yopiladi;
     - bo'sh joy 0 mm qoladi;
     - bir nechta yechim chiqsa, eng yaxshisi baholanib tanlanadi: kam modul, standart enlar, plita yonida tortma.
   - **Burchak:**
     - L va U shaklda burchak moduli qo'yiladi (MC-KP-05);
     - eshik va ruchkalar bir-biriga tegmasligi uchun burchak dobori qo'yiladi.
   - **Ustki qator:**
     - pastki modullar bilan bir chiziqda;
     - plita ustida vityajka shkafi (MC-KU-09/10);
     - balandlik — TZ-15 qoidasi bo'yicha.
   - **Qo'shimchalar:**
     - stoleshnitsa, sokol, karniz — mavjud `kitchen.js` orqali;
     - penal va antresol — so'ralsa.
   - **Tekshiruv:**
     - modullar to'qnashmaydi;
     - xonadan chiqmaydi;
     - eshik va derazaga tegmaydi;
     - har modul o'z chegarasi ichida;
     - qoidalar bajarilgan.

     Biror qoida bajarilmasa, sababi yozilgan ogohlantirish chiqadi.
   - **Variantlar:**
     - 2–3 ta variant chiqadi, usta birini tanlaydi;
     - har qarorning izohi bo'ladi, masalan "moyka shu yerda, chunki suv nuqtasi shu yerda".
3. **Faqat MC-* modullar** (Bazis'dan olingan, aniq) avtomatik qo'yiladi.
   - SP-* modullar (83 ta) TZ-05 tugaguncha avtomatik qo'yilmaydi.
   - Kerakli tur MC'da yo'q bo'lsa (masalan, idish yuvish mashinasi o'rni yoki ustki burchak), ro'yxati sizga beriladi. Bunday modulni Bazis'da chizib, TZ-21 orqali qo'shasiz.
4. **Ilovaga ulash:**
   - Mebel qadamiga "Avtomatik konstruksiya" tugmasi qo'shiladi: variantlar → birini tanlash → qo'lda tahrir;
   - AI yordamchisi ham shu yadroni chaqiradi;
   - ro'yxatdan o'tgandan keyingi namuna oshxona ham shu yadro bilan quriladi;
   - yangi tugma va oyna — avval skrinshot bilan tasdiqlanadi (3.3).
5. **Testlar:**
   - **Namuna xonalar:** 20 ta — to'g'ri, L, U, parallel; deraza va eshikli; tor (1 800 mm) va keng (4 200 mm).
   - **Har birida tekshiriladi:**
     - bo'shliq 0 mm (dobordan tashqari);
     - to'qnashuv yo'q;
     - qoidalar bajarilgan;
     - natija har safar bir xil;
     - detal ro'yxati va raskroy xatosiz chiqadi.
   - **Brauzer testi:** telefon (390 px) va kompyuter.
6. **Texnolog tekshiruvi:**
   - 5 ta variant PDF bilan beriladi;
   - texnolog topgan har bir xato qoidaga aylantiriladi va testga qo'shiladi.

## Ishlab chiqarish aniqligi (natija shularga bog'liq)
| Qism | Holat | Kerak |
|---|---|---|
| Detallar o'lchami | ✅ MC modullar Bazis bilan aynan | — |
| Evrovint teshiklari | ✅ 724 vint, 1 077 teshik — Bazis bilan aynan | — |
| Petlya, polka ushlagich, ruchka, eksantrik teshiklari | ❌ yo'q | D6 jadvali (`Smart3D_malumot/D6-teshiklar-va-zapchast-2026-10-15.xlsx`) hali to'ldirilmagan (TZ-06) |
| Stanok fayllari | ❌ stanokda tekshirilmagan | TZ-11. **Yangi topildi:** ERP papkasida 6 ta haqiqiy GibLab `.project` fayli bor. GibLab faylimizni ular bilan solishtirishni hoziroq boshlash mumkin |
| Bazis fayli | ❌ qabul qilinmaydi | TZ-21 (Q4–Q6) |

## Tegadigan fayllar
- **Yangi yadro:** `app/js/engine/konstruktor/`.
- **Mavjud kod:**
  - `app/js/ai.js` — `suggestLayout` yangi yadroni chaqiradi; `parseZamer` qoladi;
  - `app/js/engine/kitchen.js` — faqat chaqiriladi.
- **Sex standartlari:** `app/data/sex-standartlari.json` va TZ-14 sahifasi — yangi qoidalar bo'limi.
- **Web** (`dizayn` tarmog'i):
  - `features/editor/room` — xona elementlari;
  - `features/editor/catalog` — tugma;
  - `store/project.js` — namuna oshxona.
- **Testlar:** `tests/verify_konstruktor.mjs`, `tests/ui/web_konstruktor.mjs`. `tests/verify_ai.mjs` yangilanadi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.** Noto'g'ri qoida noto'g'ri oshxona beradi. Himoya:
  - har natija tekshiruvdan o'tadi;
  - qoidalar raqamlari "taklif" belgisi bilan turadi, texnolog tasdiqlaguncha shunday qoladi;
  - usta har doim qo'lda tuzata oladi.
- **Moliya:** narxga tegilmaydi (TZ-20 pauzada). Pul harakati yo'q.
- **Orqaga qaytarish:** eski `suggestLayout` alohida saqlanadi, kerak bo'lsa qaytariladi; kod — `git revert`.

## Egasidan kerak
1. **Q1 — qaysi mebeldan boshlaymiz?**
   - **Tavsiya:** oshxona — modullari bor (11 pastki, 10 ustki, 3 antresol, 1 penal).
   - Shkaflar keyin. 6 ta MC shkaf yaxlit, modullarga bo'linmagan.
2. **Q2 — sex qoidalari raqamlari:**
   - dobor eni (min/max);
   - plita bilan deraza, xolodilnik va burchak orasidagi masofa;
   - moyka va plita orasidagi masofa;
   - burchak dobori.

   Men umumiy standartlardan "taklif" jadvalini tayyorlayman, texnolog tasdiqlaydi yoki tuzatadi (qoida 4.3 — o'zim raqam o'ylab topib, tasdiqsiz ishlatmayman).
3. **Q3 — texnolog:** kim tekshiradi va qachon? 5 ta variantni ko'rib chiqish taxminan 1 soat.
4. **"Boshla".**

## Qabul
- 20 ta namuna xonada bo'shliq 0 mm, to'qnashuv yo'q, qoidalar bajarilgan.
- Texnolog 5 ta variantni "to'g'ri" deb tasdiqlaydi.
- Internetsiz va AI'siz ishlaydi.
- Barcha testlar yashil.

## Muddat (taxmin)
- Taxminan **4–5 ish kuni**, texnolog tekshiruvidan oldin. Bu taxmin, aniq hisob emas.
