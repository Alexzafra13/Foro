import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class ChannelRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // GET /api/channels/:id - Ver información de un canal específico
    router.get('/:id', 
      AuthMiddleware.optionalAuth, // Opcional para canales públicos
      deps.controllers.channelController.getById.bind(deps.controllers.channelController)
    );
    
    return router;
  }
}