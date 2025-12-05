FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY web/package*.json ./web/
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Build backend
RUN npm run build

# Build frontend
RUN npm run build -w web

# Production stage
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server.js"]
