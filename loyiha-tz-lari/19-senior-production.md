# TZ-19 — Production darajasi: modullar, xavfsizlik, xato kodlari, ikonlar

**Sana:** 2026-10-15 · **Navbat:** 19 · **Holat:** TASDIQLANDI 2026-10-15 ("boshla") — BAJARILMOQDA
**Asos (egasi, 2026-10-15):** "har bir sahifa, har bir bo'limni modul qil; senior software engineer kabi; fayllar arxitekturasi ham shunday; loyihani kiber hujumlardan to'liq himoyalash; har bir qismga error log kodlari; ikonlardan foydalan, stikerlardan emas; hamma modul real ishlaydigan va productionga tayyor bo'lsin".
**Bog'liq:** TZ-09 (yangi frontend — `dizayn` tarmog'i), TZ-07 (kirish), TZ-10 (deploy), TZ-14 (standartlar), TZ-16 (Telegram).

---

## 0. Tamoyillar

- **Faqat sifat va xavfsizlik.** Hisob dvigateli (`app/js/engine/*`) va ma'lumot o'zgarmaydi. Narx eski sayt bilan aynan bir xil qoladi — `tests/ui/hisob_teng.sh` buni tekshiradi.
- **Har qadamdan keyin barcha testlar yashil:**
  - `run-all` (node);
  - server;
  - `web.sh` (yangi sayt — 6 to'plam);
  - `dizayn.sh`;
  - `hisob_teng`;
  - eski saytning `ui/run.sh`.
- **Dizayn:** joylashuv, rang va shrift o'zgarmaydi. **Yagona istisno — egasining qarori: emoji o'rniga SVG ikonlar** (4-bo'lim).
  - Logo ("3D" + "Smart3D by Bittada") tegilmaydi.
- **Yangi kutubxona — faqat bitta:** ikonlar (Q2). Qolgani o'zimizda, chunki tashqi paket — qo'shimcha hujum yuzasi.

---

## 1. Arxitektura — funksiya bo'yicha modullar

**Hozir (tekshirilgan):**
- `App.jsx` — 818 qator: hamma sahifaning holati va mantiqi bir faylda.
- `Landing.jsx` — 963 qator.
- Ekranlar ma'lumotni bitta katta `v` obyektidan oladi.

**Bo'ladi:**
```
web/src/
  app/              main.jsx, App.jsx (faqat qobiq va sahifa tanlash, ~100 qator), routes.js
  store/            holat — React Context + useReducer (yangi kutubxonasiz):
                    session (kirish), project (doc, hisob, avtomatik saqlash), settings, ui (toast, tasdiq)
  features/         har bo'lim — o'z papkasi: ekran + o'z hook'i + o'z xato kodlari
    auth/           Kirish, useAuth
    onboarding/
    projects/       Loyihalar, useProjects
    settings/       Sozlamalar (har bo'lim alohida komponent)
    editor/         EditorPage, EditorNav
      scene/        Sahna, useSahna (bridge/sahna.js)
      room/         QadamXona, Teshik/Shakl/Oshxona varaqlari, useRoom
      catalog/      QadamMebel, ModulKarta, MaterialVaraq, useCatalog
      pricing/      QadamNarx, Xizmatlar, usePricing
      files/        QadamFayllar, useFiles (bridge/eksport.js)
      inside/       IchiniKorish
      ai/           AiOyna, useAI
  shared/
    ui/             Karta, Chip, Toggle, Varaq, Input, Tugma, Ikon, Toast, Tasdiq, XatoChegarasi (ErrorBoundary)
    lib/            format (so'm, sana, telefon), xato kodlari, logger
    design3d/       dizayn 3D ko'rinish kodi (hozirgi engine.js — s3Viewer, s3Build ...)
  services/         api (server so'rovlari, kirish), hisob, loyiha, eksport, ichki (hozirgi bridge/)
  landing/sections/ Header, Hero, Kimlar, Demo3D, Qadamlar, Fayllar, Savollar, CTA, Footer
```
**Qoidalar:**
- bitta fayl ≤ ~250 qator;
- har modul o'z ma'lumotini o'zi oladi (katta `v` yo'qoladi);
- dizayn stillari `shared/ui` komponentlariga ko'chadi — natija pikselma-piksel o'sha (`dizayn.sh`).

---

## 2. Xato kodlari va jurnal — istalgan xato ushlanadi

**Kod shakli:** `S3D-<BO'LIM>-<NNN>`, masalan `S3D-EXP-004`.

| Bo'lim | Nima |
|---|---|
| AUTH | kirish, ro'yxat, sessiya |
| PROJ | loyihalar, saqlash, navbat |
| SET | sozlamalar, logo |
| STD | sex standartlari |
| CALC | hisob (narx, raskroy) |
| EXP | fayllar, eksport |
| SCENE | 3D sahna, WebGL |
| AI | AI, ovoz |
| DATA | ma'lumot yuklash |
| NET | tarmoq, server javobi |
| VAL | kiritish tekshiruvi |
| RATE | cheklov (429) |
| SRV | server ichki xatosi |

To'liq ro'yxat — `shared/lib/xatolar.js` va `server/xatolar.js` (bitta manba, hujjat bilan).

**Frontend:**
- har modulda `XatoChegarasi` (ErrorBoundary): modul yiqilsa, faqat o'sha bo'lim "Xatolik yuz berdi · kod S3D-… · Qayta urinish" deydi, sayt ishlashda davom etadi;
- global `window.onerror` va `unhandledrejection`;
- server so'rovlari — vaqt chegarasi (15 s), status → kod;
- foydalanuvchiga — tushunarli o'zbekcha matn + kichik kod (qo'llab-quvvatlash uchun);
- xato serverga yuboriladi: kod, modul, sahifa, brauzer, vaqt. **Parol, token, email, telefon yuborilmaydi.**

**Server:**
- har javobda `rid` (so'rov raqami) va xatoda `code`;
- JSON qatorli jurnal: vaqt, daraja, kod, rid, foydalanuvchi id, yo'l, qisqa matn;
- shaxsiy ma'lumot niqoblanadi (`99890*****67`), parol/token/body hech qachon yozilmaydi;
- `error_log` jadvali — oxirgi 30 kun / 10 000 qator (eski o'chiriladi);
- `POST /api/log` — saytdan kelgan xatolar: o'lcham ≤ 4 KB, maydonlar ro'yxati qat'iy, 30 ta/daqiqa/IP;
- admin uchun **"Xatolar jurnali"** — Sozlamalar ichida (Q3): kod, soni, oxirgi vaqt, rid bo'yicha qidiruv.

---

## 3. Xavfsizlik — tekshiruv hisoboti (2026-10-15) va tuzatishlar

**Hozir bor (yaxshi):**
- parol — bcrypt;
- SQL — tayyorlangan so'rovlar (injection yo'q);
- JWT — HS256, 12 soat, production'da kalitsiz server ishga tushmaydi;
- 500 xatoda ichki tafsilot chiqmaydi;
- CORS yopiq;
- `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`;
- kirish, ro'yxat, SMS va AI'ga IP cheklovi;
- boshqa usta loyihasini ko'ra olmaydi (test bor);
- logo faqat PNG/JPEG/WEBP;
- saytda `innerHTML` yo'q;
- `npm audit` — server ham, sayt ham **0 zaiflik**.

**Topilgan kamchiliklar va tuzatish:**

| № | Kamchilik | Xavf | Tuzatish |
|---|---|---|---|
| X1 | **CSP yo'q** — XSS bo'lsa skript ishlaydi | YUQORI | Qat'iy `Content-Security-Policy`: `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `img-src 'self' data: blob:`, `connect-src 'self'`; style — inline (React stillari) |
| X2 | **Kirish kaliti `localStorage` da** — XSS bo'lsa o'g'irlanadi | YUQORI | Q1: `httpOnly; Secure; SameSite=Strict` cookie + yozuvchi so'rovlarda Origin tekshiruvi; o'tish davrida server ikkalasini qabul qiladi (eski sayt buzilmasin) |
| X3 | **Chiqishda kalit bekor qilinmaydi** (12 soat amal qiladi) | O'RTA | `token_version` — chiqish va parol o'zgarganda eski kalitlar yaroqsiz |
| X4 | **Hisob bo'yicha bloklash yo'q** (faqat IP) — ko'p IP'dan parol tanlash | O'RTA | 5 xato → shu akkaunt 15 daqiqa bloklanadi; admin — xabar |
| X5 | **Umumiy so'rov cheklovi yo'q** (faqat 5 ta endpointda) | O'RTA | Hamma `/api`: 300/daqiqa/IP; yozuvlar: 60/daqiqa/foydalanuvchi |
| X6 | **WebSocket** — ulanish soni cheklanmagan, Origin tekshirilmaydi | O'RTA | Origin tekshiruvi, 5 ulanish/IP, kiruvchi xabarlar e'tiborsiz |
| X7 | **Loyiha hujjati chuqur tekshirilmaydi** (2 MB gacha ixtiyoriy JSON) | O'RTA | Sxema: sonlar oralig'i, satr uzunligi, massiv o'lchami — noto'g'ri 400 |
| X8 | **HSTS yo'q** | PAST | Production'da `Strict-Transport-Security` (1 yil) |
| X9 | **Jurnal tuzilmasiz** — hujumni ko'rib bo'lmaydi | O'RTA | 2-bo'lim: kodli jurnal, 401/403/429 ham yoziladi |
| X10 | **bcrypt cost 10** | PAST | 12 (yangi parollar va kirishda qayta xeshlash) |
| X11 | Statik fayllar keshi va sarlavhalari | PAST | `assets/*` — immutable kesh, HTML — `no-cache` |

**Avtomatik hujum testlari (server):**
- XSS satrlari (loyiha nomi, mijoz, logo);
- katta so'rov;
- cheklovlar;
- boshqa usta loyihasi (IDOR);
- buzilgan JWT;
- CSP va cookie belgilari;
- WebSocket toshqini.

---

## 4. Ikonlar — emoji o'rniga SVG (egasi qarori)

- **Kutubxona:** `lucide-react` (ISC litsenziya, Q2). Versiya qat'iy belgilanadi, kamida 2 hafta oldin chiqqan.
- Faqat ishlatilgan ikonlar build'ga kiradi.
- **~40 xil emoji almashadi.** Masalan:

  | Emoji | Ikon |
  |---|---|
  | 📸 | Camera |
  | 🔄 | Rotate3d |
  | 🚪 | DoorOpen |
  | ⌖ | Crosshair |
  | ✨ | Sparkles |
  | 🎤 | Mic |
  | 🪄 | Wand |
  | 🗑 | Trash2 |
  | ⧉ | Copy |
  | ⟳ | RotateCw |
  | ◀ ▶ | ChevronLeft / ChevronRight |
  | × | X |
  | ✓ | Check |
  | ⚠️ | TriangleAlert |
  | 📊 | FileSpreadsheet |
  | 🖨 | Printer |
  | 📂 | FolderOpen |
  | ⚙ | Settings |
  | ☁ | Cloud / CloudOff |
  | 🥽 | Glasses |
  | 🔍 | Search |
  | ✎ | Pencil |
  | 🌐 | Globe |
  | 👁 | Eye / EyeOff |
  | 🍳 | ChefHat |
  | 🛏 | Bed |
  | ☰ | Menu |

- O'lcham va rang dizayndagi emoji o'rnida: `currentColor`, 16–22 px.
- Sayt (landing) ham, ilova ham.
- `dizayn.sh` da "egasi qarori: ikonlar" farqi deb belgilanadi.

---

## 5. Production tayyorgarligi

- **Tezlik:**
  - 3D kutubxonasi (667 KB) faqat kerak bo'lgan sahifada yuklanadi (code-split);
  - landing 3D'si ham kechiktiriladi;
  - maqsad — telefonda birinchi ekran ≤ 2.5 s (4G).
- **Qulaylik:** har tugmada `aria-label`, klaviatura bilan yurish, fokus ko'rinadi.
- **Landing:** sarlavha, tavsif, Open Graph (Telegram/ijtimoiy tarmoqda chiroyli havola), 404 sahifa.
- **Doimiy tekshiruv (CI):** GitHub Actions — node, server, build testlari har push'da. Fayl repoga qo'shiladi, push faqat siz aytganda.
- **Nazorat:**
  - `/api/health`;
  - xatolar jurnali;
  - zaxira (TZ-10) — tiklash mashqi yo'riqnomaga yoziladi.

---

## 6. Bosqichlar (har biri — alohida commit, hamma test yashil)

| № | Bosqich | Tekshiruv |
|---|---|---|
| 1 | Arxitektura: `store/`, `shared/ui`, `services/`, `features/*`, landing bo'limlari — xatti-harakat o'zgarishsiz | barcha testlar + `dizayn.sh` 0% |
| 2 | Xato kodlari va jurnal (server + sayt + admin "Xatolar jurnali") | yangi testlar: xato → kod → jurnal |
| 3 | Xavfsizlik X1–X11 + avtomatik hujum testlari | server testlari, brauzer (CSP buzmaydi) |
| 4 | Ikonlar | `dizayn.sh` (faqat ikon farqi), skrinshotlar sizga |
| 5 | Production: code-split, qulaylik, SEO, 404, CI | o'lcham va tezlik o'lchovi, hisobot |
| 6 | TZ-09 qolgani: tortma (Q5), saytni almashtirish (`/`, `/eski/`) | yakuniy tekshiruv |

## 7. Tegadigan va tegilmaydigan fayllar

**Tegadi:**
- `web/src/**` — qayta tuzilish;
- `web/package.json` — `lucide-react`;
- `server/index.js`, yangi `server/xatolar.js`, `server/jurnal.js`, `server/himoya.js`, `server/test/*`;
- `app/js/auth-core.js` — cookie rejimi, eski sayt ham ishlayveradi;
- `server/DEPLOY.md`;
- `.github/workflows/test.yml`.

**Tegilmaydi:**
- `app/js/engine/*`, `app/data/*`;
- eski sayt ekranlari (`app/index.html`, `app/js/app.js`) — faqat auth-core orqali;
- ERP, kroy/tunel.

## 8. Xavf, moliya, orqaga qaytarish

- **Xavf: YUQORI** — kirish usuli (cookie) va CSP sayt ishlashiga ta'sir qilishi mumkin.
  - Kamaytirish: o'tish davrida server ikkala usulni qabul qiladi; CSP har sahifada brauzer testlari bilan; bosqichma-bosqich commit; `dizayn` tarmog'ida.
- **Moliya: PAST** — hisob dvigateliga tegilmaydi; `hisob_teng` testi. Pul harakati yo'q.
- **Foydalanuvchi ma'lumoti:** bazaga faqat yangi maydon va jadval (`token_version`, `error_log`, bloklash hisoblagichi) qo'shiladi; mavjud ma'lumot o'zgarmaydi; oldin zaxira.
- **Orqaga qaytarish:** har bosqich alohida commit — `git revert`. Cookie rejimi muhit o'zgaruvchisi bilan o'chiriladi.

## 9. Egasi qarorlari (2026-10-15: "boshla" — tavsiyalar qabul qilindi)

| № | Savol | Tavsiya |
|---|---|---|
| Q1 | Kirish kaliti saqlanadigan joy | **httpOnly cookie** — XSS bo'lsa ham kalit o'g'irlanmaydi |
| Q2 | Ikonlar kutubxonasi | **lucide-react** — 1500+ ikon, bir xil uslub, ISC litsenziya |
| Q3 | Xatolar jurnali qayerda ko'rinadi | **Sozlamalar → "Xatolar jurnali" (faqat admin)** + server fayli |
| Q4 | Jiddiy xato haqida darhol xabar | Keyin — Telegram bot ulanganda (TZ-16) |

## 10. Qabul

- `App.jsx` ~100 qator, har fayl ≤ ~250 qator, har bo'lim — alohida modul.
- Istalgan xato kod bilan foydalanuvchiga ko'rinadi va jurnalga tushadi; sayt yiqilmaydi (modul chegarasi).
- X1–X11 bajarilgan, hujum testlari yashil, `npm audit` — 0.
- Sayt va ilovada emoji qolmagan — hammasi SVG ikon.
- Narx eski sayt bilan bir xil; barcha testlar yashil; statik ekranlar dizayn bilan bir xil (ikonlardan tashqari).

## 11. Muddat (taxmin)

- Taxminan **3–4 ish kuni**:
  - 1-bosqich — 1 kun;
  - 2 — 0.5–1;
  - 3 — 1;
  - 4 — 0.5;
  - 5 — 0.5;
  - 6 — 0.5–1.
- Bu taxmin, aniq hisob emas.
