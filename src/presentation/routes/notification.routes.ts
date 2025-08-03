// src/presentation/routes/notification.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class NotificationRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // Todas las rutas requieren autenticación
    router.use(AuthMiddleware.validateToken);

    // GET /api/notifications - Obtener todas las notificaciones del usuario
    router.get('/',
      deps.controllers.notificationController.getMany.bind(deps.controllers.notificationController)
    );

    // GET /api/notifications/unread - Obtener solo notificaciones no leídas
    router.get('/unread',
      deps.controllers.notificationController.getUnread.bind(deps.controllers.notificationController)
    );

    // PUT /api/notifications/read-all - Marcar todas como leídas
    router.put('/read-all',
      deps.controllers.notificationController.markAllAsRead.bind(deps.controllers.notificationController)
    );

    // PUT /api/notifications/:id/read - Marcar una notificación como leída
    router.put('/:id/read',
      deps.controllers.notificationController.markAsRead.bind(deps.controllers.notificationController)
    );

    router.post('/',
  deps.controllers.notificationController.create.bind(deps.controllers.notificationController)
);

    // POST /api/notifications/test - Crear notificación de prueba (solo desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      router.post('/test',
        deps.controllers.notificationController.createTest.bind(deps.controllers.notificationController)
      );
    }

    return router;
  }
}