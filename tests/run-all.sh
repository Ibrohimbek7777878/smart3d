#!/usr/bin/env bash
# Smart3D regressiya — barcha node testlarni ishga tushiradi.
# Ishlatish: bash tests/run-all.sh   (repo ildizidan yoki tests/ dan)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
FAIL=0
for t in verify verify_ai verify_f1 verify_f2 verify_glb verify_util_export verify_mc verify_narx verify_xizmat verify_teshik verify_hisob verify_tortma verify_til verify_konstruktor verify_bazis; do
  printf '%-22s ' "$t:"
  ARG=""; [ "$t" = verify_til ] && ARG="--qatiy"   # TZ-18: rus/ingliz lug'ati to'liq (2026-10-16)
  if out=$(node "$HERE/$t.mjs" $ARG 2>&1); then
    echo "$(echo "$out" | tail -1)"
  else
    echo "XATO"
    echo "$out" | tail -5
    FAIL=1
  fi
done
echo
if [ "$FAIL" -eq 0 ]; then echo "✅ BARCHA NODE TESTLAR YASHIL"; else echo "❌ XATO BOR"; exit 1; fi
