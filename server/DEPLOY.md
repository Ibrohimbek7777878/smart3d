# Smart3D — serverga o'rnatish va zaxira (TZ-10)

**Kim uchun:** Bittada server admini yoki server agenti. Manzil: `smart3d.bittada.uz`, Bittada serveri (egasi qarori, 2026-10-15).

**Tartib:** avval **test** (alohida port + alohida baza), tekshirilgach — jonli.

**Mavjud o'rnatishni yangilash uchun qadamma-qadam tayyor buyruqlar** (zaxira, yangilash, tekshiruv, qaytarish) — repo ildizidagi **`PRODUCTION-RO'YXAT.md`**. Bu hujjat — to'liq ma'lumotnoma.

**Qoida:** server sozlamalarini (nginx, systemd, PM2) admin qo'yadi. Bu hujjat faqat namuna beradi. Boshqa xizmatlarga tegilmaydi — Smart3D o'z porti, o'z jarayoni va o'z bazasida ishlaydi.

## 1. Talablar
- Node.js 22+ (better-sqlite3 13 talabi: `engines.node >=22`; Node 20 da `better-sqlite3` ishga tushganda xotira xatosi beradi — Docker sinovida tasdiqlandi). CI da 24.
- `better-sqlite3` qurish uchun: `python3`, `make`, `g++`.
- Bo'sh port, masalan `3070` — admin tanlaydi.

## 2. Kod
Kod `git` orqali olinadi va yangilanadi (`server/yangilash.sh` shuni ishlatadi). Birinchi marta:
```bash
git clone <repo manzili> /srv/smart3d && cd /srv/smart3d && git checkout main
# server: ISHLAB CHIQARISH bog'liqliklari. `npm ci` (npm install emas!) — package-lock.json bo'yicha aniq versiyalar
cd server && npm ci --omit=dev
# yangi sayt: build kerak, shuning uchun dev bog'liqliklar ham (muhitda NODE_ENV=production bo'lsa, majburiy NODE_ENV=development)
cd ../web && NODE_ENV=development npm ci --include=dev && NODE_ENV=development npx vite build
```
- **`npm ci` majburiy**, `npm install` emas: `openskp` kutubxonasi `1.3.0` ga qotirilgan (web/package.json), lock fayl bilan mos.
  `npm ci` lock bo'yicha o'rnatadi va lock mos kelmasa xato beradi.
- Muhitda `NODE_ENV=production` global o'rnatilgan bo'lsa, oddiy `npm ci` dev paketlarni (vite) o'rnatmaydi — build yiqiladi. Shuning uchun `NODE_ENV=development` ... `--include=dev`.
- **Kerakli papkalar:** `server/`, `web/` (build natijasi `web/dist/`), `app/` (ma'lumot va eski sayt).
- **Kerak emas va serverga qo'yilmaydi:** `data1/`, `Smart3D_malumot/`, `Smart3D_toplam*/`, narx fayllari (`*.xlsx`, `NARX.pdf`) — ular ommaviy repoda ham yo'q (`.gitignore`).
- Node.js: 22 yoki yuqori (CI va Docker — 24).

**Manzillar (TZ-09 Q7, TZ-30).** Server `web/dist` ni o'zi ko'radi va manzillarga o'zi javob beradi (`server/routes/sahifalar.js`):
- `/` — bosh sahifa;
- `/app.html` va ilova manzillari — **hammasi `app.html`** (ilova ekranni manzildan tanlaydi): `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/yangi`, `/loyiha/<raqam>`, `/sozlamalar`, `/sozlamalar/narxlar`, `/buyurtmalar`, `/tg`;
- **admin panel (TZ-37)** — ham `app.html`: `/admin` va `/admin/(narxlar|furnitura|materiallar|katalog|promptlar|standart|foydalanuvchilar|tarix)`. Ro'yxat — `ILOVA_YOLI` (`server/routes/sahifalar.js`), frontenddagi `web/src/app/marshrutlar.js` bilan bir xil (mosligi `server/test/prod.test.js` da tekshiriladi). Admin bo'lmagan foydalanuvchiga ilova kirish sahifasini ko'rsatadi; `/api/admin/*` esa admin bo'lmaganga **404** `S3D-AUTH-006` (panel mavjudligi bildirilmaydi). Noma'lum bo'lim (`/admin/yoq`) — 404;
- `/eski/` — eski sayt, 2 hafta zaxira (keyin alohida TZ bilan olib tashlanadi);
- qolgan har qanday sahifa — 404 (`app.html` ga burilmaydi).

Shu sababli **nginx hammasini serverga uzatadi** (`try_files` yoki "hamma yo'l `app.html` ga" qoidasi qo'yilmaydi) — §6. `web/dist` yo'q bo'lsa, eski sayt `/` da qoladi. Shuning uchun build — majburiy qadam.

Yangi sayt birinchi ochilganda brauzerdagi eski service worker yangisiga almashadi va eski keshlar tozalanadi. Shu sababli birinchi ochilishda eski sayt bir marta ko'rinishi mumkin.

## 3. Muhit fayli (gitga KIRMAYDI)
`/etc/smart3d.env` — egasi `root`, guruhi `smart3d`, ruxsat `640`. To'liq namuna va har o'zgaruvchining izohi — **`server/.env.example`** (sirlarsiz). Eng kamida:
```bash
NODE_ENV=production
PORT=3070
TRUST_PROXY=1
DB_PATH=/var/lib/smart3d/smart3d.db
JWT_SECRET=<openssl rand -hex 48 natijasi>
JWT_EXPIRES=30d
```
Ixtiyoriy (yo'q bo'lsa tegishli imkoniyat o'chiq, sayt ishlayveradi): `GOOGLE_CLIENT_ID` (§8a), `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` / `ESKIZ_FROM` (SMS), `AI_PROVIDER` / `AI_MODEL` / `ANTHROPIC_API_KEY` va AI chegaralari `AI_OYLIK_TOKEN` / `AI_KUNLIK_SOROV` / `AI_KESH_KUN` (§6, AI), `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` / `TELEGRAM_WEBAPP_URL` (§6, Telegram).
- TZ-37 (admin panel) va TZ-40 (AI token nazorati) **yangi majburiy o'zgaruvchi qo'shmadi**; yangilashda muhit fayliga tegish shart emas (AI chegaralari sukut qiymat bilan ishlaydi). Kodda o'qiladigan har bir o'zgaruvchi `server/.env.example` da izohlangan (sinov: `prod.test.js`).
- `JWT_SECRET` 32 belgidan qisqa yoki yo'q bo'lsa, production server **ishga tushmaydi** (`lib/config.js`; sinov: `server/test/prod.test.js`).
- Standart `admin123` paroli bilan ham ishga tushmaydi (`lib/auth.js`).
- SMS (Eskiz) sozlanmasa production'da SMS bilan kirish o'chiq (503), saytda tugma ko'rinmaydi; email/parol va Google ishlayveradi.
- **Eskiz:** SMS matni ("Smart3D kirish kodi: XXXXXX. Kodni hech kimga bermang.") shablon sifatida moderatsiyadan o'tishi talab qilinishi mumkin — akkauntda tekshiring.

## 4. Baza (faqat birinchi marta)
```bash
mkdir -p /var/lib/smart3d
cd /srv/smart3d/server
DB_PATH=/var/lib/smart3d/smart3d.db ADMIN_EMAIL=<admin email> ADMIN_PASSWORD='<kuchli parol>' node init-db.js
```
Keyingi ishga tushishlarda yangi jadvallar o'zi qo'shiladi (`CREATE TABLE IF NOT EXISTS`) — `init-db` qayta ishlatilmaydi. Uni `--force` bilan ishlatsangiz, foydalanuvchilar o'chadi. Yangilashda nima bo'lishi — §9, "Yangilashdan keyin baza".

## 5. Ishga tushirish (bittasini tanlang)
**PM2:**
```bash
cd /srv/smart3d/server
set -a; . /etc/smart3d.env; set +a
pm2 start ecosystem.config.cjs --env production && pm2 save
```

**systemd** (namuna, admin qo'yadi):
```ini
[Unit]
Description=Smart3D
After=network.target
[Service]
User=smart3d
WorkingDirectory=/srv/smart3d/server
EnvironmentFile=/etc/smart3d.env
ExecStart=/usr/bin/node index.js
Restart=on-failure
[Install]
WantedBy=multi-user.target
```
- **Bitta jarayon.** SQLite, so'rov cheklovlari va SMS hisoblagichlari xotirada — klaster rejimi ishlatilmaydi.
- **Docker** (muqobil): repo ildizidan `docker build -f server/Dockerfile -t smart3d .` (uch bosqich: sayt build, bog'liqliklar, ishchi rasm; Node 24, `node` foydalanuvchisi; sinovdan o'tgan: rasm quriladi va o'sha paytdagi `tekshiruv.sh` 24/24 ✅ (skript keyin kengaytirildi — admin sahifalari va ochiq API; Dockerfile `server/*.js`, `lib`, `routes`, `app/` ni nusxalaydi, yangi fayllar shunga kiradi); `.dockerignore` maxfiy va katta fayllarni konteynerga olmaydi). Ishga tushirish: `docker run -p 3000:3000 -e JWT_SECRET=<…> -e ADMIN_PASSWORD=<…> -v smart3d-data:/data smart3d`.

## 6. nginx (namuna, admin qo'yadi)
Tayyor namuna — repoda **`server/nginx.conf`** (serverda tahrirlanmaydi; admin uni nusxalab `conf.d` ga qo'yadi, `server_name` va port ni o'zgartiradi, `nginx -t` bilan tekshiradi). Qoidalari:
- Hammasi `proxy_pass` bilan Smart3D serveriga: sahifa manzillari (`/loyihalar`, `/admin`, `/admin/materiallar` va boshqalar), `/api` (`/api/admin/*`, `/api/materiallar`, `/api/katalog`, `/api/furnitura-boglash`, `/api/promptlar`, `/api/standart` ham), `/assets`, `/data`, `/eski/`. **Admin panel uchun nginx'da yangi blok kerak emas** — hammasi `location /` orqali; sinov: `prod.test.js` nginx.conf ILOVA_YOLI manzillarini maxsus blokka tushirib yubormasligini tekshiradi. **`try_files` yo'q**: `app.html` ni va 404 ni server o'zi beradi, CSP/HSTS/nosniff ham serverdan keladi (nginx takrorlamaydi).
- `/ws` — WebSocket (`Upgrade`), uzoq timeout.
- `Host`, `X-Forwarded-For`, `X-Forwarded-Proto` — hamma `location` da (cookie CSRF tekshiruvi, rate limit, `Secure` cookie).
- Kesh: `/assets/*` — server `immutable` (1 yil) beradi; `/sw.js`, `/app.html`, `*.html`, `*.webmanifest`, `/data/*.json` — `no-cache` (server); `/data/rasm/` — nginx `public, max-age=30 kun, immutable` (rasm nomi = id; rasm almashsa — yangi nom bering). `/api/*` javoblarini server `no-cache` / `no-store` bilan beradi, nginx keshlamaydi (admin o'zgartirishi darhol ko'rinadi).
- **Material rasmi** (`/api/materiallar/rasm/<kalit>?v=<xesh>`, admin yuklaydi, bazada): `/data/rasm/` kabi "doim immutable" **qo'yilmaydi** — admin rasmni shu kalit ostida almashtiradi. Keshni server hal qiladi: `?v=` xeshi hozirgi rasmga mos kelsa `immutable` (1 yil), aks holda `no-cache` + `ETag` (304). `server/nginx.conf` da buning uchun alohida `location ^~ /api/materiallar/rasm/` bor va u sarlavhani o'zgartirmaydi (`proxy_hide_header` / `add_header` yo'q). Tekshiruv: `tekshiruv.sh` (§7).
- `client_max_body_size 3m` (loyiha hujjati 2 MB; material rasmi — admin yuklaydi, 600 KB gacha, base64 ~800 KB — shunga ham yetadi); `/api/telegram/fayl` uchun 15m.
- Kirish yo'llari (`/api/auth/*`, `/api/login`, `/api/register`) — qo'shimcha `limit_req`.
HTTPS — `certbot --nginx -d smart3d.bittada.uz`. Sayt PWA va telefon kamerasi/mikrofoni uchun HTTPS shart.

### Xavfsizlik (TZ-19)
Sarlavhalarni server o'zi qo'yadi — nginx'da takrorlash shart emas: CSP, HSTS (faqat `NODE_ENV=production`), `X-Frame-Options`, `nosniff`.
- **HTTPS majburiy.** Kirish cookie'si `Secure` — HTTP orqali production'da kirib bo'lmaydi.
- **`proxy_set_header Host $host`** — ikkala `location` da ham bo'lsin. Server cookie bilan kelgan so'rovning shu saytdan ekanini Host bo'yicha tekshiradi (CSRF).
- **`X-Forwarded-For`** — `/ws` da ham bo'lsin. Usiz WebSocket'ning IP chegarasi ishlamaydi (xavfsiz, lekin cheklovsiz).
- **Jurnal.** Server stdout'iga JSON qatorlar yozadi (`{"t":…,"lvl":…,"code":"S3D-…","rid":…}`). Ogohlantirish va xatolar `error_log` jadvaliga ham tushadi. Admin ularni ilovadagi Sozlamalar → "Xatolar jurnali"dan ko'radi.
- **Akkaunt bloklangan bo'lsa** (5 xato parol → 15 daqiqa), admin uchun ham. Darhol ochish: `ADMIN_PASSWORD='…' npm run admin-password`. U parolni almashtiradi, blokni yechadi va eski kirishlarni bekor qiladi.

### AI — Claude'ni ulash (TZ-12, TZ-26) — admin sozlaydi
Kalit faqat `/etc/smart3d.env` da turadi; chatga, kodga va gitga yozilmaydi. Kalitsiz ham hammasi ishlaydi (AI'siz tahlilchi).
1. Anthropic konsolida API kalit oling (to'lov egasi hisobidan — har so'rov pullik; so'rov limiti serverda bor).
2. `/etc/smart3d.env` ga yozing:
   ```bash
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=<kalit>
   # AI_MODEL=claude-sonnet-5-5     # standart (egasi qarori: Opus ishlatilmaydi); arzonroq: claude-haiku-5-5
   ```
3. Serverni qayta ishga tushiring (admin), keyin tekshiring: `curl -s https://smart3d.bittada.uz/api/ai/status` → `{"enabled":true,"provider":"anthropic",…}`.
4. Ishlatish: ish joyidagi matn qatoriga bitta mebel konstruksiyasini yozing (masalan "shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik") — Claude uni konstruksiya tiliga o'giradi, tizim tekshirib chizadi; xona yoki oshxona matni — avvalgidek.
5. Har so'rov `ai_log` jadvaliga yoziladi (matn, natija, xato). Kalitni olib tashlansa — AI'siz tahlilchiga qaytadi.
- Token tejash (TZ-40): Claude faqat oxirgi chora (tayyor prompt → kesh → qoidali tahlilchi → Claude). `AI_OYLIK_TOKEN` (oylik byudjet, sukut 2000000; tugasa qoidali tahlilchi, sayt to'xtamaydi), `AI_KUNLIK_SOROV` (foydalanuvchi/kun, sukut 30), `AI_KESH_KUN` (30), `AI_MAX_TOKENS`, `AI_PROMPT_CACHE` — `server/.env.example`. Sarf: admin panel → Tayyor promptlar → "AI sarfi".
- Muhitda `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` **bo'lmasin**: Anthropic SDK ularni o'zi o'qiydi (bitta serverda boshqa xizmat uchun qo'yilgan bo'lsa, Smart3D so'rovi ham o'sha manzilga/kalitga ketadi). Smart3D faqat `AI_*` va `ANTHROPIC_API_KEY` dan foydalanadi.
- Boshqa provayder: `AI_PROVIDER=gemini` yoki `openai` (+ `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`) — ikkala AI yo'li (xona va konstruksiya) bir xil ishlaydi.

### Telegram bot (TZ-16) — admin sozlaydi
Bot kaliti faqat `/etc/smart3d.env` da turadi. Chatga, kodga va gitga yozilmaydi.
1. BotFather: `/newbot` — bot va kalit oling. Kalitni `TELEGRAM_BOT_TOKEN` ga yozing.
2. BotFather: `/setmenubutton` — tugma matni "Smart3D", manzil `https://smart3d.bittada.uz/app.html`.
3. Webhook — telefon raqami va `/start` javobi uchun. Kalit faqat serverda turadi, shuning uchun buyruqni server konsolida bering:
   ```bash
   set -a; . /etc/smart3d.env; set +a
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
        -d url=https://smart3d.bittada.uz/api/telegram/webhook \
        -d secret_token="$TELEGRAM_WEBHOOK_SECRET" -d 'allowed_updates=["message"]'
   ```
4. nginx: fayl botga yuboriladi (10 MB gacha), shuning uchun `/api/telegram/fayl` ga katta chegara kerak — `server/nginx.conf` da bor (`client_max_body_size 15m`).
5. Serverni qayta ishga tushiring, keyin botda `/start` → "Smart3D" tugmasi bilan tekshiring.

Xavfsizlik:
- Telegram ma'lumoti faqat serverda bot kaliti bilan tekshiriladi. Eskirgani (24 soatdan eski) rad etiladi.
- Ilova sahifasi (`/app.html`) faqat `web.telegram.org` ramkasiga ochiq, qolgan sahifalar ramkaga olinmaydi.
- Telefon raqami faqat foydalanuvchining o'zi ulashsa olinadi (o'z raqami).
- Saytdagi akkauntga avtomatik bog'lash faqat SMS bilan tasdiqlangan raqamga qilinadi. Email bilan ochilgan akkaunt ilovada email va parol bilan kirilgandan keyin ulanadi.

## 7. Tekshiruv
Yangilashdan keyin **bitta buyruq** (faqat GET, hech narsa yozmaydi):
```bash
bash server/tekshiruv.sh https://smart3d.bittada.uz        # sinov portida: bash server/tekshiruv.sh http://127.0.0.1:3999
```
Tekshiradi: `/api/health` (200, `"ok":true`), `/`, `/app.html`, `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/yangi`, `/sozlamalar`, `/sozlamalar/narxlar`, `/buyurtmalar` (hammasi 200), **`/admin` va 8 bo'lim** (`/admin/narxlar`, `/furnitura`, `/materiallar`, `/katalog`, `/promptlar`, `/standart`, `/foydalanuvchilar`, `/tarix` — 200, `/admin` esa `/app.html` bilan bir xil hujjat), noma'lum sahifa va noma'lum admin bo'limi (404), `/api/narxlar` (200), `/api/narxlar/tarix` va `/api/projects` (401, kirishsiz yopiq), **ochiq API'lar JSON ekanligi** (`/api/materiallar`, `/api/katalog`, `/api/furnitura-boglash`, `/api/promptlar`, `/api/standart` — 200, `Content-Type: application/json`, kutilgan kalit) va **`/api/admin/audit` kirishsiz** (401 yoki 404, JSON `code` bilan — nginx'ning o'z 404 sahifasidan ajratadi), `/sw.js` (200 va `no-cache`), `CSP` va `X-Content-Type-Options: nosniff` (`/`, `/app.html`, `/admin`), `/assets/*` uchun `immutable`; HTTPS da HSTS. **Material rasmi** yuklangan bo'lsa: `?v=` bilan `image/*` + `immutable`, `?v=` siz `no-cache` (nginx almashtirilgan rasmni qotirib qo'ymaganini ko'rsatadi); rasm hali yo'q bo'lsa bu qism `-` belgisi bilan o'tkazib yuboriladi (xato emas).
Natija `✅` / `❌`; chiqish kodi: `0` — hammasi to'g'ri, `1` — kamida bittasi `❌`, `2` — server javob bermadi. Admin panelning o'zi (kirgan admin bilan) tekshiruvga kirmaydi — skript faqat GET va kirishsiz; panelni brauzerda qo'lda oching (quyida).
Qo'shimcha: `curl -s https://smart3d.bittada.uz/api/ai/status` → `{"enabled":…}`.
Brauzerda:
- sayt ochiladi, `/loyihalar` ni to'g'ridan-to'g'ri ochsa ham ilova yuklanadi (`F5` bilan);
- kirish ishlaydi (email/parol; SMS sozlangan bo'lsa — SMS kod; Google sozlangan bo'lsa — Google);
- loyiha saqlanadi va boshqa qurilmada ochiladi;
- Sozlamalar → Narxlar ochiladi (admin);
- admin sifatida `/admin` ochiladi (8 bo'lim); admin bo'lmagan akkauntda `/admin` kirish sahifasiga/404 ko'rinishiga olib boradi.

## 8. Zaxira nusxa
Har kuni 03:00 (cron, namuna):
```cron
0 3 * * * cd /srv/smart3d/server && DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d KEEP=14 /usr/bin/node backup.js >> /var/log/smart3d-backup.log 2>&1
```
- `backup.js` server ishlab turganda ham xavfsiz.
- Nusxaning butunligini tekshiradi, oxirgi 14 tasini saqlaydi.
- Natija JSON ko'rinishida logga yoziladi.
- **Butun baza fayli nusxalanadi** (SQLite backup API): jadvallar ro'yxati kodda yo'q, shuning uchun yangi jadvallar (admin panel, AI, bloklash) **o'zi qamraladi** — qo'shimcha sozlama kerak emas. Sinov: `server/test/backup.test.js` (yangi jadvallar + material rasmi BLOB bayt-bayt, tiklash).
- Skript chiqishida faqat foydalanuvchilar soni ko'rinadi; boshqa jadvallar sonini tekshirmaydi.
- Material rasmlari bazada (har biri 600 KB gacha, "Asosiy 100" dekor uchun eng ko'pi ~60 MB) — har nusxa shuncha kattalashadi, `KEEP=14` bo'lsa disk joyini hisobga oling.
- `app/data/*.json` (katalog, narx va rasm fayllari) bazada emas, gitda; admin o'zgartirishi bazada va fayl ustiga qo'yiladi — to'liq tiklash = baza nusxasi + git commit.
- Ishlayotgan baza faylini oddiy `cp` bilan nusxalamang: `-wal` faylidagi so'nggi yozuvlar tushib qoladi. Faqat `backup.js` yoki servis to'xtagach (uchala fayl: `.db`, `-wal`, `-shm`).

**Zaxiradan tiklash:**
1. Servisni to'xtating.
2. `cp /var/backups/smart3d/smart3d-<sana>.db /var/lib/smart3d/smart3d.db`
3. `-wal` va `-shm` fayllarini o'chiring.
4. Servisni ishga tushiring.
5. `/api/health` ni tekshiring.

Tiklashni oyda bir marta test serverda sinab ko'ring. Avtomatik sinov bor: `server/test/backup.test.js` (zaxira yaratiladi, baza buzilgach nusxadan tiklanib, jadvallardagi qatorlar soni nusxadagiga teng bo'lishi tekshiriladi).

## 8a. Google bilan kirish (ixtiyoriy)
1. Admin Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** → turi **Web application** yaratadi.
2. **Authorized JavaScript origins** = `https://smart3d.bittada.uz` (Redirect URI kerak emas).
3. Client ID ni muhit fayliga yozing: `GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com` va servisni qayta ishga tushiring.
4. Tekshiruv: `GET /api/auth/usullar` → `"google": true`. Sozlanmagan bo'lsa tugma ko'rinmaydi, `POST /api/auth/google` → 503 `S3D-AUTH-016`.

Tashqi so'rov: server Google kalitlarini `https://www.googleapis.com/oauth2/v3/certs` dan oladi (keshlanadi).

## 9. Yangilash
**Tartib:** zaxira -> `yangilash.sh` -> tekshiruv (`tekshiruv.sh`) -> kerak bo'lsa qaytarish. Skript serverni **o'zi qayta ishga tushirmaydi** (faqat `--restart` bilan).

**Bitta buyruq bilan (`server/yangilash.sh`):** zaxira (`backup.js`), `git pull --ff-only` (shox: `main`), `npm ci` + `vite build`, sinov portida (baza **nusxasi** bilan) tekshiruv; qayta ishga tushirmaydi.
```bash
APP_DIR=/srv/smart3d ENV_FILE=/etc/smart3d.env DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d \
  bash /srv/smart3d/server/yangilash.sh                                  # tayyorlash va sinov (servis tegilmaydi)
# sinov o'tgach, xuddi shu buyruq oxiriga --restart va SERVICE_CMD qo'shilsa — servis qayta ishga tushadi, 30 soniya ichida /api/health tekshiriladi:
#   SERVICE_CMD='pm2 reload smart3d' PROD_URL=https://smart3d.bittada.uz bash /srv/smart3d/server/yangilash.sh --restart
bash /srv/smart3d/server/tekshiruv.sh https://smart3d.bittada.uz         # yangilashdan keyingi tekshiruv
```
Parametrlar: `bash server/yangilash.sh --help`. Xatoda skript qaysi bosqichda yiqilganini, servis tegilmaganini va qaytarish buyrug'ini chiqaradi.

**Qo'lda (skriptsiz):** `node backup.js`; yangi kodni `/srv/smart3d-<sana>` ga oching (`server/` da `npm ci --omit=dev`; `web/` da `NODE_ENV=development npm ci --include=dev && npx vite build`); test portida baza nusxasi bilan tekshiring; asosiy papkani almashtiring, servisni qayta ishga tushiring; `tekshiruv.sh`.

### Yangilashdan keyin baza (qo'lda hech narsa qilinmaydi)
`init-db` yangilashda **ishlatilmaydi**. Server har ishga tushganda `server/lib/sxema.js` dagi migratsiyalarni o'zi qo'llaydi (`index.js` tartibi: `yadroSxema` → `mcModullar` → `adminSxema` → `aiSxema` → `adminSxema2` → `promptlarSeed`). Hammasi **idempotent**: `CREATE TABLE IF NOT EXISTS`, ustun bor bo'lsa `addColumn` o'tkazib yuboradi, boshlang'ich ma'lumot bir marta. Mavjud qatorlar o'zgarmaydi.

Tasdiqlangan (kod o'qildi va ikki yo'l bilan sinaldi): (1) `server/test/migratsiya.test.js` — eski bazaga qo'llanadi, 2-3 marta qayta ishga tushiriladi; (2) TZ-37 dan oldingi commit (`ac42934`) bilan yaratilgan baza nusxasida yangi kod ishga tushirildi: `/api/health` 200, foydalanuvchilar va materiallar soni o'zgarmadi, ikkinchi ishga tushirishda farq yo'q.

| Nima qo'shiladi | Qaysi funksiya | Nima uchun |
|---|---|---|
| jadvallar `furn_boglash`, `promptlar_admin`, `admin_audit` | `adminSxema` (TZ-37, 1-faza) | furnitura bog'lash, tayyor so'rovlar, o'zgarishlar tarixi |
| `ai_kesh`, `ai_sarf`; `promptlar_admin.spec_*` (6 ustun) | `aiSxema` (TZ-40) | AI natijasi keshi va token sarfi |
| `mat_admin`, `mat_rasm` (rasm — BLOB), `mat_narx`, `katalog_admin` | `adminSxema2` (TZ-37, 2-faza) | materiallar rangi/rasmi/narxi, modullar katalogi |
| `users.bloklangan` (sukut 0), `blok_sabab`, `blok_vaqt` | `adminSxema2` | foydalanuvchini bloklash (`S3D-AUTH-021`); mavjud foydalanuvchilar bloklanmagan |

Birinchi ishga tushishdagi **bir martalik yozuvlar** (shuning uchun yangilashdan oldin zaxira majburiy): `fragments` ga "full base" modullari (`MC-FB-…`, 61 ta, `app/data/fragments-fr.json` dan; bazadagi modullar 123 → 184, admin katalogida texnika bilan 191); `promptlar_admin` ga boshlang'ich tayyor so'rovlar (sinovda 44 qator; `settings.promptlar_seed_v1` belgisi — admin o'chirgani qaytib kelmaydi) va ularning tuzilmasi `spec_json` (qoida bilan, bepul, Claude chaqirilmaydi). Bu bir necha soniya oladi.

`yangilash.sh` sinov bosqichi (port 3999) aynan shu migratsiyani **bazaning nusxasida** oldindan bajaradi: yangi kod nusxada ko'tarilmasa, haqiqiy baza tegilmaydi. Haqiqiy bazaga migratsiya servis qayta ishga tushganda tushadi.

### Eski narx stavkalari (TZ-36 P7)
Admin serverda avval saqlagan narx stavkalari (masalan ish haqi 12 000 / 40 000) **bazada qoladi** — yangi kod ularni o'zgartirmaydi (sukut: ish haqi 0, manba "egasi"). `yangilash.sh` sinov bosqichida bazada 0 dan katta ish haqi topsa, ogohlantirish chiqaradi. Qaytarish (egasi roziligi bilan):
1. **Admin sifatida:** Sozlamalar -> Narxlar -> **"Ish haqini sukutga qaytarish"** (faqat ish haqi) yoki **"Hamma stavkani sukutga qaytarish"** (xizmat stavkalari, raspil/kromka/prisadka tanlovi, ish haqi, ustama — admin saqlagan tanlov ham o'chadi). Tasdiq oynasi chiqadi; o'zgarish tarixga yoziladi (kim, qachon, eski -> yangi).
2. **API orqali** (admin tokeni bilan): `POST /api/narxlar/sukut` tanasi `{"qamrov":"ish_haqi"}` yoki `"ustama"` / `"hammasi"`.
3. **Faqat zaxira bilan, qo'lda (tarixsiz):** hammasini sukutga qaytarish — `settings` jadvalidagi qatorni o'chirish (server qatorni topmasa, sukutni o'zi hisoblaydi). Avval zaxira oling (`node backup.js`):
   ```bash
   sqlite3 /var/lib/smart3d/smart3d.db "DELETE FROM settings WHERE key='narx_stavkalari';"
   ```
   (`sqlite3` yo'q bo'lsa: `cd server && DB_PATH=… node --input-type=module -e "import D from 'better-sqlite3'; new D(process.env.DB_PATH).prepare(\"DELETE FROM settings WHERE key='narx_stavkalari'\").run()"`.)

### Orqaga qaytarish
Yangilash buzilsa (yoki `tekshiruv.sh` `❌` bersa). `yangilash.sh` oldingi commit hash'ini chiqaradi (`Joriy commit (orqaga qaytish uchun): <hash>` va oxirida `oldingi: <hash>`); hash'ni eslab qoling yoki `git reflog` dan oling.
1. **Kodni qaytarish** (baza tegilmaydi — yangi kod faqat yangi jadval/ustunlarni qo'shadi, eski kod ularni e'tiborsiz qoldiradi; tasdiqlangan: TZ-37 dan oldingi kod migratsiyalangan bazada ishladi, ro'yxatdan o'tish ham ishladi). **Diqqat:** eski kod `users.bloklangan` ni bilmaydi — admin bloklagan foydalanuvchilar kodni qaytargach yana kira oladi; admin panelning o'zgartirishlari (material rang/rasm/narx, katalog) esa eski kodga ko'rinmaydi (bazada qoladi, yangi kodga qaytganda yana ishlaydi):
   ```bash
   cd /srv/smart3d
   git checkout <oldingi-hash>                         # detached HEAD — normal
   (cd server && npm ci --omit=dev)
   (cd web && NODE_ENV=development npm ci --include=dev && NODE_ENV=development npx vite build)
   # servisni qayta ishga tushiring (egasi/admin): pm2 reload smart3d   yoki   systemctl restart smart3d
   bash server/tekshiruv.sh https://smart3d.bittada.uz
   ```
2. **Bazani qaytarish** (faqat ma'lumot buzilganda; zaxiradan keyingi yozuvlar yo'qoladi):
   ```bash
   ls -t /var/backups/smart3d | head -3                # eng yangi nusxalar
   pm2 stop smart3d                                    # yoki systemctl stop smart3d
   cp /var/lib/smart3d/smart3d.db /var/lib/smart3d/smart3d.db.buzuq        # joriy bazani saqlab qo'ying (servis to'xtagan; `-wal` fayli ham bo'lsa uni ham nusxalang)
   cp /var/backups/smart3d/smart3d-<sana>.db /var/lib/smart3d/smart3d.db
   rm -f /var/lib/smart3d/smart3d.db-wal /var/lib/smart3d/smart3d.db-shm
   pm2 start smart3d                                   # yoki systemctl start smart3d
   bash server/tekshiruv.sh https://smart3d.bittada.uz
   ```
3. **Keyin yana yangilash uchun:** `git checkout main && git pull --ff-only`.
Qayta ishga tushirishni faqat egasi/admin bajaradi (qoida 5.3); repo yoki agent serverga tegmaydi.

## 10. Hali hal qilinmagan
- **L1:** mijozlarning shaxsiy ma'lumotlari O'zbekistondagi serverda saqlanishi — yurist xulosasi kerak.
- **Monitoring:** hozircha `/api/health` va PM2 / systemd logi. Tashqi monitoring keyin.

## 11. TZ-37 3-faza (Tizim, tarix kengaytmasi, ERP sinxron) main'ga qo'shilganda
Bu faza hozir alohida tarmoqda (`agent/admin3`) tayyorlanmoqda va **hali main'da yo'q**; quyidagi — uning shu kundagi holatiga ko'ra (commitlar `c522f84`, `5029513`; ERP qismi hali commit qilinmagan). Main'ga qo'shilgach `git diff` bilan qayta tekshiring va shu bo'limni moslang. Hozirgi `main` ni yangilashga bu bo'lim ta'sir qilmaydi.
- **Sahifalar:** `ILOVA_YOLI` ga `/admin/erp` va `/admin/tizim` qo'shiladi. **nginx o'zgarmaydi** (hammasi `location /`). `tekshiruv.sh` ga shu ikki sahifa (200) qo'shiladi.
- **API (admin, faqat admin; boshqaga 404):** `GET /api/admin/tizim` (server, AI, Google, SMS, Telegram, xatolar, zaxira holati — kalit **qiymati** hech qachon chiqmaydi, faqat bor/yo'q), `GET /api/admin/tarix`, `POST /api/admin/narx-qaytar/:id`; ERP qismi: `POST /api/admin/erp/yuklash`, `GET /api/admin/erp`, `GET`/`DELETE /api/admin/erp/:id`, `POST /api/admin/erp/:id/qollash`, `POST /api/admin/erp/sukut`. **Ochiq:** `GET /api/erp-narx` (JSON `plita`, `furnitura`; `no-cache`) — `tekshiruv.sh` ga qo'shiladi; `/api/admin/tizim` ham kirishsiz 401/404 ro'yxatiga.
- **Baza:** yangi migratsiya `adminSxema3` (idempotent, §9 kabi o'zi qo'llanadi): jadvallar `erp_partiya`, `erp_narx`, `narx_qaytar`, `narx_history` (`routes/narxlar.js` dagi bilan bir xil sxema, `IF NOT EXISTS`), indeks `idx_admin_audit_vaqt`. Zaxira o'zi qamraydi. `server/test/migratsiya.test.js` va `backup.test.js` `adminSxema3` ni bor bo'lsa avtomatik qo'llaydi.
- **Muhit:** yangi o'zgaruvchi **yo'q**. Lekin: panelning "Tizim → Zaxira" qismi zaxira papkasini **server jarayonining** `BACKUP_DIR` o'zgaruvchisidan oladi (sukut `server/backups`). Shuning uchun `BACKUP_DIR=/var/backups/smart3d` ni cron buyrug'idagina emas, **`/etc/smart3d.env` ga ham yozing**, papka servis foydalanuvchisi (`smart3d`) uchun o'qishga ochiq bo'lsin; aks holda panel "zaxira yo'q" ko'rsatadi. 36 soatdan eski eng yangi nusxa "eskirgan" deb belgilanadi (kunlik 03:00 cron, §8).
- **ERP yuklash hajmi:** admin ERP eksportini JSON sifatida yuklaydi (`Smart3D_malumot/erp-*.json` namunalari ~60–90 KB). Server chegarasi 2 MB, nginx `3m` — yetadi; eksport 2 MB dan oshsa `S3D-VAL-003` (413) qaytadi, shunda ikkala chegara birga kengaytiriladi.
- Server ERP'ga **ulanmaydi** (faqat yuklangan fayl bilan ishlaydi); tashqi so'rov va yangi port yo'q.
