# Multi-stage build for ASCLEPIO NestJS

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (including dev) for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN pnpm exec prisma generate

# Build the application
RUN pnpm install

RUN pnpm build

# Remove non-essential dev dependencies after build
RUN pnpm prune --prod

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Install production dependencies from pruned node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy dist and generated files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the application
CMD ["pnpm", "start:prod"]
