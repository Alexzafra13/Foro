import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class CategoryRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // GET /api/categories - Ver todas las categorías con sus canales
    router.get('/', 
      AuthMiddleware.optionalAuth, // Opcional: mejor experiencia si está logueado
      deps.controllers.categoryController.getAll.bind(deps.controllers.categoryController)
    );
    
    return router;
  }
}