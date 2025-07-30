import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';

export class PasswordResetRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // 🌐 RUTAS PÚBLICAS (no requieren autenticación)
    
    // POST /api/auth/request-password-reset - Solicitar reset de contraseña
    router.post('/request-password-reset', 
      deps.controllers.passwordResetController.requestReset.bind(deps.controllers.passwordResetController)
    );
    
    // POST /api/auth/reset-password - Completar reset de contraseña
    router.post('/reset-password', 
      deps.controllers.passwordResetController.resetPassword.bind(deps.controllers.passwordResetController)
    );
    
    return router;
  }
}