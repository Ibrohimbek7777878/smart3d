#!/usr/bin/env bash
# Smart3D — yangilashdan keyingi tekshiruv (TZ-36 P8). FAQAT GET so'rovlari: hech narsa yozmaydi, o'zgartirmaydi.
#
#   bash server/tekshiruv.sh                          # http://127.0.0.1:${PORT:-3000}
#   bash server/tekshiruv.sh https://smart3d.bittada.uz
#   bash server/tekshiruv.sh http://127.0.0.1:3999    # yangilash.sh sinov porti
#
# Chiqish kodi: 0 — hammasi to'g'ri; 1 — kamida bitta tekshiruv ❌; 2 — server javob bermadi / noto'g'ri chaqirish.
set -u

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0; fi
BASE="${1:-http://127.0.0.1:${PORT:-3000}}"
BASE="${BASE%/}"
case "$BASE" in http://*|https://*) ;; *) echo "XATO: manzil http:// yoki https:// bilan boshlanishi kerak: $BASE" >&2; exit 2 ;; esac
command -v curl >/dev/null || { echo "XATO: curl topilmadi" >&2; exit 2; }

TMPD="$(mktemp -d)"; trap 'rm -rf "$TMPD"' EXIT
OK=0; XATO=0
yaz() { # holat matn
  if [ "$1" = ok ]; then OK=$((OK+1)); echo "  ✅ $2"; else XATO=$((XATO+1)); echo "  ❌ $2"; fi
}
# olish YOL → $TMPD/b (tana), $TMPD/h (sarlavhalar), KOD
olish() {
  KOD="$(curl -s --max-time 15 -o "$TMPD/b" -D "$TMPD/h" -w '%{http_code}' "$BASE$1" 2>/dev/null || true)"
  [ -n "$KOD" ] || KOD=000
}
sarlavha() { grep -i "^$1:" "$TMPD/h" 2>/dev/null | tail -n1 | tr -d '\r' | cut -d: -f2- | sed 's/^ *//'; }

echo "==> Tekshiruv: $BASE  (faqat GET)"

# 0) server javob beryaptimi
olish /api/health
if [ "$KOD" = 000 ]; then echo "❌ Server javob bermadi: $BASE/api/health" >&2; exit 2; fi

# 1) kutilgan HTTP kodlar: yo'l|kod|izoh. 401 — kirishsiz himoyalangan API; 404 — noma'lum sahifa serverning o'z 404 sahifasi.
echo "-- HTTP kodlar"
while IFS='|' read -r yol kutilgan izoh; do
  [ -n "$yol" ] || continue
  olish "$yol"
  if [ "$KOD" = "$kutilgan" ]; then yaz ok "$yol -> $KOD  ($izoh)"; else yaz xato "$yol -> $KOD, kutilgan $kutilgan  ($izoh)"; fi
done <<'JADVAL'
/api/health|200|server tirik
/|200|bosh sahifa
/app.html|200|ilova
/kirish|200|ilova manzili
/royxat|200|ilova manzili
/loyihalar|200|ilova manzili
/loyiha/yangi|200|ilova manzili
/sozlamalar|200|ilova manzili
/sozlamalar/narxlar|200|ilova manzili
/buyurtmalar|200|ilova manzili
/noma%27lum-sahifa|404|noma'lum sahifa (app.html ga burilmaydi)
/api/narxlar|200|narx stavkalari (o'qish ochiq)
/api/narxlar/tarix|401|narx tarixi — kirishsiz yopiq
/api/projects|401|loyihalar API — kirishsiz yopiq
/sw.js|200|service worker
JADVAL

# 2) /api/health tanasi
olish /api/health
if grep -Eq '"ok" *: *true' "$TMPD/b"; then yaz ok '/api/health: {"ok":true}'; else yaz xato '/api/health tanasida "ok":true yo'"'"'q'; fi

# 3) xavfsizlik sarlavhalari (bosh sahifa va ilova sahifasi)
echo "-- sarlavhalar"
for yol in / /app.html; do
  olish "$yol"
  csp="$(sarlavha content-security-policy)"
  if [ -n "$csp" ] && printf '%s' "$csp" | grep -q "default-src"; then yaz ok "$yol: Content-Security-Policy bor"; else yaz xato "$yol: Content-Security-Policy yo'q"; fi
  nos="$(sarlavha x-content-type-options)"
  if [ "$(printf '%s' "$nos" | tr 'A-Z' 'a-z')" = nosniff ]; then yaz ok "$yol: X-Content-Type-Options: nosniff"; else yaz xato "$yol: X-Content-Type-Options yo'q (nosniff kutilgan)"; fi
done
case "$BASE" in
  https://*) olish /; hsts="$(sarlavha strict-transport-security)"
    if [ -n "$hsts" ]; then yaz ok "/: HSTS bor"; else yaz xato "/: HSTS yo'q (NODE_ENV=production va TRUST_PROXY=1, nginx X-Forwarded-Proto kerak)"; fi ;;
esac

# 4) kesh qoidalari: sahifa va service worker keshlanmaydi; xesh nomli /assets/* uzoq muddat
echo "-- kesh"
for yol in /sw.js /app.html /; do
  olish "$yol"
  cc="$(sarlavha cache-control | tr 'A-Z' 'a-z')"
  if printf '%s' "$cc" | grep -Eq 'no-cache|no-store'; then yaz ok "$yol: Cache-Control: $cc"; else yaz xato "$yol: Cache-Control '$cc' — no-cache kutilgan"; fi
done
olish /
ASSET="$(grep -Eo '/assets/[A-Za-z0-9._-]+\.(js|css)' "$TMPD/b" | head -n1)"
if [ -n "$ASSET" ]; then
  olish "$ASSET"
  cc="$(sarlavha cache-control | tr 'A-Z' 'a-z')"
  if [ "$KOD" = 200 ] && printf '%s' "$cc" | grep -q immutable; then yaz ok "$ASSET: $cc"; else yaz xato "$ASSET -> $KOD, Cache-Control '$cc' — immutable kutilgan"; fi
else
  yaz xato "bosh sahifada /assets/ havolasi topilmadi (web/dist qurilmaganmi? DEPLOY.md: vite build)"
fi

echo ""
if [ "$XATO" = 0 ]; then echo "✅ Hammasi joyida: $OK tekshiruv o'tdi."; exit 0; fi
echo "❌ $XATO ta tekshiruv o'tmadi ($OK ta o'tdi). Orqaga qaytarish: DEPLOY.md, 'Orqaga qaytarish'."
exit 1
