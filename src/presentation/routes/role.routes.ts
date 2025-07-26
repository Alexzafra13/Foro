import { Router } from 'express';
import { Dependencies } from '@/infrastructure/dependencies';

export class RoleRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    // Crear dependencias
    const deps = await Dependencies.create();
    
    // Configurar ruta GET /
    router.get('/', deps.controllers.roleController.getAllRoles.bind(deps.controllers.roleController));
    
    return router;
  }
}