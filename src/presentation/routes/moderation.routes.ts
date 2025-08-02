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

    return router;
  }
}