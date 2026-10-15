#!/usr/bin/env bash
# Smart3D — brauzer regressiya testlari (TZ-SAYT-BARQARORLIK-RESPONSIVE §7).
#   bash tests/ui/run.sh            # hammasi
#   bash tests/ui/run.sh matrix     # bittasi: phase1 | matrix | touch | modals | phase3 | mc | eksport | burish | xizmat | ustki | kirish | standart
# Kerak: Node + browser-automation skill (patchright). Natija va skrinshotlar: tests/ui/out/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
PORT="${PORT:-8899}"
export QA_OUT="${QA_OUT:-$ROOT/tests/ui/out}"
mkdir -p "$QA_OUT"
[ -f "$BROWSER_MJS" ] || { echo "browser.mjs topilmadi: $BROWSER_MJS (BROWSER_MJS=... bering)"; exit 1; }

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory app >/dev/null 2>&1 &
SRV=$!
NSRV=""
trap 'kill $SRV $NSRV 2>/dev/null || true' EXIT    # faqat o'zimiz ochgan serverlar (PID bo'yicha)
sleep 1

# TZ-07: 'kirish' — Node server (API + frontend) vaqtinchalik bazada (S8); SMS yuborilmaydi (dev_code)
start_node() {
  TMPD="$(mktemp -d)"; NPORT=$((PORT + 1))
  DB_PATH="$TMPD/t.db" ADMIN_PASSWORD='ui-test-admin-1' node server/init-db.js >/dev/null 2>&1
  env -u ESKIZ_EMAIL -u ESKIZ_PASSWORD DB_PATH="$TMPD/t.db" PORT="$NPORT" NODE_ENV=test \
    JWT_SECRET="ui-test-secret-0123456789abcdefghijklmnopqrstuvwxyz" node server/index.js >"$TMPD/server.log" 2>&1 &
  NSRV=$!
  for _ in $(seq 1 50); do curl -sf "http://127.0.0.1:$NPORT/api/health" >/dev/null 2>&1 && return 0; sleep 0.2; done
  echo "Node server ishga tushmadi:"; cat "$TMPD/server.log"; return 1
}
stop_node() { [ -n "$NSRV" ] && kill "$NSRV" 2>/dev/null; NSRV=""; rm -rf "$TMPD"; }

SUITES="${*:-phase1 matrix touch modals phase3 mc eksport burish xizmat ustki kirish standart}"
for s in $SUITES; do
  echo "=== $s"
  URL="http://127.0.0.1:$PORT/"
  NODE_SUITE=0; case "$s" in kirish|standart) NODE_SUITE=1;; esac   # Node server kerak bo'lgan to'plamlar
  if [ "$NODE_SUITE" = 1 ]; then start_node || continue; URL="http://127.0.0.1:$NPORT/"; fi
  node "$BROWSER_MJS" "$URL" --script "tests/ui/$s.mjs" --timeout 90000 2>&1 \
    | sed -n '/^script/,/^console/p' | sed '$d' | tee "$QA_OUT/$s.out" \
    | if [ "$s" = matrix ]; then python3 -I tests/ui/fmt_matrix.py; else cat; fi
  if [ "$NODE_SUITE" = 1 ]; then stop_node; fi
done
