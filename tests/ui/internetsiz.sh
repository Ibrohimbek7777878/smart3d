#!/usr/bin/env bash
# TZ-09: yangi frontend (web/dist) internetsiz ochiladimi.   bash tests/ui/internetsiz.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
[ -d web/dist ] || (cd web && npx vite build >/dev/null)
PORT=$(python3 -I -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory web/dist >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT          # faqat o'zimiz ochgan server (PID bo'yicha)
sleep 1
mkdir -p tests/ui/out; RES=tests/ui/out/internetsiz.out
node "$BROWSER_MJS" "http://127.0.0.1:$PORT/app.html" --script tests/ui/internetsiz.mjs --timeout 120000 2>&1 \
  | sed -n '/^script/,/^console/p' | sed '$d' | tee "$RES"
grep -q '"ok": true' "$RES" && echo "✅ internetsiz ochiladi" || { echo "❌ internetsiz ochilmadi"; exit 1; }
