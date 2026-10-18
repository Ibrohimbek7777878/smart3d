# Productionga qo'lda o'tkazish ro'yxati (TZ-36 P10)

**Kim bajaradi:** egasi (yoki u ruxsat bergan server admini). Repo va agentlar serverga hech narsa yozmaydi, qayta ishga tushirmaydi (#222).
**Qanday o'qiladi:** yuqoridan pastga. Har qadamda tayyor buyruq, kutilgan natija va xato bo'lsa nima qilish yozilgan. `<...>` o'rniga o'z qiymatingizni qo'ying; sirlar (kalit, parol) bu hujjatga va gitga yozilmaydi.
**Mavjud o'rnatishni yangilash** uchun yozilgan (server o'rnatilgan, `/srv/smart3d`, PM2 yoki systemd, nginx ortida). Birinchi marta o'rnatish — `server/DEPLOY.md` §1–§5.
Namuna qiymatlar: papka `/srv/smart3d`, muhit fayli `/etc/smart3d.env`, baza `/var/lib/smart3d/smart3d.db`, zaxira `/var/backups/smart3d`, manzil `https://smart3d.bittada.uz`. Sizda boshqacha bo'lsa — hamma buyruqda almashtiring.

---

## 0. Oldindan shartlar (bir marta tekshiriladi)

| # | Shart | Tekshirish buyrug'i | Kutilgan natija |
|---|---|---|---|
| 1 | Node.js 20+ va git bor | `node -v && git --version` | `v20…` yoki yuqori |
| 2 | Muhit fayli bor, sirlar to'g'ri | `sudo test -r /etc/smart3d.env && echo bor` | `bor` |
| 3 | `JWT_SECRET` 32+ belgi (qiymatni **ko'rsatmasdan**) | `sudo sh -c '. /etc/smart3d.env; echo ${#JWT_SECRET}'` | `32` yoki ko'p |
| 4 | `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_PATH` berilgan | `sudo grep -E '^(NODE_ENV\|TRUST_PROXY\|DB_PATH)=' /etc/smart3d.env` | 3 qator |
| 5 | Zaxira papkasi yozilishi mumkin | `mkdir -p /var/backups/smart3d && touch /var/backups/smart3d/.t && rm /var/backups/smart3d/.t && echo ok` | `ok` |
| 6 | Kunlik zaxira cron bor | `crontab -l \| grep backup.js` | 1 qator (`DEPLOY.md` §8) |
| 7 | Git ishchi papkasi toza | `cd /srv/smart3d && git status --porcelain --untracked-files=no` | bo'sh chiqish |

**Muhit fayliga qo'shiladigan ixtiyoriy qiymatlar** (yo'q bo'lsa tegishli imkoniyat o'chiq, sayt ishlayveradi). Namuna va izohlar — `server/.env.example`:
- **Google bilan kirish:** Google Cloud Console -> APIs & Services -> Credentials -> *OAuth client ID* (turi *Web application*), *Authorized JavaScript origins* = `https://smart3d.bittada.uz`. Keyin:
  ```bash
  echo 'GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com' | sudo tee -a /etc/smart3d.env >/dev/null
  ```
  Tekshiruv (qayta ishga tushgandan keyin): `curl -s https://smart3d.bittada.uz/api/auth/usullar` -> `"google":true`.
- SMS (Eskiz): `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`. AI: `AI_PROVIDER`, `ANTHROPIC_API_KEY`. Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBAPP_URL`.

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

## 2. Yangi nginx sozlamasini qo'yish (faqat birinchi o'tishda yoki nginx namunasi o'zgarganda)

Eski namunada `try_files` / "hamma yo'l index.html ga" qoidasi bo'lsa — **almashtiring**: yangi sayt manzillarini (`/loyihalar`, `/loyiha/5`, `/sozlamalar/narxlar` …) server o'zi beradi, nginx hammasini serverga uzatishi kerak.
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
Skript ketma-ket: zaxira -> `git pull --ff-only` (shox `main`) -> `npm ci --omit=dev` -> `npm ci --include=dev` + `vite build` -> bazaning **nusxasi** bilan sinov portida (3999) `/api/health`, `/`, `/app.html`, `/loyihalar`.
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
**Kutilgan:** ~5 soniyada: `curl -s https://smart3d.bittada.uz/api/health` -> `{"ok":true,…}`.
Yoki §3 va §4 ni birga: `... SERVICE_CMD='pm2 reload smart3d' PROD_URL=https://smart3d.bittada.uz bash /srv/smart3d/server/yangilash.sh --restart` (30 soniya ichida `/api/health` ni o'zi tekshiradi).
**Xato bo'lsa** (health javob bermasa): `pm2 logs smart3d --lines 50` yoki `journalctl -u smart3d -n 50`. Eng ko'p sabab: `JWT_SECRET` qisqa/yo'q (log: `XATO: JWT_SECRET …`) -> §0 qadam 3. Hal bo'lmasa — §7 (qaytarish).

## 5. Yangilashdan keyingi tekshiruv

```bash
bash /srv/smart3d/server/tekshiruv.sh https://smart3d.bittada.uz
```
Faqat GET so'rovlar; hech narsa yozmaydi. **Kutilgan:** hamma qator `✅`, oxirida `✅ Hammasi joyida: <son> tekshiruv o'tdi.`, chiqish kodi `0` (`echo $?`).
Tekshiradi: `/api/health` 200; `/`, `/app.html`, `/kirish`, `/royxat`, `/loyihalar`, `/loyiha/yangi`, `/sozlamalar`, `/sozlamalar/narxlar`, `/buyurtmalar` — 200; noma'lum sahifa — 404; `/api/narxlar` — 200; `/api/narxlar/tarix` va `/api/projects` — 401; `/sw.js` — 200 va `no-cache`; `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, HSTS; `/assets/*` — `immutable`.
**`❌` bo'lsa:** qator nima kutilganini yozadi. Tez-tez: `/loyihalar -> 404` — nginx hali eski (`try_files` yoki noto'g'ri `root`) -> §2; `HSTS yo'q` — `NODE_ENV=production` yoki nginx `X-Forwarded-Proto` yo'q -> `DEPLOY.md` §6; `Cache-Control … no-cache kutilgan` — nginx sarlavhani o'zgartirgan.

Brauzerda (qo'lda, 2 daqiqa):
1. `https://smart3d.bittada.uz/loyihalar` ni to'g'ridan-to'g'ri oching va `F5` bosing — ilova yuklanadi (404 emas).
2. Kirish: email/parol; (sozlangan bo'lsa) SMS yoki Google.
3. Loyiha yarating, saqlang, boshqa qurilmada oching.
4. Sozlamalar -> Narxlar ochiladi (admin).

## 6. Eski narx stavkalarini sukutga qaytarish (ixtiyoriy, faqat §3 da ogohlantirish chiqqan bo'lsa)

Admin sifatida: **Sozlamalar -> Narxlar -> "Ish haqini sukutga qaytarish"** -> tasdiqlash. Ish haqi 0 ga (manba "egasi") qaytadi; xizmat stavkalari, tanlov va ustamaga tegilmaydi; o'zgarish tarixga yoziladi ("Tarix" tugmasi).
"Hamma stavkani sukutga qaytarish" — ehtiyot bo'ling: admin saqlagan raspil/kromka/prisadka tanlovini ham o'chiradi.
**Kutilgan:** yashil xabar "Sukut stavkalarga qaytarildi (N o'zgarish)". Tekshiruv: `curl -s https://smart3d.bittada.uz/api/narxlar` -> `"ish_haqi"` ichida `"qiymat":0`.
Qaytarmaslik ham mumkin — hisobda hozirgi saqlangan ish haqi qoladi (narxga ta'sir qiladi).

## 7. Orqaga qaytarish (agar §4–§5 da jiddiy muammo bo'lsa)

**a) Faqat kod** (odatda yetarli; baza tegilmaydi):
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
cp /var/lib/smart3d/smart3d.db /var/lib/smart3d/smart3d.db.buzuq
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
- `server/tekshiruv.sh` (P8), `server/yangilash.sh` ogohlantirishi, sukutga qaytarish (P7), zaxira/tiklash sinovi (P9) — testlar bilan.
- CI tartibi toza klonda o'tkazilgan (`npm ci`, `vite build`, server testlari, `tests/run-all.sh`, `npm audit --omit=dev --audit-level=high` — 0 zaiflik).
