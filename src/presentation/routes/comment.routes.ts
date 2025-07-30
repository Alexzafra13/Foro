import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class CommentRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // 📝 CREAR comentario en un post
    router.post('/posts/:postId/comments', 
      AuthMiddleware.validateToken,
      deps.controllers.commentController.create.bind(deps.controllers.commentController)
    );
    
    // 👀 LISTAR comentarios de un post
    router.get('/posts/:postId/comments', 
      AuthMiddleware.optionalAuth, // Opcional: permite ver sin login
      deps.controllers.commentController.getByPostId.bind(deps.controllers.commentController)
    );
    
    // ✏️ EDITAR comentario específico
    router.put('/comments/:id', 
      AuthMiddleware.validateToken, // Requiere autenticación
      deps.controllers.commentController.update.bind(deps.controllers.commentController)
    );
    
    // 🗑️ ELIMINAR comentario específico
    router.delete('/comments/:id', 
      AuthMiddleware.validateToken, // Requiere autenticación
      deps.controllers.commentController.delete.bind(deps.controllers.commentController)
    );
    
    // 💬 VER respuestas de un comentario específico (futuro)
    router.get('/comments/:id/replies', 
      AuthMiddleware.optionalAuth,
      deps.controllers.commentController.getReplies.bind(deps.controllers.commentController)
    );
    
    return router;
  }
}