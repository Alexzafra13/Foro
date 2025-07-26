import { Router } from 'express';
import { Dependencies } from '@/infrastructure/dependencies';

export class RoleRoutes {
  static get routes(): Router {
    const router = Router();
    
    // Aquí inyectarías las dependencias
    // Por ahora lo dejamos como comentario para que veas la estructura
    // const roleController = new RoleController(getRolesUseCase);
    
    // router.get('/', roleController.getAllRoles.bind(roleController));
    
    return router;
  }
}