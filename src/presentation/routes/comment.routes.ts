// src/presentation/routes/comment.routes.ts - REORGANIZADO CON VERIFICACIÓN

import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { EmailVerificationMiddleware } from '../middlewares/email-verification.middleware';

export class CommentRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
   
    // ✅ SOLO rutas que empiecen con /comments
    // Estas se registrarán como /api/comments/*
   
    // ✏️ EDITAR comentario específico → /api/comments/:id (✅ REQUIERE EMAIL VERIFICADO)
    router.put('/:id',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← AGREGADO
      deps.controllers.commentController.update.bind(deps.controllers.commentController)
    );
   
    // 🗑️ ELIMINAR comentario específico → /api/comments/:id (✅ REQUIERE EMAIL VERIFICADO)
    router.delete('/:id',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← AGREGADO
      deps.controllers.commentController.delete.bind(deps.controllers.commentController)
    );
   
    // 💬 VER respuestas de un comentario → /api/comments/:id/replies (SIN VERIFICACIÓN - solo lectura)
    router.get('/:id/replies',
      AuthMiddleware.optionalAuth,
      deps.controllers.commentController.getReplies.bind(deps.controllers.commentController)
    );

    // 🗳️ VOTAR en comentarios → /api/comments/:id/vote (✅ REQUIERE EMAIL VERIFICADO)
    router.post('/:id/vote',
      AuthMiddleware.validateToken,
      EmailVerificationMiddleware.requireEmailVerified, // ← AGREGADO
      deps.controllers.voteController.voteComment.bind(deps.controllers.voteController)
    );
   
    return router;
  }
}