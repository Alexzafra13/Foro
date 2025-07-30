// src/presentation/routes/comment.routes.ts - REORGANIZADO
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class CommentRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
   
    // ✅ SOLO rutas que empiecen con /comments
    // Estas se registrarán como /api/comments/*
   
    // ✏️ EDITAR comentario específico → /api/comments/:id
    router.put('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.commentController.update.bind(deps.controllers.commentController)
    );
   
    // 🗑️ ELIMINAR comentario específico → /api/comments/:id  
    router.delete('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.commentController.delete.bind(deps.controllers.commentController)
    );
   
    // 💬 VER respuestas de un comentario → /api/comments/:id/replies
    router.get('/:id/replies',
      AuthMiddleware.optionalAuth,
      deps.controllers.commentController.getReplies.bind(deps.controllers.commentController)
    );

    // ✅ NUEVO: Votar en comentarios → /api/comments/:id/vote
    router.post('/:id/vote',
      AuthMiddleware.validateToken,
      deps.controllers.voteController.voteComment.bind(deps.controllers.voteController)
    );
   
    return router;
  }
}