# Productionga qo'lda o'tkazish ro'yxati (TZ-36 P10; 2026-10-22 holatiga yangilandi: TZ-37 admin panel 1–2 faza, TZ-40 AI nazorati)

**Kim bajaradi:** egasi (yoki u ruxsat bergan server admini). Repo va agentlar serverga hech narsa yozmaydi, qayta ishga tushirmaydi (#222).
**Qanday o'qiladi:** yuqoridan pastga. Har qadamda tayyor buyruq, kutilgan natija va xato bo'lsa nima qilish yozilgan. `<...>` o'rniga o'z qiymatingizni qo'ying; sirlar (kalit, parol) bu hujjatga va gitga yozilmaydi.
**Mavjud o'rnatishni yangilash** uchun yozilgan (server o'rnatilgan, `/srv/smart3d`, PM2 yoki systemd, nginx ortida). Birinchi marta o'rnatish — `server/DEPLOY.md` §1–§5.
Namuna qiymatlar: papka `/srv/smart3d`, muhit fayli `/etc/smart3d.env`, baza `/var/lib/smart3d/smart3d.db`, zaxira `/var/backups/smart3d`, manzil `https://smart3d.bittada.uz`. Sizda boshqacha bo'lsa — hamma buyruqda almashtiring.

---

## Nima o'zgardi (oldingi yangilashga nisbatan, qisqa)

- **Admin panel (TZ-37):** `/admin` va 8 bo'lim — Narxlar, Furnitura, Materiallar (rang, rasm, varaq narxi), Modullar katalogi (191 modul: nom, yashirish, o'lcham chegarasi), Tayyor promptlar, Standart konstruksiya, Foydalanuvchilar/loyihalar/buyurtmalar (ko'rish, qidirish, **bloklash**), O'zgarishlar tarixi (qaytarish bilan). Faqat admin ko'radi; boshqaga `/api/admin/*` 404.
- **Yangi API:** `/api/admin/*` (faqat admin) va ochiq GET'lar `/api/materiallar`, `/api/materiallar/rasm/<kalit>`, `/api/katalog`, `/api/furnitura-boglash`, `/api/promptlar`, `/api/standart` (brauzer admin o'zgartirishini shulardan oladi).
- **Baza o'zi yangilanadi** (qo'lda hech narsa yo'q): 9 yangi jadval, `users` ga 3 ustun (`bloklangan` …), birinchi ishga tushishda +61 "full base" modul va boshlang'ich tayyor so'rovlar. **Shuning uchun zaxira majburiy** (§1). Mavjud ma'lumot o'zgarmaydi (kod va eski baza nusxasida sinalgan).
- **AI token nazorati (TZ-40):** Claude faqat oxirgi chora (tayyor so'rov -> kesh -> qoidali tahlilchi -> Claude); oylik byudjet va kunlik chegara. **Yangi majburiy qiymat yo'q** — sukut bilan ishlaydi.
- **Rover CNC eksporti** (`.ncc` / `.tap`) — faqat brauzerda; serverga ta'siri yo'q.
- **nginx:** admin panel uchun yangi blok **kerak emas** — hamma yo'l serverga uzatilsa yetadi. Yangi namunada faqat izoh va material rasmi uchun alohida (sarlavhaga tegmaydigan) blok qo'shildi (§2).
- **`tekshiruv.sh`** endi `/admin*`, ochiq API'lar (JSON) va `/api/admin/audit` kirishsiz holatini ham tekshiradi (§5).

---

## 0. Oldindan shartlar (bir marta tekshiriladi)

| # | Shart | Tekshirish buyrug'i | Kutilgan natija |
|---|---|---|---|
| 1 | Node.js 22+ (CI: 24) va git bor — `better-sqlite3` 13 Node 20 da ishlamaydi | `node -v && git --version` | `v22…` yoki yuqori |
| 2 | Muhit fayli bor, sirlar to'g'ri | `sudo test -r /etc/smart3d.env && echo bor` | `bor` |
| 3 | `JWT_SECRET` 32+ belgi (qiymatni **ko'rsatmasdan**) | `sudo sh -c '. /etc/smart3d.env; echo ${#JWT_SECRET}'` | `32` yoki ko'p |
| 4 | `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_PATH` berilgan | `sudo grep -E '^(NODE_ENV\|TRUST_PROXY\|DB_PATH)=' /etc/smart3d.env` | 3 qator |
| 5 | Zaxira papkasi yozilishi mumkin | `mkdir -p /var/backups/smart3d && touch /var/backups/smart3d/.t && rm /var/backups/smart3d/.t && echo ok` | `ok` |
| 6 | Kunlik zaxira cron bor | `crontab -l \| grep backup.js` | 1 qator (`DEPLOY.md` §8) |
| 7 | Git ishchi papkasi toza | `cd /srv/smart3d && git status --porcelain --untracked-files=no` | bo'sh chiqish |
| 8 | Zaxira uchun disk joyi (baza hajmi x 14; material rasmlari bazada) | `ls -lh /var/lib/smart3d/smart3d.db && df -h /var/backups/smart3d` | bo'sh joy bazadan ancha katta |

**Muhit fayliga qo'shiladigan ixtiyoriy qiymatlar** (yo'q bo'lsa tegishli imkoniyat o'chiq, sayt ishlayveradi; hammasi **faqat** `/etc/smart3d.env` ga yoziladi, ruxsat `640` — chatga, kodga, gitga emas). To'liq namuna va izohlar — `server/.env.example`. Qiymatlarni qo'ygandan keyin servisni qayta ishga tushirish kerak (§4).

| Imkoniyat | Qayerga nima qo'yiladi | Bo'lmasa nima bo'ladi |
|---|---|---|
| **Google bilan kirish** | 1) Google Cloud Console -> APIs & Services -> Credentials -> *OAuth client ID* (turi *Web application*) -> **Authorized JavaScript origins** = `https://smart3d.bittada.uz` (Redirect URI kerak emas). 2) `/etc/smart3d.env` ga `GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com` | Google tugmasi ko'rinmaydi. Origin Google'da qo'shilmagan bo'lsa tugma Google tomonidan xato beradi — origin to'g'ri yozilganini tekshiring |
| **Claude (AI)** | `/etc/smart3d.env` ga `AI_PROVIDER=anthropic` va `ANTHROPIC_API_KEY=<kalit>` (kalit Anthropic konsolidan, **egasi hisobidan to'lanadi** — har so'rov pullik). Model sukut `claude-sonnet-5-5`. | AI'siz qoidali tahlilchi ishlaydi, sayt to'xtamaydi |
| AI chegaralari (TZ-40) | ixtiyoriy: `AI_OYLIK_TOKEN` (sukut 2 000 000 token/oy; `0` — Claude butunlay o'chiq), `AI_KUNLIK_SOROV` (sukut 30 so'rov/foydalanuvchi/kun), `AI_KESH_KUN` (30) | sukut qiymatlar ishlaydi; sarf — admin panel -> Tayyor promptlar -> "AI sarfi" |
| **SMS (Eskiz)** | `/etc/smart3d.env` ga `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`. Eskiz akkauntida SMS matni shablon sifatida moderatsiyadan o'tgan bo'lishi kerak | SMS bilan kirish o'chiq (503), saytda tugma ko'rinmaydi; email/parol va Google ishlayveradi |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBAPP_URL` (+ webhook buyrug'i — `DEPLOY.md` §6) | Telegram kirishi o'chiq |

**Ogohlantirishlar (bloker emas):**
- Muhitda `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` **bo'lmasin** (Anthropic SDK ularni o'zi o'qiydi — boshqa xizmat uchun qo'yilgan bo'lsa, Smart3D so'rovi ham o'sha yerga ketadi).
- Google va Claude sozlamalarini yangilash bilan **birga** qilish shart emas — alohida, istalgan vaqtda qo'shiladi.
- Yagona **bloker**lar o'zgarmagan: Node 22+, `JWT_SECRET` 32+ belgi, zaxira (§0 jadvali) — hech biri yangi emas.

---

## 1. Zaxira (yangilashdan oldin — majburiy)

```bash
cd /srv/smart3d/server
DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d node backup.js
ls -lt /var/backups/smart3d | head -3
```
**Kutilgan:** oxirgi qatorda `{"nusxa":"/var/backups/smart3d/smart3d-<sana>.db","foydalanuvchilar":<son>,"saqlangan":<son>}`; papkada yangi fayl.
**Xato bo'lsa** (`Baza topilmadi` / `Nusxa buzilgan`): davom etmang — `DB_PATH` ni tekshiring.
Bu nusxa nomini yozib qo'ying: `smart3d-<sana>.db` — qaytarish uchun kerak bo'lishi mumkin.
Nusxa **butun baza** (admin panel jadvallari va material rasmlari ham); ishlayotgan baza faylini `cp` bilan nusxalamang (`-wal` dagi yozuvlar tushib qoladi) — faqat `backup.js`.

## 2. Yangi nginx sozlamasini qo'yish (faqat birinchi o'tishda yoki nginx namunasi o'zgarganda)

**Qachon kerak:** (a) nginx sozlamasida `try_files` / "hamma yo'l index.html ga" qoidasi yoki `/api` keshi bo'lsa — **albatta almashtiring**: yangi sayt manzillarini (`/loyihalar`, `/loyiha/5`, `/admin/materiallar` …) server o'zi beradi, nginx hammasini serverga uzatishi kerak; (b) birinchi o'rnatishda. Agar sizda allaqachon oldingi namuna (hamma narsa `proxy_pass` bilan serverga) o'rnatilgan bo'lsa — admin panel uchun **almashtirish shart emas**: `/admin*` va yangi `/api/*` yo'llari `location /` orqali o'tadi. Yangi namunadagi yagona farq — material rasmi uchun alohida `location ^~ /api/materiallar/rasm/` (sarlavhaga tegmaydi: rasm shu kalit ostida almashtirilishi mumkin, keshni server hal qiladi); `/data/rasm/` kabi "doim immutable" qo'ymang. Almashtirsangiz, tekshiruv (§5) rasm keshini ham ko'rsatadi.
```bash
sudo cp /etc/nginx/conf.d/smart3d.conf /etc/nginx/conf.d/smart3d.conf.eski     # eskisini saqlab qo'ying
sudo cp /srv/smart3d/server/nginx.conf /etc/nginx/conf.d/smart3d.conf          # repodagi namuna
sudo nano /etc/nginx/conf.d/smart3d.conf        # server_name va upstream portini (127.0.0.1:3070) o'z qiymatingizga moslang
sudo nginx -t
```
**Kutilgan:** `syntax is ok` va `test is successful`. Xato bo'lsa: `sudo cp /etc/nginx/conf.d/smart3d.conf.eski /etc/nginx/conf.d/smart3d.conf` va `nginx -t` qayta.
Sozlamani qo'llash (nginx'ga ta'sir qiladi, shuning uchun §5 dan oldin emas, **keyin** ham mumkin):
```bash
sudo nginx -s reload
```
Namunadagi `limit_req_zone`, `map`, `upstream` qatorlari `http {}` darajasida bo'lishi kerak (`conf.d` ichidagi fayl shunday include qilinadi). HTTPS bloki (`certbot`) mavjud bo'lsa, namunaning `location` qismlarini o'sha `443` bloki ichiga ko'chiring.

## 3. Yangilash (kod + o'rnatish + build + sinov porti) — servis hali tegilmaydi

```bash
APP_DIR=/srv/smart3d ENV_FILE=/etc/smart3d.env DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d \
  bash /srv/smart3d/server/yangilash.sh
```
Skript ketma-ket: zaxira -> `git pull --ff-only` (shox `main`) -> `npm ci --omit=dev` -> `npm ci --include=dev` + `vite build` -> bazaning **nusxasi** bilan sinov portida (3999) `/api/health`, `/`, `/app.html`, `/loyihalar`. Yangi baza jadvallari (migratsiya) shu **nusxada** oldindan sinaladi; haqiqiy baza qayta ishga tushirishgacha tegilmaydi.
**Kutilgan** (oxirgi qatorlar):
```
  /api/health: ok
  /: 200
  /app.html: 200
  /loyihalar: 200
Sinov o'tdi, vaqtinchalik nusxa o'chirildi.
Hammasi tayyor — qayta ishga tushirish uchun --restart bilan yoki SERVICE_CMD ni qo'lda bajaring.
```
Skript `Joriy commit (orqaga qaytish uchun): <hash>` ni chiqaradi — **shu hash'ni yozib qo'ying** (qaytarish uchun).
**Eski narx stavkasi ogohlantirishi.** Agar chiqishda `OGOHLANTIRISH: bazada eski saqlangan ish haqi stavkasi bor (detal=…, modul=…)` bo'lsa — bu xato emas: avval admin saqlagan ish haqi (masalan 12 000 / 40 000) bazada qolgan. Yangi sukut — 0. Qaror sizniki; qaytarish — §6.
**Xato bo'lsa:** skript qaysi bosqichda yiqilganini va "Production servisi tegilmagan" deb yozadi — hech narsa buzilmagan; xabarni yuboring.

## 4. Servisni qayta ishga tushirish (faqat siz)

Yangi kod faqat shundan keyin ishlaydi. Bittasini tanlang (sizda qaysi biri o'rnatilgan bo'lsa):
```bash
pm2 reload smart3d            # PM2
# yoki:
sudo systemctl restart smart3d
```
**Kutilgan:** ~5 soniyada (birinchi ishga tushish bir necha soniya sekinroq — baza migratsiyasi): `curl -s https://smart3d.bittada.uz/api/health` -> `{"ok":true,…}`.
Yoki §3 va §4 ni birga: `... SERVICE_CMD='pm2 reload smart3d' PROD_URL=https://smart3d.bittada.uz bash /srv/smart3d/server/yangilash.sh --restart` (30 soniya ichida `/api/health` ni o'zi tekshiradi).
**Xato bo'lsa** (health javob bermasa): `pm2 logs smart3d --lines 50` yoki `journalctl -u smart3d -n 50`. Eng ko'p sabab: `JWT_SECRET` qisqa/yo'q (log: `XATO: JWT_SECRET …`) -> §0 qadam 3. Hal bo'lmasa — §7 (qaytarish).

## 5. Yangilashdan keyingi tekshiruv

```bash
bash /srv/smart3d/server/tekshiruv.sh https://smart3d.bittada.uz
```
Faqat GET so'rovlar; hech narsa yozmaydi. **Kutilgan:** hamma qator `✅`, oxirida `✅ Hammasi joyida: <son> tekshiruv o'tdi.`, chiqish kodi `0` (`echo $?`).
Tekshiradi: `/api/health` 200; `/`, `/app.html`, `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/yangi`, `/sozlamalar`, `/sozlamalar/narxlar`, `/buyurtmalar` — 200; **`/admin` va 8 bo'lim** (`/admin/narxlar`, `/furnitura`, `/materiallar`, `/katalog`, `/promptlar`, `/standart`, `/foydalanuvchilar`, `/tarix`) — 200 (`/admin` = `/app.html` bilan bir xil hujjat); noma'lum sahifa va noma'lum admin bo'limi — 404; `/api/narxlar` — 200; `/api/narxlar/tarix` va `/api/projects` — 401; **`/api/materiallar`, `/api/katalog`, `/api/furnitura-boglash`, `/api/promptlar`, `/api/standart` — 200 va JSON; `/api/admin/audit` kirishsiz — 401 yoki 404 (JSON)**; `/sw.js` — 200 va `no-cache`; `Content-Security-Policy`, `X-Content-Type-Options: nosniff` (`/`, `/app.html`, `/admin`), HSTS; `/assets/*` — `immutable`; material rasmi yuklangan bo'lsa — `?v=` bilan `immutable`, `?v=` siz `no-cache` (yo'q bo'lsa `-` belgisi bilan o'tkazib yuboriladi, xato emas).
**`❌` bo'lsa:** qator nima kutilganini yozadi. Tez-tez: `/loyihalar -> 404` yoki `/admin -> 404` (`/admin yoki /app.html dan farq qiladi`) — nginx hali eski (`try_files` yoki noto'g'ri `root`) -> §2; `/api/materiallar -> 200, Content-Type 'text/html'` — nginx `/api` ni serverga uzatmayapti; `material rasmi (?v= siz) … immutable` — nginx rasm javobiga o'z keshini qo'ygan -> §2; `HSTS yo'q` — `NODE_ENV=production` yoki nginx `X-Forwarded-Proto` yo'q -> `DEPLOY.md` §6; `Cache-Control … no-cache kutilgan` — nginx sarlavhani o'zgartirgan.

Brauzerda (qo'lda, 2 daqiqa):
1. `https://smart3d.bittada.uz/loyihalar` ni to'g'ridan-to'g'ri oching va `F5` bosing — ilova yuklanadi (404 emas).
2. Kirish: email/parol; (sozlangan bo'lsa) SMS yoki Google.
3. Loyiha yarating, saqlang, boshqa qurilmada oching.
4. Sozlamalar -> Narxlar ochiladi (admin).
5. Admin sifatida `/admin` ochiladi (8 bo'lim, sahifani `F5` bilan yangilasa ham); admin bo'lmagan akkauntda `/admin` kirish sahifasiga yoki 404 ko'rinishiga olib boradi.

## 6. Eski narx stavkalarini sukutga qaytarish (ixtiyoriy, faqat §3 da ogohlantirish chiqqan bo'lsa)

Admin sifatida: **Sozlamalar -> Narxlar -> "Ish haqini sukutga qaytarish"** -> tasdiqlash. Ish haqi 0 ga (manba "egasi") qaytadi; xizmat stavkalari, tanlov va ustamaga tegilmaydi; o'zgarish tarixga yoziladi ("Tarix" tugmasi).
"Hamma stavkani sukutga qaytarish" — ehtiyot bo'ling: admin saqlagan raspil/kromka/prisadka tanlovini ham o'chiradi.
**Kutilgan:** yashil xabar "Sukut stavkalarga qaytarildi (N o'zgarish)". Tekshiruv: `curl -s https://smart3d.bittada.uz/api/narxlar` -> `"ish_haqi"` ichida `"qiymat":0`.
Qaytarmaslik ham mumkin — hisobda hozirgi saqlangan ish haqi qoladi (narxga ta'sir qiladi).

## 7. Orqaga qaytarish (agar §4–§5 da jiddiy muammo bo'lsa)

**a) Faqat kod** (odatda yetarli; baza tegilmaydi — eski kod migratsiyalangan bazada ishlaydi, sinalgan). Ikki ogohlantirish: eski kod `users.bloklangan` ni bilmaydi (admin bloklagan foydalanuvchilar yana kira oladi); admin panelning o'zgartirishlari (material rang/rasm/narx, katalog) eski kodga ko'rinmaydi, lekin bazada qoladi:
```bash
cd /srv/smart3d
git checkout <§3 da yozib qo'ygan hash>
(cd server && npm ci --omit=dev)
(cd web && NODE_ENV=development npm ci --include=dev && NODE_ENV=development npx vite build)
pm2 reload smart3d            # yoki: sudo systemctl restart smart3d
bash server/tekshiruv.sh https://smart3d.bittada.uz
```
**b) Baza ham** (faqat ma'lumot buzilgan bo'lsa; zaxiradan keyingi yozuvlar yo'qoladi):
```bash
pm2 stop smart3d              # yoki: sudo systemctl stop smart3d
cp /var/lib/smart3d/smart3d.db /var/lib/smart3d/smart3d.db.buzuq      # (-wal fayli ham bo'lsa, uni ham nusxalang)
cp /var/backups/smart3d/smart3d-<§1 dagi sana>.db /var/lib/smart3d/smart3d.db
rm -f /var/lib/smart3d/smart3d.db-wal /var/lib/smart3d/smart3d.db-shm
pm2 start smart3d             # yoki: sudo systemctl start smart3d
curl -s https://smart3d.bittada.uz/api/health
```
**c) nginx** (agar §2 buzgan bo'lsa): `sudo cp /etc/nginx/conf.d/smart3d.conf.eski /etc/nginx/conf.d/smart3d.conf && sudo nginx -t && sudo nginx -s reload`.
Qaytarishdan keyin yana yangilash uchun: `cd /srv/smart3d && git checkout main && git pull --ff-only`.

---

## Qisqa tartib (hammasi ishlayotgan bo'lsa)
```bash
cd /srv/smart3d/server && DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d node backup.js        # 1 zaxira
APP_DIR=/srv/smart3d ENV_FILE=/etc/smart3d.env DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d \
  bash /srv/smart3d/server/yangilash.sh                                                                           # 3 yangilash (hash'ni yozing)
pm2 reload smart3d                                                                                                # 4 qayta ishga tushirish
bash /srv/smart3d/server/tekshiruv.sh https://smart3d.bittada.uz                                                  # 5 tekshiruv
```

## Repo ichidagi tayyorgarlik (nima allaqachon bajarilgan)
- Maxfiylik tekshiruvi (kalit, parol, token, telefon, ichki host/IP, `/home/` yo'li): daraxtda sir yo'q; sukut JWT kaliti va `admin123` hujjatlari olib tashlandi.
- `server/nginx.conf` — haqiqiy proksi namunasi; `server/.env.example` — to'liq, sirlarsiz; `server/DEPLOY.md` — yangilangan.
- `server/tekshiruv.sh` (P8; admin sahifalari, ochiq API va material rasmi keshi bilan kengaytirilgan), `server/yangilash.sh` ogohlantirishi, sukutga qaytarish (P7), zaxira/tiklash sinovi (P9; yangi jadvallar va material rasmi BLOB bilan kengaytirilgan), baza migratsiyasi sinovi (`migratsiya.test.js`) — hammasi testlar bilan.
- CI tartibi toza klonda o'tkazilgan (`npm ci`, `vite build`, server testlari, `tests/run-all.sh`, `npm audit --omit=dev --audit-level=high` — 0 zaiflik).

## Keyingi yangilash: TZ-37 3-faza (Tizim, tarix kengaytmasi, ERP sinxron) main'ga qo'shilganda
Hozirgi `main` da yo'q. Qo'shilganda (batafsil — `server/DEPLOY.md` §11): yangi sahifalar `/admin/erp`, `/admin/tizim` (nginx o'zgarmaydi); yangi API `GET /api/admin/tizim`, `GET /api/admin/tarix`, `POST /api/admin/narx-qaytar/:id`, ERP: `/api/admin/erp*` va ochiq `GET /api/erp-narx`; yangi jadvallar `erp_partiya`, `erp_narx`, `narx_qaytar` (baza o'zi yangilanadi); yangi muhit o'zgaruvchisi **yo'q**. **Bitta amal kerak:** `BACKUP_DIR=/var/backups/smart3d` ni `/etc/smart3d.env` ga ham yozing (panel zaxira holatini server jarayonining shu o'zgaruvchisidan o'qiydi; papka `smart3d` foydalanuvchisiga o'qishga ochiq bo'lsin) — aks holda "Tizim" bo'limi zaxirani "yo'q" deb ko'rsatadi. Shunda `tekshiruv.sh` ga `/admin/erp`, `/admin/tizim`, `/api/erp-narx` qo'shiladi.
