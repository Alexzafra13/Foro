import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class ProfileRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
    
    // GET /api/users/profile - Obtener perfil del usuario actual
    router.get('/profile', 
      AuthMiddleware.validateToken,
      deps.controllers.profileController.getProfile.bind(deps.controllers.profileController)
    );
    
    // PUT /api/users/profile - Actualizar perfil del usuario actual
    router.put('/profile', 
      AuthMiddleware.validateToken,
      deps.controllers.profileController.updateProfile.bind(deps.controllers.profileController)
    );
    
    // PUT /api/users/password - Cambiar contraseña (usuario autenticado)
    router.put('/password', 
      AuthMiddleware.validateToken,
      deps.controllers.profileController.changePassword.bind(deps.controllers.profileController)
    );
    
    // GET /api/users/settings - Obtener configuraciones del usuario
    router.get('/settings', 
      AuthMiddleware.validateToken,
      deps.controllers.settingsController.getSettings.bind(deps.controllers.settingsController)
    );
    
    // PUT /api/users/settings - Actualizar configuraciones del usuario
    router.put('/settings', 
      AuthMiddleware.validateToken,
      deps.controllers.settingsController.updateSettings.bind(deps.controllers.settingsController)
    );
    
    return router;
  }
}