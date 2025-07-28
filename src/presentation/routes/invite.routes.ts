import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class InviteRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // Generar código (solo admin/moderator)
    router.post('/generate', 
      AuthMiddleware.validateToken,
      deps.controllers.inviteController.generate.bind(deps.controllers.inviteController)
    );

    // Validar código (público - para el formulario de registro)
    router.post('/validate', 
      deps.controllers.inviteController.validate.bind(deps.controllers.inviteController)
    );
    
    return router;
  }
}