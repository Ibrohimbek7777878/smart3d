#!/usr/bin/env bash
# Smart3D — commit oldidan node testlari (TZ-02). Ixtiyoriy o'rnatish (repo ildizidan):
#   ln -s ../../tests/pre-commit.sh .git/hooks/pre-commit
# Bir martalik o'tkazib yuborish: git commit --no-verify
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$ROOT" ] || ROOT="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"   # hook symlink bo'lsa ham to'g'ri
echo "▶ Smart3D testlari (commit oldidan)..."
if bash "$ROOT/tests/run-all.sh"; then
  exit 0
fi
echo "✖ Testlar yiqildi — commit to'xtatildi. Tuzating yoki: git commit --no-verify"
exit 1
