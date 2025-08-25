// src/presentation/routes/moderation.routes.ts - COMPLETO CON TODAS LAS RUTAS
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
    
    // GET /api/moderation/comments - Listar comentarios moderados (admin/moderator)
    router.get('/comments',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getComments.bind(deps.controllers.moderationController)
    );

    // ===== GESTIÓN DE POSTS MODERADOS =====
    
    // GET /api/moderation/posts - Listar posts moderados (admin/moderator)
    router.get('/posts',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getPostsList.bind(deps.controllers.moderationController)
    );

    // GET /api/moderation/posts/stats - Estadísticas de moderación de posts (admin/moderator)
    router.get('/posts/stats',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getPostModerationStats.bind(deps.controllers.moderationController)
    );

    // ===== ESTADÍSTICAS GENERALES =====
    
    // GET /api/moderation/stats - Estadísticas generales de moderación (admin/moderator)
    router.get('/stats',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getStats.bind(deps.controllers.moderationController)
    );

    // GET /api/moderation/stats/comprehensive - Estadísticas completas (admin/moderator)
    router.get('/stats/comprehensive',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getComprehensiveStats.bind(deps.controllers.moderationController)
    );

    // ===== SISTEMA AVANZADO DE SANCIONES =====
    
    // GET /api/moderation/sanctions/stats - Estadísticas de sanciones (admin/moderator)
    router.get('/sanctions/stats',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getSanctionsStats.bind(deps.controllers.moderationController)
    );
    
    // POST /api/moderation/sanctions - Aplicar sanción (admin/moderator)
    router.post('/sanctions',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.applySanction.bind(deps.controllers.moderationController)
    );

    // POST /api/moderation/sanctions/:id/revoke - Revocar sanción (solo admin)
    router.post('/sanctions/:id/revoke',
      RoleMiddleware.requireRole(['admin']),
      deps.controllers.moderationController.revokeSanction.bind(deps.controllers.moderationController)
    );

    // GET /api/moderation/users/:id/sanctions - Obtener sanciones de usuario (admin/moderator)
    router.get('/users/:id/sanctions',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getUserSanctions.bind(deps.controllers.moderationController)
    );

    // GET /api/moderation/sanctions - Historial de sanciones (admin/moderator)
    router.get('/sanctions',
      RoleMiddleware.requireRole(['admin', 'moderator']),
      deps.controllers.moderationController.getSanctionsHistory.bind(deps.controllers.moderationController)
    );

    return router;
  }
}