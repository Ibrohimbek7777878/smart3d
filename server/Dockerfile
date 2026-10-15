# Smart3D — Docker (TZ-07). Ishlaydigan server: index.js (SQLite) + frontend (app/).
# Repo ILDIZIDAN quriladi (frontend server/ dan tashqarida):
#   docker build -f server/Dockerfile -t smart3d .
#   docker run -p 3000:3000 -e JWT_SECRET=… -e ADMIN_PASSWORD=… -v smart3d-data:/data smart3d
# Muhit: JWT_SECRET (majburiy), DB_PATH=/data/smart3d.db, ESKIZ_* (SMS), TRUST_PROXY=1 (nginx ortida).
FROM node:20-alpine

WORKDIR /srv/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/index.js server/init-db.js server/admin-password.js server/sms.js ./
COPY app/ /srv/app/

ENV NODE_ENV=production DB_PATH=/data/smart3d.db PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
# Baza yo'q bo'lsa birinchi ishga tushishda yaratiladi (ADMIN_PASSWORD kerak)
CMD ["sh", "-c", "[ -f \"$DB_PATH\" ] || node init-db.js; exec node index.js"]
