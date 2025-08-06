# 🚀 Foro API - Sistema de Foro Moderno

Una API REST completa para foros desarrollada con Node.js, TypeScript, PostgreSQL y arquitectura hexagonal.

## 🌟 Características

- **🔐 Autenticación JWT** - Sistema completo de registro, login y verificación por email
- **📝 Sistema de Posts** - Crear, editar, comentar y votar posts
- **🏷️ Categorías y Canales** - Organización jerárquica del contenido  
- **👥 Gestión de Usuarios** - Perfiles, configuraciones personalizadas y roles
- **📧 Sistema de Email** - Verificación de cuentas y notificaciones
- **⚡ Alto Rendimiento** - PgBouncer, conexiones pooling y optimizaciones
- **🐳 Docker Ready** - Despliegue en contenedores con un comando
- **🔍 Logs y Monitoreo** - Sistema completo de activity logs

## 🚀 Instalación Rápida (Recomendada)

### Opción 1: Instalación Automática desde Docker Hub

```bash
# Descargar configuración
curl -o docker-compose.yml https://raw.githubusercontent.com/alexzafra13/foro/main/docker-compose.standalone.yml

# Levantar servicios (PostgreSQL + PgBouncer + API)
docker-compose up -d

# Verificar que funciona
curl http://localhost:9090/health
```

**¡Y listo!** La API estará disponible en http://localhost:9090

### Opción 2: Instalación con Configuración Personalizada

```bash
# 1. Descargar configuración
curl -o docker-compose.yml https://raw.githubusercontent.com/alexzafra13/foro/main/docker-compose.standalone.yml

# 2. Crear archivo de configuración personalizada
cat > .env << 'EOF'
# Base de datos
POSTGRES_USER=mi_usuario
POSTGRES_PASSWORD=mi_password_muy_seguro
POSTGRES_DB=mi_foro_db

# JWT (generar con: openssl rand -hex 32)
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=7d

# Email (para verificaciones de cuenta)
MAILER_SERVICE=gmail
MAILER_EMAIL=tu-email@gmail.com
MAILER_SECRET_KEY=tu_app_password_gmail

# Frontend (si tienes)
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:9090

# Puertos
API_PORT=9090
DB_PORT=5432
EOF

# 3. Levantar servicios
docker-compose up -d
```

## 🛠️ Instalación para Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/alexzafra13/foro.git
cd foro

# Instalar dependencias
npm install

# Configurar base de datos (con Docker)
docker-compose up -d postgres pgbouncer

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones
npx prisma migrate dev

# Ejecutar seeders (datos de prueba)
npm run db:seed

# Iniciar en modo desarrollo
npm run dev
```

## 🌐 Endpoints Principales

### Autenticación
```
POST   /api/auth/register     - Registro de usuario
POST   /api/auth/login        - Iniciar sesión
GET    /api/auth/profile      - Perfil del usuario
POST   /api/auth/verify-email - Verificar email
```

### Posts
```
GET    /api/posts            - Listar posts (con filtros y paginación)
POST   /api/posts            - Crear post
GET    /api/posts/:id        - Ver post específico
PUT    /api/posts/:id        - Editar post (autor)
DELETE /api/posts/:id        - Eliminar post (autor/admin)
POST   /api/posts/:id/vote   - Votar post
```

### Comentarios
```
GET    /api/posts/:id/comments     - Comentarios del post
POST   /api/posts/:id/comments     - Crear comentario
PUT    /api/comments/:id           - Editar comentario
DELETE /api/comments/:id           - Eliminar comentario
POST   /api/comments/:id/vote      - Votar comentario
```

### Categorías y Canales
```
GET    /api/categories       - Listar categorías
GET    /api/channels         - Listar canales
```

## 🔧 Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Por Defecto |
|----------|-------------|-------------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `foro_user` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `cambiar_este_password` |
| `POSTGRES_DB` | Nombre de la base de datos | `forumDB` |
| `JWT_SECRET` | Secreto para JWT | ⚠️ **CAMBIAR EN PRODUCCIÓN** |
| `JWT_EXPIRES_IN` | Tiempo de vida del token | `7d` |
| `MAILER_EMAIL` | Email para verificaciones | `noreply@localhost` |
| `MAILER_SECRET_KEY` | Password del email | `dummy_password` |
| `FRONTEND_URL` | URL del frontend | `http://localhost:3000` |
| `API_PORT` | Puerto de la API | `9090` |
| `BCRYPT_ROUNDS` | Rondas de encriptación | `12` |

### Configuración de Gmail

Para habilitar el envío de emails de verificación:

1. **Activar verificación en 2 pasos** en tu cuenta de Gmail
2. **Generar contraseña de aplicación**:
   - Ve a Google Account → Security → 2-Step Verification → App passwords
   - Genera una contraseña para "Mail"
3. **Configurar en .env**:
   ```
   MAILER_EMAIL=tu-email@gmail.com
   MAILER_SECRET_KEY=tu_app_password_de_16_caracteres
   ```

## 📦 Estructura del Proyecto

```
src/
├── config/              # Configuraciones (JWT, Email, DB)
├── domain/
│   ├── entities/        # Entidades de dominio
│   ├── repositories/    # Interfaces de repositorios
│   └── use-cases/       # Lógica de negocio
├── infrastructure/
│   ├── datasources/     # Implementaciones con Prisma
│   ├── repositories/    # Implementaciones de repositorios
│   └── database.ts      # Configuración de Prisma
├── presentation/
│   ├── controllers/     # Controladores REST
│   ├── routes/          # Definición de rutas
│   ├── middlewares/     # Middlewares (auth, cors, etc.)
│   └── server.ts        # Configuración del servidor
└── shared/
    ├── errors/          # Manejo de errores
    └── types/           # Tipos TypeScript
```

## 🐳 Despliegue en Producción

### Docker Compose (Recomendado)

```bash
# Clonar y usar configuración de producción
git clone https://github.com/alexzafra13/foro.git
cd foro

# Configurar variables de producción
cp .env.example .env
# Editar .env con configuraciones seguras

# Desplegar con migraciones automáticas
docker-compose -f docker-compose.production.yml up -d
```

### Variables Críticas para Producción

```env
# ⚠️ CAMBIAR ESTAS VARIABLES EN PRODUCCIÓN
JWT_SECRET=generar_con_openssl_rand_hex_32
EMAIL_VERIFICATION_SECRET=otro_secret_diferente
POSTGRES_PASSWORD=password_muy_seguro_base_datos

# URLs de producción
FRONTEND_URL=https://tu-dominio.com
ALLOWED_ORIGINS=https://tu-dominio.com

# Email de producción
MAILER_EMAIL=noreply@tu-dominio.com
MAILER_SECRET_KEY=app_password_real
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests específicos
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📊 Monitoreo y Logs

- **Health Check**: `GET /health`
- **Logs de actividad**: Todas las acciones se registran en `activity_logs`
- **Métricas de PostgreSQL**: Accesible en puerto 5432
- **PgBouncer Stats**: Conexión via puerto 6432

## 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ Validación de datos de entrada  
- ✅ Sanitización de queries (Prisma ORM)
- ✅ Rate limiting con PgBouncer
- ✅ CORS configurado
- ✅ Variables de entorno para secretos
- ✅ Bcrypt para passwords (12 rondas)
- ✅ Validación de tokens de verificación

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- 📧 **Email**: [crear issue en GitHub](https://github.com/alexzafra13/foro/issues)
- 🐛 **Bugs**: [Reportar bug](https://github.com/alexzafra13/foro/issues/new?template=bug_report.md)
- 💡 **Feature Request**: [Solicitar feature](https://github.com/alexzafra13/foro/issues/new?template=feature_request.md)

---

⭐ **Si este proyecto te ayuda, dale una estrella en GitHub!**