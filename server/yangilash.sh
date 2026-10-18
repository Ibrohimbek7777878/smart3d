#!/usr/bin/env bash
# Smart3D — production'ni bitta buyruq bilan xavfsiz yangilash (TZ-34).
# Bosqichlar: zaxira -> git yangilash -> o'rnatish va build -> sinov porti tekshiruvi -> (ixtiyoriy) qayta ishga tushirish.
# Sukut bo'yicha qayta ishga tushirmaydi (qoida 5.3: faqat egasi buyrug'i bilan) — buning uchun --restart.
set -euo pipefail

yordam() {
  cat <<'YORDAM'
Ishlatish:
  APP_DIR=/srv/smart3d ENV_FILE=/etc/smart3d.env DB_PATH=/var/lib/smart3d/smart3d.db \
  BACKUP_DIR=/var/backups/smart3d SERVICE_CMD='pm2 reload smart3d' \
    bash server/yangilash.sh [--restart] [--help]

Parametrlar (env yoki flag; flag env'dan ustun):
  --app-dir     / APP_DIR      repo papkasi (git clone)                       [majburiy]
  --env-file    / ENV_FILE     muhit fayli, masalan /etc/smart3d.env          [majburiy]
  --db-path     / DB_PATH      SQLite baza fayli                              [majburiy]
  --backup-dir  / BACKUP_DIR   zaxira papkasi                                 [majburiy]
  --branch      / BRANCH       git shoxi                                      [sukut: dizayn]
  --test-port   / TEST_PORT    sinov porti                                    [sukut: 3999]
  --service-cmd / SERVICE_CMD  qayta ishga tushirish buyrug'i (pm2 reload smart3d | systemctl restart smart3d)
                               [--restart uchun majburiy]
  --prod-url    / PROD_URL     production manzili, masalan https://smart3d.bittada.uz (ixtiyoriy;
                               --restart dan keyin 30 soniya ichida /api/health tekshiriladi)
  --restart                    sinovdan o'tgach SERVICE_CMD ni bajaradi (aks holda shu yerda to'xtaydi)
  --help                       shu yordam
YORDAM
}

RESTART=0
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) yordam; exit 0 ;;
    --restart) RESTART=1 ;;
    --app-dir|--env-file|--db-path|--backup-dir|--branch|--test-port|--service-cmd|--prod-url)
      [ $# -ge 2 ] || { echo "XATO: $1 uchun qiymat kerak." >&2; exit 2; }
      k="${1#--}"; k="${k//-/_}"; k="${k^^}"
      printf -v "$k" '%s' "$2"; shift ;;
    *) echo "XATO: noma'lum parametr: $1" >&2; yordam >&2; exit 2 ;;
  esac
  shift
done

APP_DIR="${APP_DIR:-}"; ENV_FILE="${ENV_FILE:-}"; DB_PATH="${DB_PATH:-}"; BACKUP_DIR="${BACKUP_DIR:-}"
BRANCH="${BRANCH:-dizayn}"; TEST_PORT="${TEST_PORT:-3999}"; SERVICE_CMD="${SERVICE_CMD:-}"; PROD_URL="${PROD_URL:-}"

yoq=""
for v in APP_DIR ENV_FILE DB_PATH BACKUP_DIR; do [ -n "${!v}" ] || yoq="$yoq $v"; done
if [ "$RESTART" = 1 ] && [ -z "$SERVICE_CMD" ]; then yoq="$yoq SERVICE_CMD"; fi
if [ -n "$yoq" ]; then
  echo "XATO: quyidagi parametrlar berilmagan:$yoq" >&2
  echo "Yordam: bash server/yangilash.sh --help" >&2
  exit 2
fi
[ -d "$APP_DIR/.git" ] || { echo "XATO: APP_DIR git repo emas: $APP_DIR" >&2; exit 2; }
[ -r "$ENV_FILE" ] || { echo "XATO: ENV_FILE o'qilmaydi: $ENV_FILE" >&2; exit 2; }
[ -f "$DB_PATH" ] || { echo "XATO: baza topilmadi: $DB_PATH" >&2; exit 2; }
case "$TEST_PORT" in ''|*[!0-9]*) echo "XATO: TEST_PORT son bo'lishi kerak" >&2; exit 2 ;; esac

APP_DIR="$(cd "$APP_DIR" && pwd)"
cd "$APP_DIR"

BOSQICH="boshlanish"; ESKI=""; TMPD=""; TEST_PID=""

tozala() {
  # faqat o'zimiz ochgan jarayon (PID bo'yicha) va vaqtinchalik papka
  if [ -n "$TEST_PID" ]; then kill "$TEST_PID" 2>/dev/null || true; wait "$TEST_PID" 2>/dev/null || true; fi
  if [ -n "$TMPD" ]; then rm -rf "$TMPD"; fi
}
xato() {
  local kod=$?
  trap - ERR
  echo "" >&2
  echo "XATO: \"$BOSQICH\" bosqichida yiqildi (chiqish kodi $kod)." >&2
  echo "Production servisi tegilmagan (qayta ishga tushirilmagan)." >&2
  if [ -n "$ESKI" ]; then
    echo "Orqaga qaytish:" >&2
    echo "  cd $APP_DIR && git checkout $ESKI && (cd server && npm ci --omit=dev) && (cd web && NODE_ENV=development npm ci --include=dev && npx vite build)" >&2
  fi
  echo "Zaxira nusxalar: $BACKUP_DIR" >&2
  exit "$kod"
}
trap tozala EXIT
trap xato ERR

# ---- 1. Zaxira -----------------------------------------------------------
BOSQICH="1/6 zaxira (backup.js)"
echo "==> $BOSQICH"
DB_PATH="$DB_PATH" BACKUP_DIR="$BACKUP_DIR" node server/backup.js

# ---- 2. Git --------------------------------------------------------------
BOSQICH="2/6 git yangilash"
echo "==> $BOSQICH"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Ishchi papkada o'zgarishlar bor — hech narsa o'chirilmadi, to'xtadi:" >&2
  git status --short --untracked-files=no >&2
  false
fi
git fetch --prune origin
ESKI="$(git rev-parse HEAD)"
echo "Joriy commit (orqaga qaytish uchun): $ESKI"
git checkout "$BRANCH"
git pull --ff-only
YANGI="$(git rev-parse HEAD)"
echo "Yangi commit: $YANGI"

# ---- 3. O'rnatish va build ----------------------------------------------
BOSQICH="3/6 server o'rnatish (npm ci --omit=dev)"
echo "==> $BOSQICH"
(cd server && npm ci --omit=dev)

BOSQICH="4/6 web build (vite build)"
echo "==> $BOSQICH"
(cd web && NODE_ENV=development npm ci --include=dev && npx vite build)

# ---- 5. Sinov porti ------------------------------------------------------
BOSQICH="5/6 sinov (port $TEST_PORT, bazaning nusxasi bilan)"
echo "==> $BOSQICH"
TMPD="$(mktemp -d)"
(cd server && DB_PATH="$DB_PATH" node --input-type=module -e '
  import D from "better-sqlite3";const d=new D(process.env.DB_PATH,{readonly:true});
  await d.backup(process.argv[1]);d.close();' "$TMPD/sinov.db")
(
  # muhit fayli qiymatlari faqat shu quyi-jarayonda; ekranga chiqarilmaydi
  set -a; . "$ENV_FILE"; set +a
  export PORT="$TEST_PORT" DB_PATH="$TMPD/sinov.db"
  exec node server/index.js
) >"$TMPD/server.log" 2>&1 &
TEST_PID=$!

tayyor=0
for _ in $(seq 1 60); do
  kill -0 "$TEST_PID" 2>/dev/null || break
  if curl -sf "http://127.0.0.1:$TEST_PORT/api/health" >/dev/null 2>&1; then tayyor=1; break; fi
  sleep 0.5
done
if [ "$tayyor" != 1 ]; then
  echo "Sinov serveri ko'tarilmadi. Log (oxirgi 15 qator; maxfiy qiymatlar yozilmaydi):" >&2
  tail -n 15 "$TMPD/server.log" >&2 || true
  false
fi
sog="$(curl -sf "http://127.0.0.1:$TEST_PORT/api/health")"
case "$sog" in *'"ok":true'*|*'"ok": true'*) echo "  /api/health: ok" ;;
  *) echo "/api/health 'ok' qaytarmadi" >&2; false ;; esac
for yol in / /app.html /loyihalar; do
  kod="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$TEST_PORT$yol" || true)"
  if [ "$kod" != 200 ]; then echo "$yol -> HTTP $kod (200 kutilgan)" >&2; false; fi
  echo "  $yol: 200"
done
kill "$TEST_PID" 2>/dev/null || true; wait "$TEST_PID" 2>/dev/null || true; TEST_PID=""
rm -rf "$TMPD"; TMPD=""
echo "Sinov o'tdi, vaqtinchalik nusxa o'chirildi."

# ---- 6. Qayta ishga tushirish -------------------------------------------
if [ "$RESTART" != 1 ]; then
  echo ""
  echo "Hammasi tayyor — qayta ishga tushirish uchun --restart bilan yoki SERVICE_CMD ni qo'lda bajaring."
  echo "(Orqaga qaytish kerak bo'lsa: git checkout $ESKI va qayta build.)"
  exit 0
fi

BOSQICH="6/6 qayta ishga tushirish (SERVICE_CMD)"
echo "==> $BOSQICH"
bash -c "$SERVICE_CMD"
if [ -n "$PROD_URL" ]; then
  BOSQICH="6/6 production /api/health (30 soniya)"
  ok=0
  for _ in $(seq 1 15); do
    if curl -sf "${PROD_URL%/}/api/health" >/dev/null 2>&1; then ok=1; break; fi
    sleep 2
  done
  [ "$ok" = 1 ] || { echo "Production 30 soniya ichida javob bermadi: ${PROD_URL%/}/api/health" >&2; false; }
  echo "  production /api/health: ok"
else
  echo "PROD_URL berilmagan — production tekshiruvini qo'lda qiling: curl <manzil>/api/health"
fi
echo "Yangilash tugadi: $YANGI"
