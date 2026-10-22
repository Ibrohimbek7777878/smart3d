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
#    Kod "401/404" ko'rinishida bo'lsa — ikkalasidan biri to'g'ri (TZ-37: admin bo'lmaganga /api/admin/* mavjudligi bildirilmaydi).
echo "-- HTTP kodlar"
while IFS='|' read -r yol kutilgan izoh; do
  [ -n "$yol" ] || continue
  olish "$yol"
  case "/$kutilgan/" in *"/$KOD/"*) yaz ok "$yol -> $KOD  ($izoh)" ;; *) yaz xato "$yol -> $KOD, kutilgan $kutilgan  ($izoh)" ;; esac
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
/admin|200|admin panel: ilova qobig'i, admin bo'lmaganga kirish sahifasi
/admin/narxlar|200|admin bo'limi, ilova manzili
/admin/furnitura|200|admin bo'limi, ilova manzili
/admin/materiallar|200|admin bo'limi, ilova manzili
/admin/katalog|200|admin bo'limi, ilova manzili
/admin/promptlar|200|admin bo'limi, ilova manzili
/admin/standart|200|admin bo'limi, ilova manzili
/admin/foydalanuvchilar|200|admin bo'limi, ilova manzili
/admin/tarix|200|admin bo'limi, ilova manzili
/admin/erp|200|admin bo'limi, ilova manzili
/admin/tizim|200|admin bo'limi, ilova manzili
/admin/noma-lum-bolim|404|noma'lum admin bo'limi (app.html ga burilmaydi)
/noma%27lum-sahifa|404|noma'lum sahifa (app.html ga burilmaydi)
/api/narxlar|200|narx stavkalari (o'qish ochiq)
/api/narxlar/tarix|401|narx tarixi — kirishsiz yopiq
/api/projects|401|loyihalar API — kirishsiz yopiq
/sw.js|200|service worker
JADVAL

# 2) /api/health tanasi
olish /api/health
if grep -Eq '"ok" *: *true' "$TMPD/b"; then yaz ok '/api/health: {"ok":true}'; else yaz xato '/api/health tanasida "ok":true yo'"'"'q'; fi

# 2a) ochiq GET API'lar (admin panel o'zgartirishini brauzer shulardan oladi) va admin API kirishsiz:
#     yo'l|kod|kerakli JSON kalitlar (vergul bilan)|izoh. JSON ekanligi (Content-Type va kalit) nginx'ning o'z 404 sahifasidan ajratadi.
echo "-- ochiq API (JSON) va admin API kirishsiz"
while IFS='|' read -r yol kutilgan kalitlar izoh; do
  [ -n "$yol" ] || continue
  olish "$yol"
  ct="$(sarlavha content-type | tr 'A-Z' 'a-z')"; yoq_kalit=""
  IFS=, read -ra ks <<<"$kalitlar"
  for k in "${ks[@]}"; do grep -q "\"$k\"" "$TMPD/b" || yoq_kalit="$yoq_kalit $k"; done
  case "/$kutilgan/" in *"/$KOD/"*) kod_ok=1 ;; *) kod_ok=0 ;; esac
  if [ "$kod_ok" = 1 ] && printf '%s' "$ct" | grep -q 'application/json' && [ -z "$yoq_kalit" ]; then yaz ok "$yol -> $KOD, JSON ($kalitlar)  ($izoh)"
  else yaz xato "$yol -> $KOD, kutilgan $kutilgan; Content-Type '$ct'; JSON kalit yo'q:${yoq_kalit:- -}  ($izoh)"; fi
done <<'JSONJADVAL'
/api/materiallar|200|dekor,narx|admin o'zgartirgan material rang, rasm va varaq narxi
/api/katalog|200|modullar|modullar katalogi, admin o'zgartirishlari
/api/furnitura-boglash|200|links|furnitura -> ERP bog'lash
/api/erp-narx|200|plita,furnitura|ERP narx qatlami (admin tasdiqlagan; bo'sh bo'lishi mumkin)
/api/promptlar|200|promptlar|tayyor so'rovlar
/api/standart|200|korpus,fasad|standart konstruksiya
/api/admin/audit|401/404|code|o'zgarishlar tarixi, kirishsiz yopiq (admin bo'lmaganga 404)
JSONJADVAL

# 2b) /admin — /app.html bilan aynan bir xil hujjat (ilova ekranni manzildan tanlaydi)
echo "-- admin sahifasi va material rasmi"
olish /app.html; cp "$TMPD/b" "$TMPD/app.html.tana"
olish /admin
if [ "$KOD" = 200 ] && [ "$(cksum < "$TMPD/b")" = "$(cksum < "$TMPD/app.html.tana")" ]; then yaz ok "/admin: /app.html bilan bir xil hujjat (ilova qobig'i)"; else yaz xato "/admin -> $KOD yoki /app.html dan farq qiladi (nginx hamma yo'lni serverga uzatishi kerak)"; fi

# 2c) admin yuklagan material rasmi: keshni server hal qiladi — ?v= xeshi mos kelsa immutable, aks holda no-cache (nginx buzmasligi kerak).
#     Rasm hali yuklanmagan bo'lsa (yangi baza) — o'tkazib yuboriladi (❌ emas).
olish /api/materiallar
RASM="$(grep -Eo '"rasm" *: *"[^"]+"' "$TMPD/b" | head -n1 | sed -E 's/^"rasm" *: *"//; s/"$//')"
if [ -n "$RASM" ]; then
  olish "/$RASM"
  cc="$(sarlavha cache-control | tr 'A-Z' 'a-z')"; ct="$(sarlavha content-type | tr 'A-Z' 'a-z')"
  if [ "$KOD" = 200 ] && printf '%s' "$ct" | grep -q '^image/' && printf '%s' "$cc" | grep -q immutable; then yaz ok "material rasmi (?v= bilan): $KOD, $ct, $cc"; else yaz xato "material rasmi (?v= bilan) -> $KOD, '$ct', Cache-Control '$cc' — image/* va immutable kutilgan"; fi
  olish "/${RASM%%\?*}"
  cc="$(sarlavha cache-control | tr 'A-Z' 'a-z')"
  if [ "$KOD" = 200 ] && printf '%s' "$cc" | grep -q 'no-cache' && ! printf '%s' "$cc" | grep -q immutable; then yaz ok "material rasmi (?v= siz): no-cache (almashtirilgan rasm qotib qolmaydi)"; else yaz xato "material rasmi (?v= siz) -> $KOD, Cache-Control '$cc' — no-cache kutilgan (immutable emas)"; fi
else
  echo "  - material rasmi yuklanmagan (/api/materiallar da rasm yo'q) — rasm keshi tekshirilmadi"
fi

# 3) xavfsizlik sarlavhalari (bosh sahifa va ilova sahifasi)
echo "-- sarlavhalar"
for yol in / /app.html /admin; do
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
