#!/usr/bin/env bash
# Smart3D — brauzer regressiya testlari (TZ-SAYT-BARQARORLIK-RESPONSIVE §7).
#   bash tests/ui/run.sh            # hammasi
#   bash tests/ui/run.sh matrix     # bittasi: phase1 | matrix | touch | modals | phase3 | mc | eksport | burish | xizmat | ustki
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
trap 'kill $SRV 2>/dev/null || true' EXIT          # faqat o'zimiz ochgan server (PID bo'yicha)
sleep 1

SUITES="${*:-phase1 matrix touch modals phase3 mc eksport burish xizmat ustki}"
for s in $SUITES; do
  echo "=== $s"
  node "$BROWSER_MJS" "http://127.0.0.1:$PORT/" --script "tests/ui/$s.mjs" --timeout 60000 2>&1 \
    | sed -n '/^script/,/^console/p' | sed '$d' | tee "$QA_OUT/$s.out" \
    | if [ "$s" = matrix ]; then python3 -I tests/ui/fmt_matrix.py; else cat; fi
done
