// src/presentation/routes/comment.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class CommentRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
    
    // Crear comentario en un post
    router.post('/posts/:postId/comments', 
      AuthMiddleware.validateToken,
      deps.controllers.commentController.create.bind(deps.controllers.commentController)
    );
    
    // Listar comentarios de un post
    router.get('/posts/:postId/comments', 
      AuthMiddleware.optionalAuth, // Opcional: permite ver sin login pero sin votos de usuario
      deps.controllers.commentController.getByPostId.bind(deps.controllers.commentController)
    );
    
    // Ver respuestas de un comentario específico
    router.get('/comments/:id/replies', 
      AuthMiddleware.optionalAuth,
      deps.controllers.commentController.getReplies.bind(deps.controllers.commentController)
    );
    
    return router;
  }
}