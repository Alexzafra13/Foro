// src/presentation/routes/post.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class PostRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // 🔒 TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN
    
    // Ver posts - AHORA PRIVADO
    router.get('/', 
      AuthMiddleware.validateToken,
      deps.controllers.postController.getMany.bind(deps.controllers.postController)
    );
    
    // Ver post individual - AHORA PRIVADO  
    router.get('/:id', 
      AuthMiddleware.validateToken,
      deps.controllers.postController.getById.bind(deps.controllers.postController) // ✅ CORREGIDO
    );

    // Crear post - YA ERA PRIVADO
    router.post('/', 
      AuthMiddleware.validateToken,
      deps.controllers.postController.create.bind(deps.controllers.postController)
    );
    
    // Editar post - YA ERA PRIVADO
    router.put('/:id', 
      AuthMiddleware.validateToken,
      deps.controllers.postController.update.bind(deps.controllers.postController)
    );
    
    // Eliminar post - YA ERA PRIVADO
    router.delete('/:id', 
      AuthMiddleware.validateToken,
      deps.controllers.postController.delete.bind(deps.controllers.postController)
    );
    
    return router;
  }
}