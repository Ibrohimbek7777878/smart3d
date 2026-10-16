# TZ-09: yangi frontend testlari uchun umumiy qism (source qilinadi): Smart3D server (vaqtinchalik baza, S8, SMS va AI o'chiq)
# + web/ build + vite preview (/api — shu serverga). Natija: $WPORT (sayt), $NPORT (server). Tugaganda ikkalasi PID bo'yicha to'xtaydi.
free_port() { python3 -I -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])'; }
NPORT=$(free_port); WPORT=$(free_port); export NPORT WPORT   # testlar eski saytni ham (server orqali) ocha oladi
# TZ-16: Telegram — test kaliti va soxta Bot API (haqiqiy botga hech narsa ketmaydi)
TG_MOCK=$(free_port); TG_TEST_TOKEN="100200:WEBTEST$(python3 -I -c 'import secrets;print(secrets.token_hex(8))')"
TG_SECRET="webtest-sir-$(python3 -I -c 'import secrets;print(secrets.token_hex(8))')"; export TG_MOCK TG_TEST_TOKEN TG_SECRET
TMPD="$(mktemp -d)"
(cd web && npx vite build >/dev/null 2>&1)   # server web/dist ni ishga tushishda ko'radi (TZ-09 Q7: "/" — yangi sayt)
DB_PATH="$TMPD/t.db" ADMIN_PASSWORD='web-test-admin-1' ADMIN_EMAIL='admin@smart3d.uz' node server/init-db.js >/dev/null 2>&1
node tests/ui/tg_soxta.mjs "$TG_MOCK" >"$TMPD/tg.log" 2>&1 &
TGSRV=$!
env -u ESKIZ_EMAIL -u ESKIZ_PASSWORD -u AI_PROVIDER -u AI_API_KEY -u ANTHROPIC_API_KEY DB_PATH="$TMPD/t.db" PORT="$NPORT" NODE_ENV=test TEST_REGISTER_LIMIT=100 \
  TELEGRAM_BOT_TOKEN="$TG_TEST_TOKEN" TELEGRAM_WEBHOOK_SECRET="$TG_SECRET" TELEGRAM_API_URL="http://127.0.0.1:$TG_MOCK" \
  JWT_SECRET="web-test-secret-0123456789abcdefghijklmnopqrstuvwxyz" node server/index.js >"$TMPD/server.log" 2>&1 &
NSRV=$!; WSRV=""
trap 'kill $NSRV $WSRV $TGSRV 2>/dev/null || true; rm -rf "$TMPD"' EXIT   # faqat o'zimiz ochgan jarayonlar (PID bo'yicha)
SMART3D_API="http://127.0.0.1:$NPORT" node web/node_modules/vite/bin/vite.js preview web --port "$WPORT" --strictPort --host 127.0.0.1 >"$TMPD/preview.log" 2>&1 &
WSRV=$!
for _ in $(seq 1 50); do curl -sf "http://127.0.0.1:$NPORT/api/health" >/dev/null 2>&1 && curl -sf "http://127.0.0.1:$WPORT/app.html" >/dev/null 2>&1 && break; sleep 0.3; done
curl -sf "http://127.0.0.1:$WPORT/api/health" >/dev/null || { echo "server yoki preview ishga tushmadi"; cat "$TMPD/server.log" "$TMPD/preview.log"; exit 1; }
