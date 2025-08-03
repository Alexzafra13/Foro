# 📚 Documentación Completa del Backend - Forum API

## 🎯 Información General

### Stack Tecnológico
- **Runtime**: Node.js con TypeScript
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT (JSON Web Tokens)
- **Email**: Nodemailer con Gmail
- **Validación**: Validadores personalizados
- **Arquitectura**: Clean Architecture

### Variables de Entorno Requeridas
```env
# Base de Datos
POSTGRES_URL=postgresql://usuario:password@localhost:5432/forum_db

# JWT
JWT_SECRET=tu-secret-key-super-seguro
JWT_EXPIRES_IN=2h

# Servidor
PORT=3001
NODE_ENV=development

# Seguridad
BCRYPT_ROUNDS=12

# Email
MAILER_SERVICE=gmail
MAILER_EMAIL=tu-email@gmail.com
MAILER_SECRET_KEY=tu-app-password-gmail

# Frontend
FRONTEND_URL=http://localhost:3000
EMAIL_VERIFICATION_SECRET=verification-secret-key
```

## 🔐 Sistema de Autenticación

### Roles de Usuario
1. **admin** - Control total del sistema
2. **moderator** - Gestión de contenido y usuarios
3. **user** - Usuario regular

### Flujo de Autenticación
1. **Registro**: Requiere código de invitación válido
2. **Login**: Devuelve JWT token
3. **Verificación de Email**: Requerida para crear contenido
4. **Reset de Contraseña**: Por email con token temporal

### Headers Requeridos
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## 🛣️ Endpoints de la API

### 🔑 Autenticación (`/api/auth`)

#### Registro de Usuario
```http
POST /api/auth/register
```
**Body:**
```json
{
  "username": "usuario123",
  "email": "usuario@email.com",
  "password": "Password123!",
  "inviteCode": "CODIGO-INVITACION-VALIDO"
}
```
**Respuesta:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "id": 1,
    "username": "usuario123",
    "email": "usuario@email.com",
    "role": "user",
    "isEmailVerified": false
  }
}
```

#### Login
```http
POST /api/auth/login
```
**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "Password123!"
}
```
**Respuesta:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "usuario123",
      "email": "usuario@email.com",
      "role": "user",
      "isEmailVerified": true,
      "isBanned": false
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Verificar Email
```http
POST /api/auth/verify-email
```
**Body:**
```json
{
  "token": "token-de-verificacion-del-email"
}
```

#### Solicitar Reset de Contraseña
```http
POST /api/auth/request-password-reset
```
**Body:**
```json
{
  "email": "usuario@email.com"
}
```

#### Completar Reset de Contraseña
```http
POST /api/auth/reset-password
```
**Body:**
```json
{
  "token": "token-del-email",
  "newPassword": "NuevaPassword123!"
}
```

### 👤 Perfil de Usuario (`/api/users`)

#### Ver Mi Perfil
```http
GET /api/users/profile
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere autenticación

**Query Parameters:**
- `includeSettings` (boolean, default: false)
- `includeStats` (boolean, default: false)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "usuario123",
    "email": "usuario@email.com",
    "avatarUrl": "https://...",
    "bio": "Descripción del usuario",
    "reputation": 150,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "isEmailVerified": true,
    "stats": {
      "posts": 25,
      "comments": 150
    },
    "settings": {
      "theme": "dark",
      "language": "es",
      "emailNotifications": true
    }
  }
}
```

**Nota:** Actualmente NO existe endpoint para ver perfiles públicos de otros usuarios.

#### Actualizar Mi Perfil
```http
PUT /api/users/profile
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "username": "nuevoUsername",
  "bio": "Nueva biografía",
  "avatarUrl": "https://nueva-imagen.com/avatar.jpg"
}
```

#### Cambiar Contraseña
```http
PUT /api/users/password
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "currentPassword": "PasswordActual123!",
  "newPassword": "NuevaPassword123!"
}
```

#### Obtener Configuraciones
```http
GET /api/users/settings
```
**Headers:** `Authorization: Bearer <token>`

#### Actualizar Configuraciones
```http
PUT /api/users/settings
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "theme": "dark",
  "language": "es",
  "timezone": "America/Mexico_City",
  "emailNotifications": true,
  "postNotifications": true,
  "commentNotifications": true,
  "privateProfile": false,
  "showEmail": false,
  "showLastSeen": true
}
```

### 📁 Categorías y Canales

#### Listar Categorías con Canales
```http
GET /api/categories
```
**Headers:** `Authorization: Bearer <token>`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "General",
      "description": "Categoría general",
      "icon": "📢",
      "position": 0,
      "channels": [
        {
          "id": 1,
          "name": "anuncios",
          "description": "Anuncios oficiales",
          "icon": "📢",
          "isPrivate": false,
          "stats": {
            "posts": 15,
            "lastPost": {
              "id": 45,
              "title": "Nuevo anuncio",
              "authorUsername": "admin",
              "createdAt": "2024-01-20T10:00:00Z"
            }
          }
        }
      ]
    }
  ]
}
```

#### Ver Detalles de Canal
```http
GET /api/channels/:id
```
**Headers:** `Authorization: Bearer <token>`

### 📝 Posts

#### Listar Posts
```http
GET /api/posts
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `channelId` (opcional)
- `authorId` (opcional)
- `sortBy` (default: "createdAt")
- `sortOrder` ("asc" | "desc", default: "desc")

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "Mi primer post",
        "content": "Contenido del post...",
        "views": 125,
        "isLocked": false,
        "isPinned": false,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": null,
        "author": {
          "id": 1,
          "username": "usuario123",
          "avatarUrl": "https://..."
        },
        "channel": {
          "id": 1,
          "name": "general"
        },
        "stats": {
          "comments": 15,
          "voteScore": 25,
          "userVote": 1
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

#### Ver Post Individual
```http
GET /api/posts/:id
```
**Headers:** `Authorization: Bearer <token>`

#### Crear Post
```http
POST /api/posts
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "channelId": 1,
  "title": "Título del post",
  "content": "Contenido del post en markdown..."
}
```

#### Actualizar Post
```http
PUT /api/posts/:id
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "title": "Título actualizado",
  "content": "Contenido actualizado..."
}
```

#### Eliminar Post
```http
DELETE /api/posts/:id
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

#### Trackear Vista de Post
```http
POST /api/posts/:id/track-view
```
**Headers:** `Authorization: Bearer <token>`

#### Ver Estadísticas de Vistas
```http
GET /api/posts/:id/stats
```
**Headers:** `Authorization: Bearer <token>`

### 💬 Comentarios

#### Listar Comentarios de un Post
```http
GET /api/posts/:postId/comments
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `sortBy` ("createdAt" | "voteScore", default: "createdAt")
- `sortOrder` ("asc" | "desc")
- `includeReplies` (boolean, default: true)

#### Crear Comentario
```http
POST /api/posts/:postId/comments
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "content": "Este es mi comentario",
  "parentCommentId": null
}
```

#### Actualizar Comentario
```http
PUT /api/comments/:id
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "content": "Comentario actualizado"
}
```

#### Eliminar Comentario
```http
DELETE /api/comments/:id
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

#### Ver Respuestas de un Comentario
```http
GET /api/comments/:id/replies
```
**Headers:** `Authorization: Bearer <token>`

### 🗳️ Sistema de Votos

#### Votar en Post
```http
POST /api/posts/:id/vote
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "voteType": 1
}
```
- `voteType`: 1 (upvote), -1 (downvote), 0 (remover voto)

#### Votar en Comentario
```http
POST /api/comments/:id/vote
```
**Headers:** `Authorization: Bearer <token>` ✅ Requiere email verificado

**Body:**
```json
{
  "voteType": -1
}
```

### 🔔 Notificaciones

#### Obtener Mis Notificaciones
```http
GET /api/notifications
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `unreadOnly` (boolean, default: false)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "comment_reply",
        "content": "usuario456 respondió a tu comentario",
        "isRead": false,
        "createdAt": "2024-01-20T15:30:00Z",
        "relatedData": {
          "postId": 10,
          "commentId": 25
        }
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    },
    "unreadCount": 12
  }
}
```

#### Marcar Notificación como Leída
```http
PUT /api/notifications/:id/read
```
**Headers:** `Authorization: Bearer <token>`

#### Marcar Todas como Leídas
```http
PUT /api/notifications/read-all
```
**Headers:** `Authorization: Bearer <token>`

### 🎟️ Sistema de Invitaciones

#### Validar Código (Público)
```http
POST /api/invites/validate
```
**Body:**
```json
{
  "code": "CODIGO-INVITACION"
}
```

#### Generar Código (Admin/Moderator)
```http
POST /api/invites/generate
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin/moderator

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "code": "INV-ABC123-XYZ789",
    "createdAt": "2024-01-20T10:00:00Z",
    "createdBy": "admin"
  }
}
```

#### Listar Códigos (Admin/Moderator)
```http
GET /api/invites
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin/moderator

#### Ver Estadísticas (Admin/Moderator)
```http
GET /api/invites/stats
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin/moderator

#### Eliminar Código (Admin)
```http
DELETE /api/invites/:code
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin

### 🛡️ Moderación

#### Banear Usuario
```http
POST /api/moderation/ban
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin/moderator

**Body:**
```json
{
  "userId": 123,
  "reason": "Spam repetido"
}
```

#### Desbanear Usuario
```http
POST /api/moderation/unban
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin

**Body:**
```json
{
  "userId": 123
}
```

#### Listar Usuarios Baneados
```http
GET /api/moderation/banned-users
```
**Headers:** `Authorization: Bearer <token>` 🔒 Requiere rol admin/moderator

## 🔒 Middlewares

### AuthMiddleware
- `validateToken`: Valida JWT y adjunta usuario a `req.user`
- `optionalAuth`: Valida JWT si existe, pero no es obligatorio

### EmailVerificationMiddleware
- `requireEmailVerified`: Requiere que el usuario tenga email verificado
- `requireEmailVerifiedStrict`: Versión más estricta para acciones sensibles

### RoleMiddleware
- `requireRole(['admin', 'moderator'])`: Requiere roles específicos

### BanMiddleware
- Verifica si el usuario está baneado antes de permitir acciones

## 📊 Modelos de Datos Principales

### User
```typescript
{
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  role: string;
  isEmailVerified: boolean;
  isBanned: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}
```

### Post
```typescript
{
  id: number;
  channelId: number;
  authorId: number;
  title: string;
  content: string;
  views: number;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

### Comment
```typescript
{
  id: number;
  postId: number;
  authorId: number;
  parentCommentId?: number;
  content: string;
  isEdited: boolean;
  editCount: number;
  isDeleted: boolean;
  createdAt: Date;
}
```

## 🚨 Códigos de Error Comunes

### Errores de Autenticación (401)
- `TOKEN_REQUIRED`: No se proporcionó token
- `INVALID_TOKEN`: Token inválido o expirado
- `EMAIL_NOT_VERIFIED`: Email no verificado

### Errores de Autorización (403)
- `INSUFFICIENT_PERMISSIONS`: Permisos insuficientes
- `USER_BANNED`: Usuario baneado
- `CANNOT_MODIFY_OTHERS_CONTENT`: No puede modificar contenido ajeno

### Errores de Validación (400)
- `INVALID_INPUT`: Datos de entrada inválidos
- `MISSING_REQUIRED_FIELDS`: Campos requeridos faltantes

### Errores de Recursos (404)
- `USER_NOT_FOUND`: Usuario no encontrado
- `POST_NOT_FOUND`: Post no encontrado
- `COMMENT_NOT_FOUND`: Comentario no encontrado

### Errores de Conflicto (409)
- `USERNAME_ALREADY_EXISTS`: Username ya existe
- `EMAIL_ALREADY_EXISTS`: Email ya registrado
- `ALREADY_VOTED`: Ya votaste en este contenido

## 📝 Notas Importantes para el Frontend

### 1. Autenticación
- Guardar el JWT token en localStorage o cookie segura
- Incluir el token en TODAS las peticiones autenticadas
- Renovar el token antes de que expire (2 horas)
- Manejar errores 401 redirigiendo a login

### 2. Verificación de Email
- Usuarios no verificados pueden: ver contenido, votar
- Usuarios no verificados NO pueden: crear posts/comentarios
- Mostrar banner persistente para verificar email

### 3. Sistema de Roles
- Mostrar opciones de admin/moderador condicionalmente
- Validar permisos en el frontend antes de mostrar acciones

### 4. Manejo de Estados
- Loading states para todas las peticiones
- Optimistic updates para votos y likes
- Cache de datos frecuentes (categorías, canales)

### 5. Paginación
- Implementar scroll infinito o paginación tradicional
- Cachear páginas ya cargadas
- Mostrar indicadores de carga

### 6. Notificaciones
- Polling cada 30 segundos o WebSocket (futuro)
- Mostrar badge con contador de no leídas
- Sonido/vibración para nuevas notificaciones

### 7. Formularios
- Validación en tiempo real
- Mostrar errores del servidor
- Deshabilitar botones durante envío

### 8. SEO Consideraciones
- Posts públicos deberían ser indexables
- Metadatos Open Graph para compartir
- URLs amigables: `/posts/123/titulo-del-post`

## 🚀 Próximos Pasos

### Funcionalidades Pendientes
1. **ChannelMember**: Para implementar canales privados con membresía
2. **CommentReport**: Sistema de reportes y moderación avanzada
3. **Mensajes Privados**: Sistema de mensajería entre usuarios
4. **Búsqueda**: Búsqueda de posts, comentarios y usuarios
5. **Tags/Etiquetas**: Sistema de etiquetado de posts
6. **Menciones**: @usuario en comentarios
7. **Upload de Archivos**: Imágenes y archivos adjuntos

### Mejoras Técnicas
1. **Rate Limiting**: Limitar peticiones por usuario
2. **Caché Redis**: Para mejorar performance
3. **WebSockets**: Notificaciones en tiempo real
4. **CDN**: Para archivos estáticos
5. **Logs Estructurados**: Para mejor debugging
6. **Tests E2E**: Cobertura completa de tests

## 📞 Contacto y Soporte

Para cualquier duda sobre la implementación del frontend, considerar:

1. Los endpoints están diseñados para ser RESTful
2. Todos devuelven formato consistente: `{ success, data?, error?, message? }`
3. Usar interceptores para manejo global de errores
4. Implementar retry logic para errores de red
5. Considerar modo offline con sincronización

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Estado**: Producción Ready 🟢