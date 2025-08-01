// src/presentation/routes/invite.routes.ts - ACTUALIZADO CON TODAS LAS RUTAS

import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class InviteRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // ===== RUTAS PÚBLICAS =====
    
    // POST /api/invites/validate - Validar código (público - para registro)
    router.post('/validate', 
      deps.controllers.inviteController.validate.bind(deps.controllers.inviteController)
    );
    
    // ===== RUTAS PROTEGIDAS PARA ADMIN/MODERATOR =====
    
    // POST /api/invites/generate - Generar código (solo admin/moderator)
    router.post('/generate', 
      AuthMiddleware.validateToken,
      deps.controllers.inviteController.generate.bind(deps.controllers.inviteController)
    );

    // GET /api/invites - Listar códigos (solo admin/moderator)
    router.get('/', 
      AuthMiddleware.validateToken,
      deps.controllers.inviteController.getList.bind(deps.controllers.inviteController)
    );

    // GET /api/invites/stats - Estadísticas (solo admin/moderator)
    router.get('/stats', 
      AuthMiddleware.validateToken,
      deps.controllers.inviteController.getStats.bind(deps.controllers.inviteController)
    );

    // DELETE /api/invites/:code - Eliminar código (solo admin)
    router.delete('/:code', 
      AuthMiddleware.validateToken,
      deps.controllers.inviteController.delete.bind(deps.controllers.inviteController)
    );
    
    return router;
  }
}