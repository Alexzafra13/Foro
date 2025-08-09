FROM node:22-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache openssl libc6-compat curl wget

WORKDIR /app

# ===== STAGE 1: BUILD =====
FROM base AS builder

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/

# Instalar TODAS las dependencias (necesarias para build y seed)
RUN npm ci

# Generar Prisma client
RUN npx prisma generate

# Copiar código fuente Y archivos de seed
COPY src/ ./src/
COPY types/ ./types/

# 🔧 COMPILAR TODO (incluyendo prisma/seed.ts)
RUN npm run build

# 🌱 COMPILAR SEED ESPECÍFICAMENTE (backup por si tsconfig no lo incluye)
RUN npx tsc prisma/seed.ts --outDir dist/ --moduleResolution node --esModuleInterop --target ES2020

# ===== STAGE 2: PRODUCTION =====
FROM base AS production

# Copiar package files
COPY package*.json ./

# ✅ CAMBIO CRÍTICO: Instalar TODAS las dependencias para que funcionen los comandos Prisma
RUN npm ci

# Copiar archivos compilados desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ✅ MANTENER PRISMA CLI disponible para migraciones y seed
# No ejecutar npm prune para conservar las herramientas necesarias

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs && \
    chown -R backend:nodejs /app

USER backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando principal
CMD ["npm", "run", "start:docker"]