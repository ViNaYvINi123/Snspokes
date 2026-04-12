# ── Build stage ──
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

# ── Production stage ──
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache postgresql-client curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output — Next.js bundles everything needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:3001/api/health || exit 1

# Use Next.js built-in standalone server (not custom server.js)
CMD ["node", "server.js"]
