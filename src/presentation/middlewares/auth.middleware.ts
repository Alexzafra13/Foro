// src/presentation/middlewares/auth.middleware.ts - CORREGIDO
import { Request, Response, NextFunction } from "express";
import { JwtAdapter } from "../../config/jwt.adapter";
import { AuthErrors } from "../../shared/errors";
import { Dependencies } from "../../infrastructure/dependencies";

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        isEmailVerified?: boolean;
        role?: string;  // ✅ CAMBIADO: ahora es string, no objeto
      };
    }
  }
}

export class AuthMiddleware {
  static async validateToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Obtener token del header
      const authorization = req.headers.authorization;
      if (!authorization) {
        throw AuthErrors.tokenRequired();
      }

      // Verificar formato Bearer token
      if (!authorization.startsWith("Bearer ")) {
        throw AuthErrors.invalidToken();
      }

      // Extraer token
      const token = authorization.split(" ")[1];
      if (!token) {
        throw AuthErrors.invalidToken();
      }

      // Validar token
      const payload = JwtAdapter.validateToken<{ userId: number; email: string }>(token);
      if (!payload) {
        throw AuthErrors.invalidToken();
      }

      // Obtener información completa del usuario para verificación de email
      try {
        const deps = await Dependencies.create();
        const user = await deps.repositories.userRepository.findById(payload.userId);
        
        if (!user) {
          throw AuthErrors.invalidToken();
        }

        // Agregar usuario al request CON información de verificación
        req.user = {
          userId: user.id,
          email: user.email,
          isEmailVerified: user.isEmailVerified || false,
          role: user.role?.name  // ✅ CAMBIADO: extraer el name del role
        };
      } catch (dbError) {
        // Si falla la consulta a BD, usar solo datos del JWT (fallback)
        console.warn('Error fetching user details, using JWT payload only:', dbError);
        req.user = {
          userId: payload.userId,
          email: payload.email,
          isEmailVerified: false
        };
      }

      next();
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        return res.status((error as any).statusCode).json({
          success: false,
          error: error.message,
        });
      }
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }
  }

  // Middleware opcional para rutas que pueden o no tener autenticación
  static async optionalAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return next();
    }

    const token = authorization.split(" ")[1];
    if (token) {
      const payload = JwtAdapter.validateToken<{
        userId: number;
        email: string;
      }>(token);
      
      if (payload) {
        // También obtener info completa para auth opcional
        try {
          const deps = await Dependencies.create();
          const user = await deps.repositories.userRepository.findById(payload.userId);
          
          if (user) {
            req.user = {
              userId: user.id,
              email: user.email,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role?.name  // ✅ CAMBIADO: extraer el name del role
            };
          }
        } catch (dbError) {
          // Fallback a datos del JWT
          req.user = {
            userId: payload.userId,
            email: payload.email,
            isEmailVerified: false
          };
        }
      }
    }

    next();
  }
}