# Smart3D Production Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY src/ ./src/
COPY schema.sql ./

# Create logs dir
RUN mkdir -p logs uploads

# Production stage
FROM base AS production

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
