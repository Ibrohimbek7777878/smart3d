# Smart3D — Docker (TZ-07, TZ-36). Ishlaydigan server: index.js (SQLite) + yangi sayt (web/dist) + ma'lumot (app/).
# Repo ILDIZIDAN quriladi:
#   docker build -f server/Dockerfile -t smart3d .
#   docker run -p 3000:3000 -e JWT_SECRET=<openssl rand -hex 48> -e ADMIN_PASSWORD=<kuchli parol> -v smart3d-data:/data smart3d
# Muhit: server/.env.example. Majburiy: JWT_SECRET (>=32 belgi), birinchi ishga tushishda ADMIN_PASSWORD.
# DB_PATH=/data/smart3d.db (volume), ESKIZ_* (SMS), TRUST_PROXY=1 (nginx ortida).

# 1) sayt build (vite) — web/ app/ va server/himoya.js ga tayanadi
FROM node:24-alpine AS web
WORKDIR /srv
COPY web/package.json web/package-lock.json web/
RUN cd web && NODE_ENV=development npm ci --include=dev
COPY app/ app/
COPY server/himoya.js server/himoya.js
COPY web/ web/
RUN cd web && NODE_ENV=development npx vite build

# 2) server bog'liqliklari: better-sqlite3 manbadan quriladi (python3, make, g++ kerak) — faqat shu bosqichda
FROM node:24-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /srv/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# 3) ishlab chiqarish rasmi (qurilish vositalarisiz)
FROM node:24-alpine
WORKDIR /srv/server
COPY --from=deps /srv/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/*.js ./
COPY server/lib ./lib
COPY server/routes ./routes
COPY app/ /srv/app/
COPY --from=web /srv/web/dist /srv/web/dist

RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production DB_PATH=/data/smart3d.db PORT=3000
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
# Baza yo'q bo'lsa birinchi ishga tushishda yaratiladi (ADMIN_PASSWORD kerak)
CMD ["sh", "-c", "[ -f \"$DB_PATH\" ] || node init-db.js; exec node index.js"]
