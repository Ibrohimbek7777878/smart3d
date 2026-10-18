#!/usr/bin/env bash
# TZ-09: yangi frontend (web/) brauzer testlari — haqiqiy Smart3D server bilan, vaqtinchalik bazada (S8, SMS yuborilmaydi).
#   bash tests/ui/web.sh               # hammasi
#   bash tests/ui/web.sh kirish        # bittasi: tests/ui/web_<nom>.mjs
# Natija va skrinshotlar: tests/ui/out/web/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
export QA_OUT="$ROOT/tests/ui/out/web"
mkdir -p "$QA_OUT"
source tests/ui/web_server.sh

SUITES="${*:-$(ls tests/ui/web_*.mjs | sed 's#.*/web_##; s#\.mjs##' | tr '\n' ' ')}"
FAIL=0
for s in $SUITES; do
  echo "=== web $s"
  node "$BROWSER_MJS" "http://127.0.0.1:$WPORT/app.html" --script "tests/ui/web_$s.mjs" --timeout 180000 2>&1 \
    | sed -n '/^script/,/^console/p' | sed '$d' | tee "$QA_OUT/$s.out"
  grep -q '"ok": true' "$QA_OUT/$s.out" || FAIL=1
done
[ "$FAIL" = 0 ] && echo "✅ web testlari yashil" || { echo "❌ web testlarida xato"; exit 1; }
