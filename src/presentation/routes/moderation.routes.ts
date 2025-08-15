// src/presentation/routes/moderation.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { RoleMiddleware } from '../middlewares/role.middleware';

export class ModerationRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // Todas las rutas requieren autenticación
    router.use(AuthMiddleware.validateToken);

    // ===== GESTIÓN DE USUARIOS =====
    
    // POST /api/moderation/ban - Banear usuario (admin/moderator)
    router.post('/ban',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.ban.bind(deps.controllers.moderationController)
    );

    // POST /api/moderation/unban - Desbanear usuario (solo admin)
    router.post('/unban',
      RoleMiddleware.requireRole(['admin']),
      deps.controllers.moderationController.unban.bind(deps.controllers.moderationController)
    );

    // GET /api/moderation/banned-users - Listar usuarios baneados (admin/moderator)
    router.get('/banned-users',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getBanned.bind(deps.controllers.moderationController)
    );

    // ===== GESTIÓN DE COMENTARIOS MODERADOS =====
    
    // ✅ NUEVO: GET /api/moderation/comments - Listar comentarios moderados (admin/moderator)
    router.get('/comments',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getComments.bind(deps.controllers.moderationController)
    );

    // ✅ NUEVO: GET /api/moderation/stats - Estadísticas de moderación (admin/moderator)
    router.get('/stats',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getStats.bind(deps.controllers.moderationController)
    );

    return router;
  }
}