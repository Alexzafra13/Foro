// src/presentation/routes/user.routes.ts - CORREGIDO CON PERFIL PÚBLICO
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class UserRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // ✅ RUTA DE BÚSQUEDA DE USUARIOS (requiere autenticación)
    // GET /api/users/search?q=query&limit=10&excludeCurrentUser=true&onlyModeratable=false
    router.get('/search',
      AuthMiddleware.validateToken, // Requiere estar autenticado
      deps.controllers.userSearchController.searchUsers.bind(deps.controllers.userSearchController)
    );

    // ✅ NUEVA RUTA: Perfil público por username (PÚBLICO - no requiere auth)
    // GET /api/users/public/:username
    router.get('/public/:username',
      AuthMiddleware.optionalAuth, // Middleware opcional para obtener info del usuario si está logueado
      deps.controllers.publicProfileController.getPublicProfile.bind(deps.controllers.publicProfileController)
    );

    // ✅ FUTURAS RUTAS DE USUARIOS PÚBLICOS:
    // - Listado público de usuarios activos
    // - Estadísticas públicas de usuarios
    // - etc.
    
    // 📝 NOTA: Las rutas de perfil personal están en ProfileRoutes
    
    return router;
  }
}