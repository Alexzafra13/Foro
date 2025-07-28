// API_USAGE_EXAMPLES.md
// Ejemplos de uso de la API del Foro con códigos de invitación

// ======================================
// 1. FLUJO COMPLETO: ADMIN → INVITACIÓN → REGISTRO → POSTS
// ======================================

// PASO 1: Admin genera un código de invitación
POST http://localhost:3000/api/invites/generate
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "customCode": "WELCOME-2024" // Opcional
}

// Respuesta:
{
  "success": true,
  "data": {
    "code": "WELCOME-2024",
    "createdBy": 1,
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-22T10:00:00Z",
    "creator": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "Invite code generated successfully"
}

// PASO 2: Usuario valida el código antes de registrarse (opcional, para UX)
POST http://localhost:3000/api/invites/validate
Content-Type: application/json

{
  "code": "WELCOME-2024"
}

// Respuesta:
{
  "success": true,
  "data": {
    "isValid": true,
    "code": "WELCOME-2024",
    "isUsed": false,
    "isExpired": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-22T10:00:00Z",
    "creator": {
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "Invite code is valid"
}

// PASO 3: Usuario se registra usando el código
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "nuevo_usuario",
  "email": "nuevo@ejemplo.com",
  "password": "mipassword123",
  "inviteCode": "WELCOME-2024"
}

// Respuesta:
{
  "success": true,
  "data": {
    "user": {
      "id": 15,
      "username": "nuevo_usuario",
      "email": "nuevo@ejemplo.com",
      "role": {
        "id": 3,
        "name": "user"
      },
      "reputation": 0,
      "createdAt": "2024-01-15T11:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "inviteCodeUsed": "WELCOME-2024"
  },
  "message": "User registered successfully"
}

// PASO 4: Usuario autenticado crea su primer post
POST http://localhost:3000/api/posts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "channelId": 1,
  "title": "¡Hola, soy nuevo en el foro!",
  "content": "Me acabo de registrar y quería presentarme. Espero aprender mucho aquí y contribuir a la comunidad. ¿Algún consejo para un principiante?"
}

// Respuesta:
{
  "success": true,
  "data": {
    "id": 42,
    "channelId": 1,
    "title": "¡Hola, soy nuevo en el foro!",
    "content": "Me acabo de registrar y quería presentarme...",
    "isLocked": false,
    "isPinned": false,
    "createdAt": "2024-01-15T11:15:00Z",
    "author": {
      "id": 15,
      "username": "nuevo_usuario",
      "reputation": 0,
      "role": {
        "id": 3,
        "name": "user"
      }
    },
    "channel": {
      "id": 1,
      "name": "general",
      "isPrivate": false
    }
  },
  "message": "Post created successfully"
}

// ======================================
// 2. GESTIÓN DE POSTS
// ======================================

// Obtener lista de posts (público)
GET http://localhost:3000/api/posts?page=1&limit=20&channelId=1&sortBy=createdAt&sortOrder=desc

// Respuesta:
{
  "success": true,
  "data": [
    {
      "id": 42,
      "channelId": 1,
      "title": "¡Hola, soy nuevo en el foro!",
      "content": "Me acabo de registrar y quería presentarme. Espero aprender mucho aquí...", // Truncado
      "isLocked": false,
      "isPinned": false,
      "createdAt": "2024-01-15T11:15:00Z",
      "updatedAt": null,
      "author": {
        "id": 15,
        "username": "nuevo_usuario",
        "reputation": 0
      },
      "channel": {
        "id": 1,
        "name": "general"
      },
      "stats": {
        "comments": 0,
        "votes": 0,
        "voteScore": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "message": "Found 1 posts"
}

// Obtener post individual con detalles completos
GET http://localhost:3000/api/posts/42
Authorization: Bearer <user_jwt_token> // Opcional

// Respuesta:
{
  "success": true,
  "data": {
    "id": 42,
    "channelId": 1,
    "title": "¡Hola, soy nuevo en el foro!",
    "content": "Me acabo de registrar y quería presentarme. Espero aprender mucho aquí y contribuir a la comunidad. ¿Algún consejo para un principiante?",
    "isLocked": false,
    "isPinned": false,
    "createdAt": "2024-01-15T11:15:00Z",
    "updatedAt": null,
    "author": {
      "id": 15,
      "username": "nuevo_usuario",
      "reputation": 0,
      "role": {
        "id": 3,
        "name": "user"
      }
    },
    "channel": {
      "id": 1,
      "name": "general",
      "isPrivate": false
    },
    "stats": {
      "comments": 0,
      "votes": 0,
      "voteScore": 0
    },
    "permissions": {
      "canEdit": true,
      "canDelete": true,
      "canVote": false,
      "canComment": true
    }
  },
  "message": "Post retrieved successfully"
}

// Editar post (solo el autor o admin/moderator)
PUT http://localhost:3000/api/posts/42
Authorization: Bearer <author_jwt_token>
Content-Type: application/json

{
  "title": "¡Hola, soy nuevo en el foro! [EDITADO]",
  "content": "Me acabo de registrar y quería presentarme. Espero aprender mucho aquí y contribuir a la comunidad. ¿Algún consejo para un principiante?\n\nEDIT: Gracias por la bienvenida!"
}

// Respuesta:
{
  "success": true,
  "data": {
    "id": 42,
    "title": "¡Hola, soy nuevo en el foro! [EDITADO]",
    "content": "Me acabo de registrar y quería presentarme. Espero aprender mucho aquí y contribuir a la comunidad. ¿Algún consejo para un principiante?\n\nEDIT: Gracias por la bienvenida!",
    "isLocked": false,
    "isPinned": false,
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Post updated successfully"
}

// Moderador destaca el post
PUT http://localhost:3000/api/posts/42
Authorization: Bearer <moderator_jwt_token>
Content-Type: application/json

{
  "isPinned": true
}

// ======================================
// 3. CASOS DE ERROR COMUNES
// ======================================

// Error: Intento de registro sin código de invitación
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "usuario_sin_codigo",
  "email": "sin_codigo@ejemplo.com",
  "password": "password123"
  // inviteCode: FALTA
}

// Respuesta (400):
{
  "success": false,
  "error": "Invite code is required",
  "code": "DomainError"
}

// Error: Código de invitación ya usado
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "usuario_tarde",
  "email": "tarde@ejemplo.com",
  "password": "password123",
  "inviteCode": "WELCOME-2024" // Ya usado
}

// Respuesta (409):
{
  "success": false,
  "error": "Invite code 'WELCOME-2024' was already used by nuevo_usuario on 1/15/2024",
  "code": "DomainError"
}

// Error: Usuario normal intentando generar código
POST http://localhost:3000/api/invites/generate
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{}

// Respuesta (403):
{
  "success": false,
  "error": "Insufficient permissions for this action",
  "code": "DomainError"
}

// Error: Intento de editar post de otro usuario
PUT http://localhost:3000/api/posts/42
Authorization: Bearer <other_user_jwt_token>
Content-Type: application/json

{
  "title": "Intentando hackear"
}

// Respuesta (403):
{
  "success": false,
  "error": "Insufficient permissions for this action",
  "code": "DomainError"
}

// ======================================
// 4. BÚSQUEDA Y FILTROS
// ======================================

// Buscar posts por texto
GET http://localhost:3000/api/posts?search=presentarme&page=1&limit=10

// Posts de un canal específico
GET http://localhost:3000/api/posts?channelId=1&sortBy=voteScore&sortOrder=desc

// Posts de un autor específico
GET http://localhost:3000/api/posts?authorId=15&page=1&limit=5

// Posts destacados primero
GET http://localhost:3000/api/posts?sortBy=createdAt&sortOrder=desc
// (Los posts con isPinned=true aparecen primero automáticamente)

// ======================================
// 5. FLUJO DE AUTENTICACIÓN
// ======================================

// Login (sin cambios)
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "nuevo@ejemplo.com",
  "password": "mipassword123"
}

// Respuesta:
{
  "success": true,
  "data": {
    "user": {
      "id": 15,
      "username": "nuevo_usuario",
      "email": "nuevo@ejemplo.com",
      "role": {
        "id": 3,
        "name": "user"
      },
      "reputation": 0,
      "createdAt": "2024-01-15T11:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}

// ======================================
// 6. CÓDIGOS DE ESTADO HTTP
// ======================================

/*
200 - OK (GET, PUT exitosos)
201 - Created (POST exitosos)
400 - Bad Request (validación fallida)
401 - Unauthorized (sin token o token inválido)
403 - Forbidden (sin permisos)
404 - Not Found (recurso no encontrado)
409 - Conflict (email/username/código ya existe)
410 - Gone (código expirado)  
422 - Unprocessable Entity (datos válidos pero lógica de negocio falla)
500 - Internal Server Error
*/