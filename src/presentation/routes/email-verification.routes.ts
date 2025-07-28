
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class EmailVerificationRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    // Verificar email (público - no requiere autenticación)
    router.post('/verify-email', 
      deps.controllers.emailVerificationController.verify.bind(deps.controllers.emailVerificationController)
    );

    // Reenviar email de verificación (requiere autenticación)
    router.post('/resend-verification', 
      AuthMiddleware.validateToken,
      deps.controllers.emailVerificationController.resendVerification.bind(deps.controllers.emailVerificationController)
    );

    // Estado de verificación (requiere autenticación)
    router.get('/verification-status', 
      AuthMiddleware.validateToken,
      deps.controllers.emailVerificationController.getVerificationStatus.bind(deps.controllers.emailVerificationController)
    );
    
    return router;
  }
}