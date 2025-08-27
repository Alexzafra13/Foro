// src/presentation/routes/public-profile.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class PublicProfileRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // GET /api/users/public/:username - Obtener perfil público de cualquier usuario
    // Esta ruta NO requiere autenticación, pero si el usuario está autenticado
    // se puede usar esa información para determinar permisos
    router.get('/public/:username',
      AuthMiddleware.optionalAuth, // Middleware que obtiene el usuario si está autenticado, pero no falla si no lo está
      deps.controllers.publicProfileController.getPublicProfile.bind(deps.controllers.publicProfileController)
    );

    return router;
  }
}

// NOTA: El middleware AuthMiddleware.optionalAuth debe existir en tu proyecto
// Si no existe, créalo o usa un middleware alternativo