#!/usr/bin/env bash
# TZ-09: yangi frontend hisob ko'prigi eski sayt bilan aynan bir xil natija beradimi (narx, tannarx, raskroy, kesim).
#   bash tests/ui/hisob_teng.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
PORT=$(python3 -I -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT          # faqat o'zimiz ochgan server (PID bo'yicha)
sleep 1
mkdir -p tests/ui/out; RES=tests/ui/out/hisob_teng.out
node "$BROWSER_MJS" "http://127.0.0.1:$PORT/app/index.html" --script tests/ui/hisob_teng.mjs --timeout 120000 2>&1 \
  | sed -n '/^script/,/^console/p' | sed '$d' | tee "$RES"
grep -q '"hammasi_teng": true' "$RES" && { echo "✅ hisob eski sayt bilan aynan bir xil"; } \
  || { echo "❌ hisobda farq bor"; exit 1; }
