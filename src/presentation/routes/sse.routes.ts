// src/presentation/routes/sse.routes.ts
import { Router } from 'express';
import { SSEController } from '../controllers/sse.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class SSERoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const controller = new SSEController();

    // 📡 Stream principal de notificaciones en tiempo real
    router.get('/notifications',
      AuthMiddleware.validateToken,  // Requiere autenticación
      controller.notificationStream.bind(controller)
    );

    // 📊 Estadísticas de conexiones SSE (solo para debugging/admin)
    router.get('/stats',
      AuthMiddleware.validateToken,
      controller.getConnectionStats.bind(controller)
    );

    return router;
  }
}