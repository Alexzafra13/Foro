// src/presentation/routes/post.routes.ts - COMPLETO CON TRACKING DE VISTAS
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class PostRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
   
    // 📋 POSTS CRUD - TODAS REQUIEREN AUTENTICACIÓN (FORO PRIVADO)
   
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
   
    // ✅ NUEVO: Ver estadísticas de vistas de un post → /api/posts/:id/stats
    router.get('/:id/stats',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getViewStats.bind(deps.controllers.postController)
    );
   
    // Crear post → /api/posts/
    router.post('/',
      AuthMiddleware.validateToken,
      deps.controllers.postController.create.bind(deps.controllers.postController)
    );

    // ✅ NUEVO: Trackear vista de post → /api/posts/:id/track-view
    router.post('/:id/track-view',
      AuthMiddleware.validateToken,
      deps.controllers.postController.trackView.bind(deps.controllers.postController)
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
      AuthMiddleware.validateToken,
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