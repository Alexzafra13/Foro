// src/presentation/routes/user.routes.ts - CON BÚSQUEDA DE USUARIOS
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class UserRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // ✅ NUEVA RUTA: Búsqueda de usuarios (requiere autenticación)
    // GET /api/users/search?q=query&limit=10&excludeCurrentUser=true&onlyModeratable=false
    router.get('/search',
      AuthMiddleware.validateToken, // Requiere estar autenticado
      deps.controllers.userSearchController.searchUsers.bind(deps.controllers.userSearchController)
    );

    // ✅ FUTURAS RUTAS DE USUARIOS PÚBLICOS:
    // - Listado público de usuarios
    // - Estadísticas de usuarios
    // - Perfiles públicos de usuarios
    // etc.
    
    // 📝 NOTA: Las rutas de perfil personal están en ProfileRoutes
    
    return router;
  }
}