// src/presentation/routes/post.routes.ts - COMPLETO
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class PostRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
   
    // 📋 POSTS CRUD
    
    // Ver posts → /api/posts/
    router.get('/',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getMany.bind(deps.controllers.postController)
    );
   
    // Ver post individual → /api/posts/:id
    router.get('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getById.bind(deps.controllers.postController)
    );
    
    // Crear post → /api/posts/
    router.post('/',
      AuthMiddleware.validateToken,
      deps.controllers.postController.create.bind(deps.controllers.postController)
    );
   
    // Editar post → /api/posts/:id
    router.put('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.postController.update.bind(deps.controllers.postController)
    );
   
    // Eliminar post → /api/posts/:id
    router.delete('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.postController.delete.bind(deps.controllers.postController)
    );

    // 💬 COMENTARIOS DE POSTS
    
    // Crear comentario en post → /api/posts/:postId/comments
    router.post('/:postId/comments',
      AuthMiddleware.validateToken,
      deps.controllers.commentController.create.bind(deps.controllers.commentController)
    );
   
    // Listar comentarios de post → /api/posts/:postId/comments
    router.get('/:postId/comments',
      AuthMiddleware.optionalAuth,
      deps.controllers.commentController.getByPostId.bind(deps.controllers.commentController)
    );

    // 🗳️ VOTOS EN POSTS
    
    // Votar en post → /api/posts/:id/vote
    router.post('/:id/vote',
      AuthMiddleware.validateToken,
      deps.controllers.voteController.votePost.bind(deps.controllers.voteController)
    );
   
    return router;
  }
}