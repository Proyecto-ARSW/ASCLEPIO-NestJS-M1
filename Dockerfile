# Multi-stage build for ASCLEPIO NestJS

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# CI=true evita que pnpm pida confirmación interactiva al limpiar node_modules
ENV CI=true

# corepack viene incluido en Node 20 — no necesita npm install -g pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copiar manifests primero para aprovechar cache de capas de Docker:
# si package.json/lockfile no cambian, las siguientes capas se reutilizan
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .

# pnpm build ya ejecuta "npx prisma generate && nest build" internamente,
# así que no hace falta un RUN prisma generate separado antes de esto
RUN pnpm build

# Eliminar devDependencies del node_modules resultante
RUN pnpm prune --prod

# Stage 2: Runtime — imagen mínima, sin herramientas de build ni pnpm
FROM node:22-alpine

# Usuario no-root: principio de mínimo privilegio en el contenedor
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV NODE_ENV=production

# Solo los artefactos necesarios para ejecutar la app:
# - package.json: algunos paquetes lo leen en runtime (ej. pino)
# - node_modules: dependencias de producción ya podadas
# - dist: código compilado
# - generated: cliente Prisma generado (requiere los binaries del engine)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Llamar node directamente evita el overhead de pnpm como process wrapper
CMD ["node", "dist/src/main.js"]

# Daniel Useche
