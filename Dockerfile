FROM node:22-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache openssl libc6-compat curl

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/

# Instalar dependencias
RUN npm ci

# Generar Prisma client
RUN npx prisma generate

# Copiar código fuente
COPY src/ ./src/
COPY types/ ./types/

# Compilar TypeScript
RUN npm run build

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs && \
    chown -R backend:nodejs /app

USER backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# ✅ Usar el comando más simple posible - que funcione en tu desarrollo local
CMD ["npm", "start"]