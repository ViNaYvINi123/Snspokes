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

# Copy only what's needed for production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/styles ./styles
COPY --from=builder /app/mocks ./mocks
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server.js ./server.js

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
