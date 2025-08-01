// src/presentation/routes/post.routes.ts - COMPLETO CON VERIFICACIÓN DE EMAIL

import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { EmailVerificationMiddleware } from '../middlewares/email-verification.middleware';

export class PostRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
   
    // 📋 POSTS CRUD - TODAS REQUIEREN AUTENTICACIÓN (FORO PRIVADO)
   
    // Ver posts → /api/posts/ (SOLO AUTENTICACIÓN - no requiere email verificado)
    router.get('/',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getMany.bind(deps.controllers.postController)
    );
   
    // Ver post individual → /api/posts/:id (SOLO AUTENTICACIÓN - no requiere email verificado)
    router.get('/:id',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getById.bind(deps.controllers.postController)
    );
   
    // Ver estadísticas de vistas de un post → /api/posts/:id/stats (SOLO AUTENTICACIÓN)
    router.get('/:id/stats',
      AuthMiddleware.validateToken,
      deps.controllers.postController.getViewStats.bind(deps.controllers.postController)
    );
   
    // Crear post → /api/posts/ (✅ REQUIERE EMAIL VERIFICADO)
    router.post('/',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← NUEVO
      deps.controllers.postController.create.bind(deps.controllers.postController)
    );

    // Trackear vista de post → /api/posts/:id/track-view (SOLO AUTENTICACIÓN - permitir sin verificar)
    router.post('/:id/track-view',
      AuthMiddleware.validateToken,
      deps.controllers.postController.trackView.bind(deps.controllers.postController)
    );
   
    // Editar post → /api/posts/:id (✅ REQUIERE EMAIL VERIFICADO)
    router.put('/:id',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← NUEVO
      deps.controllers.postController.update.bind(deps.controllers.postController)
    );
   
    // Eliminar post → /api/posts/:id (✅ REQUIERE EMAIL VERIFICADO - ESTRICTO)
    router.delete('/:id',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerifiedStrict, // ← NUEVO (más estricto para eliminar)
      deps.controllers.postController.delete.bind(deps.controllers.postController)
    );

    // 💬 COMENTARIOS DE POSTS
   
    // Crear comentario en post → /api/posts/:postId/comments (✅ REQUIERE EMAIL VERIFICADO)
    router.post('/:postId/comments',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← NUEVO
      deps.controllers.commentController.create.bind(deps.controllers.commentController)
    );
   
    // Listar comentarios de post → /api/posts/:postId/comments (SOLO AUTENTICACIÓN)
    router.get('/:postId/comments',
      AuthMiddleware.validateToken,
      deps.controllers.commentController.getByPostId.bind(deps.controllers.commentController)
    );

    // 🗳️ VOTOS EN POSTS
   
    // Votar en post → /api/posts/:id/vote (✅ REQUIERE EMAIL VERIFICADO)
    router.post('/:id/vote',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← NUEVO
      deps.controllers.voteController.votePost.bind(deps.controllers.voteController)
    );
   
    return router;
  }
}