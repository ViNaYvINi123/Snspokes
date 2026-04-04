# ── Build stage ──
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Production stage ──
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install pg_dump for DB backups
RUN apk add --no-cache postgresql-client

COPY --from=builder /app ./
EXPOSE 3001
CMD ["npm", "start"]
