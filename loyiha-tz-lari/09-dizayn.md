# TZ-09 — Yangi frontend: React versiyani loyihaga ulash (dizayn buzilmaydi)

**Sana:** 2026-10-15 · **Navbat:** 9 · **Holat:** BAJARILDI 2026-10-15 — `dizayn` tarmog'ida (main'ga qo'shish va serverga o'rnatish — egasi ruxsati bilan)
**Almashtiradi:** shu TZ'ning oldingi ikki varianti ("eski sayt ustiga dizayn kiyintirish" va "Bittada laym rangi"). Ular bekor.
**Egasi qarori (2026-10-15):** Claude Design'ga qayta berilmaydi. Asos — Claude Design yozgan React versiya, uni men loyihaga ulayman.
**Bog'liq:** TZ-07 (SMS kirish), TZ-12 (AI), TZ-14 (sex standartlari), TZ-01 (stanok fayllari), TZ-05 (modul geometriyasi, pauza), TZ-10 (deploy).

---

## 0. Asosiy qoidalar

1. **Dizayn buzilmaydi.** Manba — `frontend/design_handoff_smart3d/designs/*.dc.html` va README.
   - Rang, shrift, o'lcham, radius, oraliq, matn, animatsiya vaqti — o'zgarmaydi.
   - Logo — dizayndagidek ("3D" belgisi + "Smart3D by Bittada").
2. **Asos — React versiya** (`frontend/smart3d-frontend/`, React 18 + Vite 5 + three.js 0.160).
3. **Hisob dvigateli o'zgarmaydi.** React ekranlar bizning `app/js/engine/*` ni chaqiradi. Ikkinchi hisob tizimi qurilmaydi (qoida S6).
4. **Soxta ma'lumot qolmaydi** (qoida 4.3). Prototipdagi narx, modul, loyiha, raskroy namunalari haqiqiysiga almashtiriladi.
5. **Dizaynda yo'q qismning ko'rinishini** men dizayn bo'laklaridan yig'aman. Har biri qo'shilishidan oldin sizga skrinshot bilan ko'rsatiladi. "Ha" deganingizdan keyingina qo'shiladi (qoida 3.3).
6. Ish alohida `dizayn` tarmog'ida. `main` dagi hozirgi sayt oxirgi bosqichgacha o'zgarmay ishlaydi.

---

## 1. React versiyani tekshiruv natijasi (2026-10-15, nusxada sinaldi)

| Tekshiruv | Natija |
|---|---|
| Dizayn bilan solishtirish (kompyuter 1440px, telefon 390px; sayt, kirish, onboarding, muharrir, narx) | ✅ farq ~0%. Farq faqat animatsiyali 3D joylarda. Sahifa balandligi aynan bir xil (8253 / 10547 px) |
| Saytdagi demo raqamlari | ✅ bizdagi ma'lumot bilan mos: MC-KP-02 — 10 detal, MC-KU-04 — 8, MC-SH-02 — 41; 121 modul, 1281 plita, 1978 furnitura |
| `npm run build` | ❌ to'xtaydi: `App.jsx:160` import qilingan `s3Id` ga yozadi. Dev rejimda "⧉ Nusxa" tugmasi sahifani buzadi. Tuzatish — 1 qator |
| Takror stil kalitlari | ⚠️ 43 ta. Ko'rinishga ta'sir yo'q — prototipda ham oxirgi qiymat ishlaydi |
| Narx tugmasi | ⚠️ "so'm" raqamga 2–3 px yaqin (prototipda bo'shliq bor) — 1:1 qilinadi |
| Haqiqiy funksiya | ❌ hammasi namuna: 7 modul, narx — formula + qo'lda yozilgan, loyihalar soxta, raskroy tasodifiy, Fayllar faqat xabar chiqaradi, AI soxta, kirish — parol + brauzer xotirasi |
| Muharrir xonasi (`s3Room`) | soddalashtirilgan: bitta orqa devor, modullar bir qatorda, deraza joyi qotgan |
| Internetsiz ishlash | ❌ yo'q. Shriftlar Google'dan |

---

## 2. Loyihaning yangi tuzilishi

```
Smart3D/
├── web/                         ← YANGI FRONTEND (React + Vite), frontend/smart3d-frontend dan ko'chiriladi
│   ├── index.html               ← sayt (landing)
│   ├── app.html                 ← ilova
│   ├── src/landing/             ← sayt: Landing.jsx, 3D demo (o'zgarishsiz)
│   ├── src/app/                 ← ilova ekranlari (ekran bo'yicha fayllarga bo'linadi)
│   ├── src/app/bridge/          ← ULASH QATLAMI: dvigatel, server, 3D sahna bilan bog'lanish
│   └── vite.config.js           ← ../app/js/engine va ../app/data ga yo'l (bitta manba)
├── app/                         ← hozirgi sayt; almashtirilgach /eski/ da zaxira (Q7)
│   ├── js/engine/               ← HISOB DVIGATELI — ikkala frontend ham shuni ishlatadi
│   ├── js/ai.js                 ← matndan zamer/konstruksiya
│   ├── js/scene.js, items.js, controls.js, materials3d.js ← 3D sahna (muharrirda ishlatiladi)
│   └── data/                    ← 121 modul, 1281 plita, 1978 furnitura, xizmatlar, standartlar
├── server/                      ← o'zgarmaydi (faqat sahifa yo'llari, 9-bosqich)
├── tests/                       ← node testlar o'zgarmaydi; tests/ui — yangi frontend uchun
└── frontend/design_handoff_smart3d/  ← tasdiqlangan dizayn (faqat o'qiladi)
```

- `frontend/smart3d-frontend/` — Claude Design'dan kelgan asl nusxa. U o'zgartirilmaydi, solishtirish uchun qoladi.
- Ish nusxasi `web/` papkasida bo'ladi.

---

## 3. Ulash xaritasi — React'dagi namuna → bizdagi haqiqiy funksiya

| React'da (namuna) | Nima bilan almashtiriladi |
|---|---|
| `submitAuth()` — parol, `localStorage` | Server: email + parol bilan ro'yxat va kirish (bcrypt, bor). Formaga email maydoni qo'shiladi, qolgani dizayndagidek. SMS (TZ-07) tayyor turadi — Eskiz kelgach yoqiladi. Admin — xuddi shu kirish |
| `S3_PROJ` — 4 ta soxta loyiha | `/api/projects`: ro'yxat, ochish, avtomatik saqlash (2 soniya), internetsiz navbat, o'chirish = arxiv |
| `S3_CAT` — 7 modul, `s3Price()` | `fragments.json` + `fragments-mc.json` (121), narx — `cutlist.js` / `price.js` |
| `S3_LIM` — qattiq chegaralar | `sex-standartlari.json` + `applySexStandart` (TZ-14) |
| `mods[]` (bir qatorda, `off` siljish) | bizning `doc`: xona (poligon) + `placements` (x, y, z, burilish) |
| `s3Room` — soddalashtirilgan xona | bizning 3D sahna (`scene.js`, `items.js`, `controls.js`) — dizayn ranglari va uslubi bilan (5-bosqich) |
| `costRows`, `missing` | `productionCost` (tannarx) + narxi yo'q zapchastlar ro'yxati (dvigateldan) |
| Foyda (+35%) | dvigateldagi ustama |
| `S3_SHEETS` — tasodifiy | `nestProject` haqiqiy raskroyi |
| `fileGroups` — faqat xabar | haqiqiy fayllar: Excel, CSV, PDF hisobot, GLB, OBJ, GibLab, XNC, DXF, G-code, PTP, NC, Altendorf, loyiha.json (BPJ, Biesse, Homag — Q3/Q4) |
| Fayllar — tekshiruv | `validateDoc` + mavjud eksport tekshiruvi |
| `aiBuild` — "7 modul" | `ai.js` + `/api/ai/*` (TZ-12), ovoz |
| ⟳ "keyingi versiyada" | haqiqiy burish (TZ-08) |
| "Erkin shakl" / "Teshik qo'shish" — xabar | bizdagi poligon xona va teshiklar |
| 📸 Rasm, 🔄 360° — xabar | `render1080p`, `render360Panorama` |
| Ichini ko'rish (2 modul, qo'lda chizilgan) | React'ning o'z 3D ko'rinishi (`s3Viewer`, `s3Build`) — lekin ma'lumot `assembler.js` + modul furniturasidan (adapter) |
| 🌐 "tez orada" | o'zgarishsiz |
| Sozlamalar — xabar | yangi sahifa (4-bo'lim) |

---

## 4. Dizaynda yo'q, bizda bor — qo'shiladi (har biri avval skrinshot bilan tasdiqlanadi)

| Funksiya | Qayerga |
|---|---|
| SMS kod qadami (Eskiz kelgach yoqiladi) | Kirish ekrani — telefon maydoni ostida, shu uslubda |
| L shakl / erkin xona nuqtalari, deraza va eshik teshiklari | ① Xona — dizayndagi "shakl" va "teshiklar" bloklari |
| Quvur / rozetka | ① Xona — teshiklar ostida |
| Dobor/karniz balandligi, moyka o'lchami va joyi | ① Xona — 5 ta toggle yonida ochiladigan qism |
| ERP plita qidiruvi (1281) | ② Mebel — Korpus/Fasad chipi bosilganda |
| Modul Z balandligi (TZ-15), sudrash, burish dastagi, telefon ishoralari | Modul kartasi va sahna |
| Xizmatlar — usta tanlaydi (prisadka, S3) | ③ Narx — kotirovka ostida |
| Raskroy parametrlari | ③ Narx — raskroy kartasida ⚙️ |
| Detallar / teshiklar / furnitura jadvali | ③ Narx — "Detallar" |
| Saqlash holati (Saqlandi / Saqlanmoqda / Internetsiz) | Header — loyiha nomi yonida |
| VR | Toolbar — 360° yonida, faqat VR qurilmada |
| Fayldan loyiha ochish | Loyihalarim |
| Sozlamalar: Sex standartlari (admin o'zgartiradi, usta ko'radi), Raskroy parametrlari, Akkaunt (ism, telefon, chiqish) | Yangi sahifa — dizayndagi "Sozlamalar" tugmasidan |

### 4.1 Dizaynda bor, lekin bizda hali yo'q — to'liq quriladi, backend ham (egasi, 2026-10-15: "dizayndagi hamma narsani qo'sh, backendda yo'q bo'lsa kod yoz")

| Dizayndagi narsa | Nima quriladi | Backend (server) |
|---|---|---|
| Sozlamalar → sex logosi | logo yuklash; PDF hisobot va rasmda usta logosi Bittada logosidan kichik (qoida S4) | logo faylini saqlash, `GET/PUT /api/settings` |
| Sozlamalar → narx ustamasi | usta o'z ustamasini o'rnatadi; "Foyda (+N%)" shu qiymatdan | foydalanuvchi sozlamasi |
| Sozlamalar → stanok profili | sexdagi stanoklar tanlanadi; Fayllar'da faqat shu stanoklar fayli ko'rinadi | foydalanuvchi sozlamasi |
| Ro'yxatdagi "Sex nomi" | profilda saqlanadi, hisobotda chiqadi | `users` ga `shop` maydoni |
| Loyiha kartasi: mijoz ismi, sana, modul soni, narx; qidiruv "nom yoki mijoz" | haqiqiy ma'lumotdan | `projects` ga `client` maydoni |
| Tortma ochilishi | Q5 | — |
| Ichini ko'rish | Q6 | — |
| Eshiklarni ochish, detal tanlash, mini-3D, maslahatlar, 2D/3D, Markazga | 6-bo'lim | — |
| 📸 Rasm "Bittada logosi bilan", PDF hisobot | Bittada logo fayli kelganda (TZ-08) | — |
| AI oynasi: matn va 🎤 ovoz | `ai.js` + `/api/ai/*`; ovoz — brauzerning nutq tanish funksiyasi | bor (TZ-12) |
| 🌐 til | Q8 | — |

- Har yangi server maydoni — mavjud bazaga ham qo'shiladi (`ALTER TABLE`, ma'lumot yo'qolmaydi); server testi yoziladi.

---

## 5. Egasi qarorlari

| № | Masala | Qaror |
|---|---|---|
| **Q1** | Yorug' rejim | ✅ Kerak emas — faqat dizayndagi qorong'i rejim. Qoida 6.1 qoidalar faylidan olib tashlandi (egasi, 2026-10-15) |
| **Q2** | Kirish | ✅ **Email + parol** (egasi, 2026-10-15). Ro'yxat: Ism, **Email** (yangi maydon, dizayn uslubida), Telefon (dizayndagi, S1), Parol, Sex nomi. Kirish: Email + Parol. SMS tizimi tayyor turadi, Eskiz kelgach yoqiladi |
| **Q3** | BPJ | ✅ Davom ettiriladi (egasi, 2026-10-15) — **TZ-17**. Qoida S5 BPJ uchun olib tashlandi. TZ-09 da: TZ-17 tugaguncha ustaga "tez orada", admin uchun SINOV bilan ochiq |
| **Q4** | Biesse / Homag | ✅ Egasi faylni o'zi stanokda sinaydi. Hozir ular loyiha emas — doim "Sample_Panel" 1200×600 chiqadi (TZ-01), shuning uchun haqiqiy fayl yozilmaguncha hech kimga ochilmaydi. Haqiqiy fayl va o'z tekshiruvim — TZ-11 (namuna fayllar kerak). Tayyor bo'lgach: admin uchun SINOV bilan ochiq, ustaga "tez orada" |
| **Q5** | Tortma ochilishi | ✅ Qo'shiladi: `assembler.js` ga faqat 3D ko'rinish uchun tortma; kesim va narx o'zgarmasligi test bilan tasdiqlanadi |
| **Q6** | Ichini ko'rish | ✅ Haqiqiy ishlaydi: 38 ta MebelCity modulida (`assembler.js` + furnitura). 83 ta umumiy modulda — TZ-05 (pauza) tugaguncha yashirin, chunki detal o'lchamlari noto'g'ri |
| **Q7** | Manzillar | ✅ Sayt `/`, ilova (veb-muharrir) `/app.html`, eski sayt `/eski/` da 2 hafta. Telefon ilovasi (App Store / Play Market) hozir qilinmaydi. Telegram bot uchun Mini App — alohida TZ-16 |
| **Q8** | 🌐 til | ✅ O'zbek, rus, ingliz — har bir matn (egasi, 2026-10-15) — **TZ-18**. TZ-09 da: har ekran ko'chirilganda matnlar lug'atga (`uz`) olinadi — ko'rinish o'zgarmaydi, keyin TZ-18 rus va inglizni qo'shadi |

---|---|---|
| **Q1** | **Yorug' rejim** | ✅ **QAROR (egasi, 2026-10-15):** yorug' rejim kerak emas — faqat dizayndagi qorong'i rejim, o'zgartirilmaydi |
| **Q2** | **Kirish** | ✅ **QAROR (egasi, 2026-10-15):** hozircha email bilan kirish; SMS tizimi ham tayyor turadi (Eskiz kelgach yoqiladi). ⏳ Email turi aniqlanmoqda: kod bilan yoki parol bilan |
| **Q3** | **BPJ:** dizaynda "tez orada"; oldingi qaror — SINOV bilan ochiq | Ustaga — "tez orada"; admin uchun ochiq + SINOV |
| **Q4** | **Biesse / Homag:** dizaynda ochiq; TZ-01 yashirgan (sinalmagan) | Ilovada BPJ uslubida "tez orada"; admin — SINOV bilan ochiq. Saytdagi yozuvga tegilmaydi |
| **Q5** | **Tortma ochilishi:** `assembler.js` tortma yasamaydi | `assembler.js` ga faqat 3D ko'rinish uchun tortma qo'shiladi; kesim va narx o'zgarmasligi test bilan tasdiqlanadi |
| **Q6** | **Ichini ko'rish:** dizaynda 2 modulda | 38 ta MebelCity modulida. 83 ta umumiy modulda — TZ-05 tugaguncha yashirin |
| **Q7** | **Manzillar** | `/` — sayt, `/app.html` — ilova (dizayndagi havolalar shunday). Eski sayt `/eski/` da 2 hafta zaxira, keyin alohida TZ bilan olib tashlanadi |

---

## 6. Texnik yondashuv

- **Bitta dvigatel.** `vite.config.js` da `../app/js/engine`, `../app/js/ai.js`, `../app/data` ga yo'l. Nusxa olinmaydi — ikkala frontend bir manbadan.
- **three.js** — bitta nusxa, 0.160 (dvigatel, sahna va React bir xil versiyada).
- **`price.js`** brauzerda `window.SpPrice` qilib yuklanadi. Vite'da shunday ishlamasa — mantiqqa tegmasdan yupqa ulagich.
- **`auth.js`** — server bilan ishlash va navbat qismi ekrandan ajratiladi. Mantiq o'zgarmaydi. React shu qismni ishlatadi.
- **3D sahna (muharrir).** Bizning `scene.js` / `items.js` / `controls.js` React ichiga qo'yiladi. Ular poligon xona, sudrash, burish, 2D reja, telefon ishoralari va VR'ni allaqachon biladi. Ko'rinish README'dagi "3D materiallar" qiymatlari bilan dizaynga moslanadi: ranglar, yog'och teksturasi, fon, yorug'lik, tanlov ramkasi, o'lcham chiziqlari, kamera, zoom 2.2–12. React'ning `s3Room` i ishlatilmaydi (S6).
- **Mini-3D detal kartasi va "Ichini ko'rish"** — React'ning o'z ko'rinish kodi (`s3Viewer`, `s3Build`, `s3Apply`) aynan qoladi. Unga `assembler.js` panellaridan tayyorlangan ro'yxat beriladi.
- **Sayt (landing)** — kod o'zgarishsiz. "Loyihamga qo'shish" orqali kelgan modul haqiqiy katalogdan olinadi.
- **Ekranlar fayllarga bo'linadi:** 1329 qatorli `App.jsx` → Kirish, Onboarding, Loyihalar, Muharrir, oynalar. JSX va stillar o'zgarmaydi, faqat ko'chiriladi. Har bo'lishdan keyin skrinshot solishtiriladi.
- **Internetsiz ishlash** — `vite-plugin-pwa`.
- **Shriftlar** — npm paket (`@fontsource/manrope`, `@fontsource/jetbrains-mono`), Google'ga bog'liq emas. Ko'rinish bir xil.
- **Yangi paketlar:** `vite-plugin-pwa`, `@fontsource/manrope`, `@fontsource/jetbrains-mono`. Boshqa paket qo'shilmaydi.

---

## 7. Bosqichlar (har biri alohida commit)

| № | Bosqich | Tekshiruv |
|---|---|---|
| 0 | `web/` ga ko'chirish (o'zgarishsiz); build xatosi (1 qator) va narx tugmasi bo'shlig'i; dizayn solishtirish testi | build o'tadi; skrinshot farqi ~0% |
| 1 | Ulash asosi: dvigatel/ma'lumot yo'llari, three bitta nusxa, `price.js`, shriftlar, internetsiz | build, internetsiz ochiladi |
| 2 | Kirish: email + parol (Q2), SMS qadami tayyor (o'chiq); foydalanuvchi serverdan; saytdan kelgan modul haqiqiy katalogdan. Server: ro'yxatda telefon (S1) va `users.shop` | server testi + brauzer testi: ro'yxat → kirish → chiqish |
| 3 | Onboarding + Loyihalarim: haqiqiy loyihalar, yangi, ochish, arxiv, avtomatik saqlash, internetsiz navbat | brauzer testi: saqlash → boshqa sessiyada ochish |
| 4 | Muharrir holati: `doc` modeli; katalog 121; material chiplari; modul kartasi (chegaralar, Z, nusxa, o'chirish, burish) | node + brauzer testlari |
| 5 | Muharrir 3D: bizning sahna dizayn uslubida; eshik ochish; detal tanlash + mini-3D; Ichini ko'rish; Rasm, 360°, VR | skrinshot (dizaynga uslubda mos), telefon/planshet/kompyuter |
| 6 | Narx va Fayllar: kotirovka, tannarx, foyda, narxi yo'qlar, raskroy, detallar, xizmatlar; haqiqiy fayllar | narx eski sayt bilan bir xil; har fayl yuklanadi |
| 7 | AI oynasi (TZ-12); Sozlamalar sahifasi (sex standartlari, raskroy, akkaunt, sex logosi, ustama, stanok profili); saqlash holati. Server: `/api/settings`, logo saqlash, `projects.client` | server testi + brauzer testi |
| 8 | 4-bo'limdagi qolgan qismlar — har biri skrinshot → sizning "ha" → kod | sizning tasdig'ingiz |
| 9 | Almashtirish: server `/` → yangi sayt, `/app.html` → ilova, eski → `/eski/`; `DEPLOY.md` ga build qadami; yakuniy tekshiruv (sekin internet, internetsiz, WebGL'siz) | to'liq hisobot |

---

## 8. Tegadigan va tegilmaydigan fayllar

**Tegadi:**
- Yangi `web/**` — React loyiha.
- `app/js/scene.js`, `items.js`, `controls.js`, `materials3d.js` — dizayn ko'rinishi va yangi xatti-harakatlar.
- `app/js/auth.js` — server/navbat qismi alohida modulga (mantiq o'zgarmaydi).
- `app/js/engine/assembler.js` — faqat Q5 "ha" bo'lsa (faqat 3D tortma).
- `server/index.js`, `server/init-db.js` — 4.1-bo'limdagi yangi maydon va endpointlar, Q2 kirish, sahifa yo'llari (9-bosqich). Mavjud API'lar o'zgarmaydi; `server/test/*` — yangi testlar.
- `server/DEPLOY.md` — build qadami.
- `tests/ui/*` — yangi frontend testlari.
- `.gitignore` — `web/node_modules`, `web/dist`.
- `loyiha-tz-lari/00-ROYXAT.md`.

**Tegilmaydi:**
- `app/js/engine/*` (Q5 dan tashqari), `app/data/*`, `app/js/ai.js`.
- Mavjud server API'lari (kirish, loyihalar, materiallar, AI, sex standartlari) — xatti-harakati o'zgarmaydi; node testlar.
- `frontend/` (asl dizayn va asl React nusxa).
- ERP, kroy.bittada.uz, tunel.bittada.uz.

---

## 9. Dizayn buzilmasligi kafolati

- **Statik ekranlar** (sayt, kirish, onboarding, bo'sh holatlar): avtomatik skrinshot solishtirish. 1440px va 390px; animatsiyadan tashqari farq ~0% bo'lishi shart.
- **Ma'lumotli ekranlar** (muharrir, narx, loyihalar): prototipdagi namuna loyiha (3.6×3 xona, 7 modul) haqiqiy loyiha sifatida ochiladi va yonma-yon solishtiriladi.
  - Joylashuv, rang, shrift bir xil bo'lishi shart.
  - Faqat raqamlar farq qiladi — ular haqiqiy hisobdan.
- Farq topilsa — sababi bilan sizga aytiladi, yashirilmaydi.

## 10. Xavf, moliya, orqaga qaytarish

- **Xavf: YUQORI.** Butun frontend almashadi.
  - Kamaytirish: alohida tarmoq, bosqichma-bosqich commit, skrinshot solishtirish.
  - Eski sayt `main` da ishlab turadi. Almashtirilgandan keyin ham 2 hafta `/eski/` da qoladi.
  - Server bazasiga faqat yangi maydon va jadval qo'shiladi (`users.shop`, `projects.client`, sozlamalar). Mavjud ma'lumot o'chirilmaydi va o'zgarmaydi. Serverga qo'yishdan oldin zaxira nusxa olinadi (TZ-10 skripti).
- **Moliya: PAST — zarar yetmaydi.**
  - Hisob dvigateli o'zgarmaydi.
  - Tasdiq: bir xil loyiha eski va yangi saytda bir xil jami va tannarx beradi (masalan, 3 847 207 va 3 948 457 so'mli test loyihalar). Farq chiqsa — ish to'xtaydi.
  - Pul harakati yo'q. ERP'ga yozilmaydi.
- **Foydalanuvchi ma'lumoti:** serverdagi loyihalar shakli o'zgarmaydi — eski va yangi sayt bir loyihani ocha oladi.
- **Orqaga qaytarish:** almashtirishdan oldin — hech narsa o'zgarmagan. Keyin — server yo'llarini qaytarish (1–2 qator) yoki `git revert`.

## 11. Boshqa AI bilan parallel ishlash

- Bu TZ davomida boshqa AI quyidagilarga tegmasligi kerak:
  - `web/`;
  - `app/js/scene.js`, `items.js`, `controls.js`, `materials3d.js`, `auth.js`.
- Dvigatel va server ustida parallel ishlash mumkin. Lekin dvigatel funksiyalari nomi va natija shakli o'zgarsa — oldindan aytilsin.

## 12. Egasidan kerak

1. Barcha qarorlar olindi (Q1–Q8).
2. "Boshla" — butun TZ uchun.
3. Ish davomida: 4-bo'limdagi har qism skrinshotiga "ha" yoki "yo'q".
4. Real ishga tushirish uchun (TZ-10, alohida): server va Eskiz akkaunti.

## 13. Qabul

- Saytning va ilovaning statik ekranlari dizayn bilan ~0% farq. Ma'lumotli ekranlarda joylashuv va uslub bir xil.
- SMS orqali kirish; loyiha serverga saqlanadi, boshqa qurilmada ochiladi, internetsiz o'zgarish keyin yuboriladi.
- Ilovada soxta ma'lumot yo'q: 121 modul, haqiqiy narx, raskroy, fayllar.
- Hozirgi saytdagi har bir funksiya yangi saytda bor (4-bo'lim), birortasi yo'qolmagan.
- Narx eski sayt bilan bir xil. Node, server va yangi brauzer testlari yashil.
- Telefon (390px), planshet, kompyuterda ishlaydi; internetsiz ochiladi.

## 14. Muddat (taxmin)

- Taxminan **9–11 ish kuni**: 0–1 — 1 kun, 2–3 — 1–2 kun, 4 — 1 kun, 5 — 2 kun, 6 — 1–2 kun, 7 — 1–2 kun, 8–9 — 1 kun.
- 8-bosqich sizning tasdiqlaringiz tezligiga bog'liq.
- Bu taxmin, aniq hisob emas.
