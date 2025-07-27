import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class UserRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    // Ruta protegida - requiere autenticación
    router.get('/profile', 
      AuthMiddleware.validateToken,
      async (req, res) => {
        // req.user está disponible aquí gracias al middleware
        res.json({
          success: true,
          data: {
            userId: req.user?.userId,
            email: req.user?.email,
            message: 'This is a protected route!'
          }
        });
      }
    );

    return router;
  }
}