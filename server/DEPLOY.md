# Smart3D — serverga o'rnatish va zaxira (TZ-10)

**Kim uchun:** Bittada server admini yoki server agenti. Manzil: `smart3d.bittada.uz`, Bittada serveri (egasi qarori, 2026-10-15).

**Tartib:** avval **test** (alohida port + alohida baza), tekshirilgach — jonli.

**Qoida:** server sozlamalarini (nginx, systemd, PM2) admin qo'yadi. Bu hujjat faqat namuna beradi. Boshqa xizmatlarga tegilmaydi — Smart3D o'z porti, o'z jarayoni va o'z bazasida ishlaydi.

## 1. Talablar
- Node.js 20+.
- `better-sqlite3` qurish uchun: `python3`, `make`, `g++`.
- Bo'sh port, masalan `3070` — admin tanlaydi.

## 2. Kod
Repoda `git remote` yo'q — kod serverga arxiv yoki `rsync` bilan ko'chiriladi:
```bash
# ishlab chiquvchi kompyuterida (repo ildizi):
git archive --format=tar.gz -o smart3d.tar.gz HEAD
# serverda:
mkdir -p /srv/smart3d && tar -xzf smart3d.tar.gz -C /srv/smart3d
cd /srv/smart3d/server && npm ci --omit=dev
# yangi sayt (TZ-09/TZ-19) — build:
cd /srv/smart3d/web && npm ci --include=dev && npx vite build
```
- **Kerakli papkalar:**
  - `server/`;
  - `web/` — build natijasi `web/dist/`;
  - `app/` — ma'lumot va eski sayt.
- **Kerak emas:** `data1/` va `Smart3D_malumot/`.

**Manzillar (TZ-09 Q7).** Server `web/dist` ni o'zi ko'radi:
- `/` — yangi sayt;
- `/app.html` — ilova;
- `/eski/` — eski sayt, 2 hafta zaxira (keyin alohida TZ bilan olib tashlanadi);
- noma'lum sahifa — 404.

`web/dist` yo'q bo'lsa, eski sayt avvalgidek `/` da qoladi. Shuning uchun build — majburiy qadam.

Yangi sayt birinchi ochilganda brauzerdagi eski service worker yangisiga almashadi va eski keshlar tozalanadi. Shu sababli birinchi ochilishda eski sayt bir marta ko'rinishi mumkin.

## 3. Muhit fayli (gitga KIRMAYDI)
`/etc/smart3d.env` — egasi `root`, guruhi `smart3d`, ruxsat `640`:
```bash
NODE_ENV=production
PORT=3070
TRUST_PROXY=1
DB_PATH=/var/lib/smart3d/smart3d.db
JWT_SECRET=<openssl rand -hex 48 natijasi>
JWT_EXPIRES=30d
# SMS (Eskiz.uz) — bo'lmasa kirish ishlamaydi (production'da 503)
ESKIZ_EMAIL=<eskiz akkaunti>
ESKIZ_PASSWORD=<eskiz kaliti>
ESKIZ_FROM=4546
# AI — ixtiyoriy (bo'lmasa qoidali tahlilchi ishlaydi)
# AI_PROVIDER=anthropic   # yoki gemini | openai
# AI_MODEL=claude-opus-5-5
# AI_API_KEY=<kalit>
# Telegram Mini App (TZ-16) — ixtiyoriy (bo'lmasa Telegram kirishi o'chiq, sayt ishlayveradi)
# TELEGRAM_BOT_TOKEN=<BotFather bergan kalit>
# TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 24 natijasi>
# TELEGRAM_WEBAPP_URL=https://smart3d.bittada.uz/app.html
```
- `JWT_SECRET` 32 belgidan qisqa bo'lsa, production server ishga tushmaydi.
- Standart `admin123` paroli bilan ham ishga tushmaydi.
- **Eskiz:** SMS matni ("Smart3D kirish kodi: XXXXXX. Kodni hech kimga bermang.") shablon sifatida moderatsiyadan o'tishi talab qilinishi mumkin — akkauntda tekshiring.

## 4. Baza (faqat birinchi marta)
```bash
mkdir -p /var/lib/smart3d
cd /srv/smart3d/server
DB_PATH=/var/lib/smart3d/smart3d.db ADMIN_EMAIL=<admin email> ADMIN_PASSWORD='<kuchli parol>' node init-db.js
```
Keyingi ishga tushishlarda yangi jadvallar o'zi qo'shiladi (`CREATE TABLE IF NOT EXISTS`) — `init-db` qayta ishlatilmaydi. Uni `--force` bilan ishlatsangiz, foydalanuvchilar o'chadi.

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
- **Docker** (muqobil): repo ildizidan `docker build -f server/Dockerfile -t smart3d .`.

## 6. nginx (namuna, admin qo'yadi)
```nginx
server {
  server_name smart3d.bittada.uz;
  client_max_body_size 3m;
  location /ws { proxy_pass http://127.0.0.1:3070; proxy_http_version 1.1;
                 proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
                 proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
  location / { proxy_pass http://127.0.0.1:3070;
               proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
               proxy_set_header X-Forwarded-Proto $scheme; }
}
```
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
   # AI_MODEL=claude-opus-5-5     # standart; arzonroq: claude-sonnet-5-5 yoki claude-haiku-5-5
   ```
3. Serverni qayta ishga tushiring (admin), keyin tekshiring: `curl -s https://smart3d.bittada.uz/api/ai/status` → `{"enabled":true,"provider":"anthropic",…}`.
4. Ishlatish: ish joyidagi matn qatoriga bitta mebel konstruksiyasini yozing (masalan "shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik") — Claude uni konstruksiya tiliga o'giradi, tizim tekshirib chizadi; xona yoki oshxona matni — avvalgidek.
5. Har so'rov `ai_log` jadvaliga yoziladi (matn, natija, xato). Kalitni olib tashlansa — AI'siz tahlilchiga qaytadi.
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
4. nginx: fayl botga yuboriladi (10 MB gacha), shuning uchun shu yo'lga katta chegara qo'ying:
   ```nginx
   location /api/telegram/fayl { client_max_body_size 15m; proxy_pass http://127.0.0.1:3070;
       proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   ```
5. Serverni qayta ishga tushiring, keyin botda `/start` → "Smart3D" tugmasi bilan tekshiring.

Xavfsizlik:
- Telegram ma'lumoti faqat serverda bot kaliti bilan tekshiriladi. Eskirgani (24 soatdan eski) rad etiladi.
- Ilova sahifasi (`/app.html`) faqat `web.telegram.org` ramkasiga ochiq, qolgan sahifalar ramkaga olinmaydi.
- Telefon raqami faqat foydalanuvchining o'zi ulashsa olinadi (o'z raqami).
- Saytdagi akkauntga avtomatik bog'lash faqat SMS bilan tasdiqlangan raqamga qilinadi. Email bilan ochilgan akkaunt ilovada email va parol bilan kirilgandan keyin ulanadi.

## 7. Tekshiruv
```bash
curl -s https://smart3d.bittada.uz/api/health        # {"ok":true,...}
curl -s https://smart3d.bittada.uz/api/ai/status     # {"enabled":…}
```
Brauzerda:
- sayt ochiladi;
- 👤 tugmasi ko'rinadi;
- telefon raqamiga SMS kod keladi;
- loyiha saqlanadi va boshqa qurilmada ochiladi.

## 8. Zaxira nusxa
Har kuni 03:00 (cron, namuna):
```cron
0 3 * * * cd /srv/smart3d/server && DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d KEEP=14 /usr/bin/node backup.js >> /var/log/smart3d-backup.log 2>&1
```
- `backup.js` server ishlab turganda ham xavfsiz.
- Nusxaning butunligini tekshiradi, oxirgi 14 tasini saqlaydi.
- Natija JSON ko'rinishida logga yoziladi.

**Zaxiradan tiklash:**
1. Servisni to'xtating.
2. `cp /var/backups/smart3d/smart3d-<sana>.db /var/lib/smart3d/smart3d.db`
3. `-wal` va `-shm` fayllarini o'chiring.
4. Servisni ishga tushiring.
5. `/api/health` ni tekshiring.

Tiklashni oyda bir marta test serverda sinab ko'ring.

## 9. Yangilash
1. Zaxira: `node backup.js`.
2. Yangi kodni alohida papkaga oching: `/srv/smart3d-<sana>`:
   - `server/` da `npm ci --omit=dev`;
   - `web/` da `npm ci --include=dev && npx vite build`.
3. Test portida tekshiring (bazaning **nusxasi** bilan).
4. Asosiy papkani almashtiring va servisni qayta ishga tushiring (admin).
5. `/api/health` ni tekshiring.

**Orqaga qaytish:** oldingi papka va 1-qadamdagi zaxira.

## 10. Hali hal qilinmagan
- **L1:** mijozlarning shaxsiy ma'lumotlari O'zbekistondagi serverda saqlanishi — yurist xulosasi kerak.
- **Monitoring:** hozircha `/api/health` va PM2 / systemd logi. Tashqi monitoring keyin.
