# TZ — Smart3D sayti: barqarorlik, responsive, smeta va xavfsizlik

**Sana:** 2026-10-14 · **Versiya:** 1 · **Asos:** `AUDIT-2026-10-14.md`
**Kim uchun:** loyiha egasi va Smart3D ustida ishlaydigan dasturchi yoki agent (Claude, OpenCode)

---

## 0. Qaror va ko'lam

**Egasining qarori (14.10):** hozircha faqat **sayt** qilinadi, mobil ilova keyinroq. Sayt
telefon, planshet va kompyuterning qaysi biridan ochilmasin, to'liq va qulay ishlashi shart.

**Bu TZ ga kiradi:**

| Bosqich | Nima | Natija |
|---|---|---|
| 0 | Git va ish tartibi | har o'zgarish saqlanadi va orqaga qaytariladi |
| 1 | Bloklovchi xatolar | sayt ochiladi, tugmalar ishlaydi |
| 2 | Responsive | har qanday ekranda qulay |
| 3 | Smeta to'g'riligi | narx va tannarx ishonchli |
| 4 | Server xavfsizligi | server buzilmaydi, begona kira olmaydi |

**Bu TZ ga kirmaydi (keyingi TZ):**
- CNC va stanok fayllari;
- 600 ta modul kutubxonasi;
- AI va LLM;
- multi-tenant va obuna;
- mobil ilova.

---

## 1. Ish qoidalari

1. **Git.** Har bosqich tugagach, alohida commit qilinadi. Ishni boshlashdan oldin `git status` tekshiriladi, chunki boshqa agent (OpenCode) ham shu papkada ishlashi mumkin.
2. **Hech narsa o'ylab topilmaydi.** Narx, o'lcham yoki material faqat manbadan olinadi (ERP Excel, egasi). Manbada yo'q bo'lsa, "narx yo'q" deb ko'rsatiladi.
3. **"Tayyor" degani tekshirilgan degani.** Har bosqich brauzerda haqiqatda ochib sinaladi (headless Chromium, §7 dagi ekran matritsasi). Konsolda JS xatosi bo'lmasligi kerak.
4. **Kod uslubi saqlanadi.** Vanilla JS va ES modullar, freymvork qo'shilmaydi. Izohlar o'zbekcha, mavjud kod bilan bir xil zichlikda yoziladi.
5. **Yangi kutubxona qo'shilmaydi.** Agar kerak bo'lib qolsa, egasi bilan kelishiladi.

---

## 2. Bosqich 0 — Git

| # | Vazifa | Qabul mezoni |
|---|---|---|
| 0.1 | `git init` va `.gitignore` yaratish: `node_modules/`, `*.db`, `*.db-wal`, `*.db-shm`, `.env`, OS fayllari | `git status` toza |
| 0.2 | Hozirgi holat birinchi commit qilinadi ("baseline, audit holati") | har qanday o'zgarishni shu holatga qaytarsa bo'ladi |

`smart3d.db` gitga kirmaydi: unda foydalanuvchilarning parol xeshlari bor.

---

## 3. Bosqich 1 — Bloklovchi xatolar

| # | Joy | Muammo | Talab |
|---|---|---|---|
| 1.1 | `app/js/app.js:919-920` | `exportPtp()` da `}` yo'q, sayt ochilmaydi | qavs qo'yiladi; barcha `.js` fayllar ES modul sifatida sintaksis tekshiruvidan o'tadi |
| 1.2 | `app.js:562` ↔ `ai.js:411` | `startVoice` noto'g'ri chaqiriladi | `startVoice({lang, onText, onEnd, onError})` yagona interfeysga keltiriladi; `uz-UZ` qo'llab-quvvatlanmasa `ru-RU` ga o'tadi; tugma holati doim tiklanadi |
| 1.3 | `photo-render.js:131` | `bbox.min.x` yo'q (sahna bbox'i `{minX…}` shaklida) | panorama markazi `bbox.cx/cy` dan olinadi; 360° tugmasi ishlaydi |
| 1.4 | `photo-render.js:34,98` | har renderdan keyin canvas 2× kattalashadi | render tugagach asl CSS o'lcham va pixel ratio aniq tiklanadi; 5 marta render qilinsa ham canvas o'lchami o'zgarmaydi |
| 1.5 | `app.js:652` | 360 oynasi Esc bilan yopilsa resurslar bo'shatilmaydi (xotira sizadi) | `dialog` ning `close` hodisasida `dispose()` chaqiriladi |
| 1.6 | `app.js:1257` | server bo'lmasa ham `localhost:3000` ga WebSocket ochiladi va konsolda xato chiqadi | WebSocket faqat server sozlangan bo'lsa ochiladi (`<meta name="s3d-ws">` yoki bir xil origin'dagi `/api/health` javobi) |
| 1.7 | `app.css` | `bad`, `info`, `warn` toast'lari uchun uslub yo'q | `.toast.bad/.err` qizil, `.warn` sariq, `.info` neytral |
| 1.8 | `app.js:438` | filtr tugmalarida ichki kod nomlari (`tall_cabinet`) ko'rinadi | barcha 21 kategoriyaga o'zbekcha nom beriladi |
| 1.9 | `app.js:305` | eksport tekshiruvi "0 m² = 35.6 m²" bo'lsa ham "mos keldi" deydi | `stats.area_m2` o'qiladi; farq bo'lsa ogohlantirish chiqadi |
| 1.10 | `app.js:992, 535` | "Yangi" va "AI qurish" loyihani so'ramasdan o'chiradi | mebel bor bo'lsa, `confirm` bilan so'raladi |
| 1.11 | `sw.js` | oflayn kesh ro'yxatida 7 ta fayl yo'q | ro'yxat haqiqiy fayllarga moslanadi; kesh versiyasi `v9` ga ko'tariladi; HTML va JS uchun "avval tarmoq, keyin kesh" strategiyasi (yangilanish bir yuklanishda yetib boradi) |

**Qabul:**
- Sayt ochiladi va konsolda 0 ta JS xatosi chiqadi.
- 2D va 3D, katalog, smeta va eksport ishlaydi.
- 1080p render 3 marta ketma-ket qilinganda ham canvas o'lchami o'zgarmaydi.
- 360° panorama ochiladi va yopiladi.

---

## 4. Bosqich 2 — Responsive (har qanday qurilma)

### 4.1 Ekran turlari

| Tur | Shart | Joylashuv |
|---|---|---|
| Telefon (tik) | eni < 600 px | sahna tepada, pastda tortiladigan panel (bottom sheet) |
| Telefon (yotiq) | balandligi < 500 px va eni ≥ 560 px | chapda tor yon panel (300 px), o'ngda sahna |
| Planshet (tik) | 600–899 px | pastki panel, lekin balandroq; kataloglar 3–4 ustunda |
| Kompyuter va planshet (yotiq) | ≥ 900 px | chapda yon panel (372 px), o'ngda sahna |
| Katta ekran | ≥ 1440 px | yon panel 420 px; kataloglar ko'proq ustunda |

### 4.2 Sahna (eng muhim qism)

| # | Talab |
|---|---|
| 2.1 | **DPR xatosi:** canvas va CSS2D qatlami doim konteyner o'lchamida bo'ladi (`width:100%; height:100%`). Retina va 3× ekranlarda sahna to'liq ko'rinadi |
| 2.2 | **Barmoq bilan 2D boshqaruv:** <br>• bo'sh joyni bir barmoq bilan sursa — sahna suriladi (pan);<br>• mebelni bir barmoq bilan sursa — mebel ko'chadi;<br>• ikki barmoq bilan — kattalashtirish va surish (pinch-zoom);<br>• ikki marta tegish — sahnani ekranga sig'dirish. <br>Sichqoncha: g'ildirak bilan zoom, bo'sh joyni chap tugma bilan sursa — pan |
| 2.3 | **3D:** OrbitControls barmoq rejimi — bir barmoq aylantiradi, ikki barmoq zoom va pan qiladi |
| 2.4 | **Sudrash tezligi:** sudralayotganda faqat o'sha mebel siljiydi; hamma mesh qayta qurilmaydi. Narx sudrash tugagach (yoki ≤ 5 marta/s) hisoblanadi |
| 2.5 | Panel ochilsa, yopilsa, ekran buralsa yoki klaviatura chiqsa, sahna o'lchami avtomatik moslashadi va kamera sig'diriladi |

### 4.3 Interfeys

| # | Talab |
|---|---|
| 2.6 | Balandlik uchun `100dvh` ishlatiladi: mobil brauzer manzil satri chiqib-yashirinsa ham panel joyida qoladi |
| 2.7 | Safe-area: tepadagi "chelka" (notch) va pastki indikator joyiga hech narsa tushmaydi (`env(safe-area-inset-*)`) |
| 2.8 | Barmoq bilan bosiladigan har bir element kamida 40×40 px |
| 2.9 | Telefonda input shrifti ≥ 16 px (iOS bosilganda zoom qilmasligi uchun) |
| 2.10 | Yuqori panel (header): kichik ekranda loyiha nomi qisqaradi, narx doim ko'rinadi |
| 2.11 | Sahna tugmalari (2D/3D/⌖/render) kichik ekranda bir qatorga sig'adi: render tugmalari ixcham bo'ladi (faqat ikonka) |
| 2.12 | Mebel kartasi (itemCard) telefonda pastki panelni yopib qo'ymaydi, panel ustida turadi; inputlar 2×2 to'rda joylashadi |
| 2.13 | Smeta jadvallari tor ekranda sahifani buzmaydi: jadval o'z ichida gorizontal suriladi |
| 2.14 | Modal oynalar (raskroy parametrlari, 360°) telefonda to'liq ekranga yaqin ochiladi, ichidagisi suriladi |
| 2.15 | Sahifa hech qanday ekranda gorizontal surilmaydi (`scrollWidth ≤ clientWidth`) |
| 2.16 | `hover` effektlari faqat sichqonchali qurilmada ishlaydi (`@media (hover:hover)`). Klaviatura uchun `:focus-visible` chegarasi bo'ladi |
| 2.17 | Klaviatura ochilganda panel ichidagi input ko'rinib turadi (`interactive-widget=resizes-content`) |

**Qabul — ekran matritsasi** (har birida skrinshot va avtomatik tekshiruv):

| Qurilma | O'lcham | DPR |
|---|---|---|
| Kichik Android | 360×740 | 3 |
| iPhone 14 | 390×844 | 3 |
| Telefon yotiq | 844×390 | 3 |
| iPad tik | 768×1024 | 2 |
| iPad yotiq | 1024×768 | 2 |
| Noutbuk | 1366×768 | 1 |
| Katta monitor | 1920×1080 | 1 |

Har bir o'lchamda quyidagilar tekshiriladi:
1. Konsolda JS xatosi yo'q.
2. Sahifa gorizontal surilmaydi.
3. Canvas o'lchami konteynerga teng.
4. Oshxona sahnada to'liq ko'rinadi.
5. 5 ta tab ham ochiladi.
6. Narx ko'rinadi.
7. Mebelni tanlash, o'lchamini o'zgartirish va narx o'zgarishi ishlaydi.
8. Telefon o'lchamlarida pinch-zoom tekshiriladi (CDP orqali touch hodisalari bilan).

---

## 5. Bosqich 3 — Smeta to'g'riligi

| # | Muammo | Talab |
|---|---|---|
| 3.1 | Tanlangan material tannarxga yetmaydi (`app.js:152`, `cutlist.js:36`) | `cutlist()` ga loyiha slotlari uzatiladi. Material yoki ERP varag'i tanlansa, korpus va fasad narxi, qalinligi va varaq o'lchami tannarxga ta'sir qiladi |
| 3.2 | Mijoz narxi katalogdagi qattiq narxdan olinadi | Ikki narx aniq ajratiladi:<br>• **mijoz narxi = tannarx × (1 + ustama)**;<br>• ustama sozlanadi, standart qiymat hozirgi kodda turgan qiymat.<br>Katalogdagi qattiq narx faqat ma'lumot uchun qoladi. ⚠️ Ustama foizini egasi tasdiqlaydi |
| 3.3 | Excel smetadagi furnitura qattiq yozilgan (`xlsxexport.js:366`) | Excel'ga loyihaning haqiqiy furniturasi va xizmatlari chiqadi; ma'lumot bo'lmasa, bo'lim bo'sh qoladi |
| 3.4 | 187 ta furnituraga narx o'ylab topilgan | Narxlar manba Excel'dan (`Zapchast_Furnitura`) qayta olinadi. Manbada 0 bo'lsa → `uzs: 0` va `no_price: true`; smetada "narx yo'q" belgisi chiqadi |
| 3.5 | Kesim o'lchamidan kromka qalinligi ayirilmaydi | Detal o'lchami = tayyor o'lcham − kromka qalinligi (har bir tomon uchun) |
| 3.6 | Bitta loyiha uchun 3 xil jami chiqadi | UI, Excel va hisobotdagi jami bir xil bo'ladi (bitta funksiyadan olinadi) |

**Qabul:**
- LDSP16 va LDSP18 tanlanganda tannarx farq qiladi.
- Narxi qimmat ERP varag'i tanlansa, tannarx oshadi.
- UI, Excel va hisobotdagi jami bir xil.
- Narxsiz furnitura "narx yo'q" deb ko'rinadi.

---

## 6. Bosqich 4 — Server xavfsizligi (`server/index.js`)

| # | Muammo | Talab |
|---|---|---|
| 4.1 | Obyekt yuborilsa server o'chadi | Barcha kirish ma'lumotlari tur bo'yicha tekshiriladi. Global xato middleware'i va `uncaughtException` himoyasi qo'shiladi; server hech qachon o'chmaydi |
| 4.2 | JWT kaliti standart qiymatda | Kalit faqat `JWT_SECRET` env'dan olinadi. Production'da kalit bo'lmasa server ishga tushmaydi; dev rejimida tasodifiy kalit yaratiladi va ogohlantirish chiqadi |
| 4.3 | `admin123` | Admin paroli `ADMIN_PASSWORD` env'dan olinadi; standart parol bilan admin yaratilmaydi |
| 4.4 | Autentifikatsiyasiz endpointlar | Yozuvchi endpointlar (`POST/PUT /api/remnants*`, `/api/ai/*`) — faqat login bilan |
| 4.5 | Rate limit yo'q | `/api/login` va `/api/register` da IP bo'yicha cheklov (masalan 10 urinish / 15 daqiqa); yangi kutubxonasiz |
| 4.6 | CORS `*` | Ruxsat berilgan manzillar `ALLOWED_ORIGINS` env'dan olinadi |
| 4.7 | Email/parol tekshiruvi yo'q, ism XSS | email formati, parol ≥ 8 belgi, ism uzunligi va belgilari tekshiriladi |
| 4.8 | `better-sqlite3` `package.json` da yo'q, `init-db` skripti yo'q | `package.json` tuzatiladi; `npm ci && npm run init-db && npm start` toza papkada ishlaydi |

**Qabul:**
- Avvalgi crash so'rovi 400 qaytaradi va server ishlashda davom etadi.
- Standart kalit bilan yasalgan token rad etiladi.
- 11-urinishda 429 qaytadi.
- Autentifikatsiyasiz yozish 401 qaytaradi.
- Toza `npm ci` bilan server ishga tushadi.

---

## 7. Tekshirish usuli

- **Sintaksis:** barcha `.js` fayllar ES modul sifatida (`node --check` + `.mjs` nusxa).
- **Brauzer:** headless Chromium.
  - Konsol xatolari `addInitScript` orqali yig'iladi (patchright konsolni ko'rsatmaydi).
  - §4 dagi ekran matritsasi; har o'lcham uchun skrinshot.
- **Server:** `curl` bilan §6 dagi hujum stsenariylari.
- **Yakunda:** o'zgarishlar code review'dan o'tkaziladi va topilgan xatolar tuzatiladi.

---

## 8. Egasidan kerak (bu TZ uchun)

1. **Ustama foizi** (mijoz narxi = tannarx + ustama). Hozirgi kodda turgan qiymat vaqtincha qo'llanadi.
2. **Server joylashuvi** (deploy uchun keyingi TZ'da kerak): `smart3d.bittada.uz` qayerda turadi.
