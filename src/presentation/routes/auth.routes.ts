// src/presentation/routes/auth.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';

export class AuthRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    const deps = await Dependencies.create();
    
    router.post('/register', deps.controllers.authController.register.bind(deps.controllers.authController));
    router.post('/login', deps.controllers.authController.login.bind(deps.controllers.authController));
    
    return router;
  }
}