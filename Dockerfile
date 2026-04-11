# ── Build stage ──
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Prune dev dependencies
RUN npm prune --production

# ── Production stage ──
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output: ~50% smaller, all deps bundled
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Runtime files needed by server.js scheduler
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/mocks ./mocks

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
