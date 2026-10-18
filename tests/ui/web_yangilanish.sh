#!/usr/bin/env bash
# Yangi versiya o'zi yuklanadimi (service worker yangilanishi). web.sh ga kirmaydi (o'z buildlari va serveri bor).
#   bash tests/ui/web_yangilanish.sh        Natija: tests/ui/out/web/yangilanish.out
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
export QA_OUT="$ROOT/tests/ui/out/web"; mkdir -p "$QA_OUT"
free_port() { python3 -I -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])'; }
NPORT=$(free_port); WPORT=$(free_port); TMPD="$(mktemp -d)"
trap 'kill ${NSRV:-} ${WSRV:-} 2>/dev/null || true; cp "$TMPD/app.html.orig" web/app.html 2>/dev/null || git checkout web/app.html; rm -rf "$TMPD"' EXIT
cp web/app.html "$TMPD/app.html.orig"
# A (belgisiz), B va C (app.html ga <meta name="s3d-sinov"> — sw precache o'zgaradi)
for v in A B C; do
  cp "$TMPD/app.html.orig" web/app.html
  [ "$v" = A ] || sed -i "s#<head>#<head><meta name=\"s3d-sinov\" content=\"$v\">#" web/app.html
  (cd web && npx vite build --outDir "$TMPD/$v" --emptyOutDir >/dev/null 2>&1)
done
grep -q 's3d-sinov' "$TMPD/B/app.html" || { echo "B belgisi qo'yilmadi"; exit 1; }
DB_PATH="$TMPD/t.db" ADMIN_PASSWORD='web-test-admin-1' ADMIN_EMAIL='admin@smart3d.uz' node server/init-db.js >/dev/null 2>&1
env -u ESKIZ_EMAIL -u ESKIZ_PASSWORD -u AI_PROVIDER -u AI_API_KEY -u ANTHROPIC_API_KEY DB_PATH="$TMPD/t.db" PORT="$NPORT" NODE_ENV=test TEST_REGISTER_LIMIT=100 \
  JWT_SECRET="web-test-secret-0123456789abcdefghijklmnopqrstuvwxyz" node server/index.js >"$TMPD/server.log" 2>&1 &
NSRV=$!
node tests/ui/web_yangilanish_srv.mjs "$WPORT" "$NPORT" A="$TMPD/A" B="$TMPD/B" C="$TMPD/C" >"$TMPD/srv.log" 2>&1 &
WSRV=$!
for _ in $(seq 1 50); do curl -sf "http://127.0.0.1:$WPORT/api/health" >/dev/null 2>&1 && break; sleep 0.3; done
RES="$QA_OUT/yangilanish.out"
node "$BROWSER_MJS" "http://127.0.0.1:$WPORT/app.html" --script tests/ui/web_yangilanish.mjs --timeout 180000 2>&1 \
  | sed -n '/^script/,/^console/p' | sed '$d' | tee "$RES"
grep -q '"ok": true' "$RES" && echo "✅ yangilanish o'zi yuklanadi" || { echo "❌ yangilanish testi yiqildi"; exit 1; }
