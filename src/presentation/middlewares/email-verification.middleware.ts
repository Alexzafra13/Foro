// src/presentation/middlewares/email-verification.middleware.ts

import { Request, Response, NextFunction } from 'express';

export class EmailVerificationMiddleware {
  
  /**
   * Middleware que requiere que el email esté verificado
   * Solo permite continuar si el usuario tiene email verificado
   */
  static requireEmailVerified = (req: Request, res: Response, next: NextFunction) => {
    // Verificar que hay un usuario autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Verificar que el email está verificado
    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email verification required to perform this action',
        code: 'EMAIL_NOT_VERIFIED',
        action: 'verify_email',
        message: 'Please verify your email address to access this feature'
      });
    }

    // Email verificado, continuar
    next();
  };

  /**
   * Middleware más estricto para acciones sensibles como eliminar
   * Igual que requireEmailVerified pero con mensaje más enfático
   */
  static requireEmailVerifiedStrict = (req: Request, res: Response, next: NextFunction) => {
    // Verificar que hay un usuario autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Verificar que el email está verificado
    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Verified email required for this sensitive action',
        code: 'EMAIL_VERIFICATION_REQUIRED_STRICT',
        action: 'verify_email',
        message: 'For security reasons, this action requires a verified email address'
      });
    }

    // Email verificado, continuar
    next();
  };

  /**
   * Middleware más permisivo - solo advierte pero no bloquea
   * Útil para funciones que queremos desalentar pero no bloquear completamente
   */
  static warnIfEmailNotVerified = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && !req.user.isEmailVerified) {
      // Agregar header de advertencia
      res.setHeader('X-Email-Verification-Warning', 'true');
    }
    next();
  };
}