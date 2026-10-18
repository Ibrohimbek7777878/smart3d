#!/usr/bin/env bash
# TZ-09: React frontend (web/) tasdiqlangan dizayn bilan bir xilmi — skrinshot solishtirish.
#   bash tests/ui/dizayn.sh            # web/ ni yig'adi, kompyuter (1440) va telefon (390) da solishtiradi
# Kerak: Node, Python3 + Pillow, browser-automation skill (patchright). Natija: tests/ui/out/dizayn/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BROWSER_MJS="${BROWSER_MJS:-$HOME/.claude/skills/browser-automation/browser.mjs}"
OUT="$ROOT/tests/ui/out/dizayn"
DES="$ROOT/frontend/design_handoff_smart3d/designs"
[ -f "$BROWSER_MJS" ] || { echo "browser.mjs topilmadi: $BROWSER_MJS"; exit 1; }
rm -rf "$OUT"; mkdir -p "$OUT"

source tests/ui/web_server.sh          # ro'yxatdan o'tish endi haqiqiy serverga boradi (TZ-09 2-bosqich)
PORT=$WPORT

enc() { python3 -I -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
for VP in "1440 900" "390 844"; do
  set -- $VP
  for P in sayt ilova; do
    if [ "$P" = sayt ]; then D="Smart3D Landing v2.dc.html"; R=""; else D="Smart3D Ilova.dc.html"; R="app.html"; fi
    for T in dizayn react; do
      if [ "$T" = dizayn ]; then URL="file://$(enc "$DES/$D")"; else URL="http://127.0.0.1:$PORT/$R"; fi
      printf '%-7s %-6s %-5s ' "$T" "$P" "$1"
      OUT="$OUT" TAG="$T" PAGE="$P" W="$1" H="$2" node "$BROWSER_MJS" "$URL" --script tests/ui/dizayn.mjs --timeout 120000 2>&1 \
        | sed -n '/^script/,/^console/p' | tr -d '\n' | sed 's/console.*//; s/^script *//'
      echo
    done
  done
done
python3 -I tests/ui/dizayn_diff.py "$OUT" "${LIMIT:-0.5}"
