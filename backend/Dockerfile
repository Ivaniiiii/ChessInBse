FROM node:20-alpine AS builder

WORKDIR /app

# Prisma needs libssl.so.1.1 (openssl1.1-compat on Alpine)
RUN apk add --no-cache openssl1.1-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npm run db:generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Prisma engine needs libssl.so.1.1 at runtime
RUN apk add --no-cache openssl1.1-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]

