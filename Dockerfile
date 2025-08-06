FROM node:22-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache openssl libc6-compat curl wget

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/

# Instalar TODAS las dependencias (incluyendo devDependencies para build)
RUN npm ci

# Generar Prisma client
RUN npx prisma generate

# Copiar código fuente
COPY src/ ./src/
COPY types/ ./types/

# 🔧 COMPILAR CON tsc-alias (transforma los paths @/ a relativos)
RUN npm run build

# Limpiar devDependencies después del build (opcional para reducir tamaño)
RUN npm prune --production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs && \
    chown -R backend:nodejs /app

USER backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 🔧 COMANDO SIMPLE: ya no necesita tsconfig-paths porque tsc-alias transformó los paths
CMD ["npm", "start"]