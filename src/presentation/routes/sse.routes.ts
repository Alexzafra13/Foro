import { Router } from 'express';
import { SSEController } from '../controllers/sse.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class SSERoutes {
  static getRoutes(): Router {
    const router = Router();
    const controller = new SSEController();

    // Stream de notificaciones
    router.get('/notifications',
      AuthMiddleware.validateToken,
      controller.notificationStream.bind(controller)
    );

    return router;
  }
}