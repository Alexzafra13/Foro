import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class VoteRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();
    
    // Votar en posts
    router.post('/posts/:id/vote', 
      AuthMiddleware.validateToken,
      deps.controllers.voteController.votePost.bind(deps.controllers.voteController)
    );
    
    // Votar en comentarios
    router.post('/comments/:id/vote', 
      AuthMiddleware.validateToken,
      deps.controllers.voteController.voteComment.bind(deps.controllers.voteController)
    );
    
    return router;
  }
}