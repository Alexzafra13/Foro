// src/presentation/middlewares/auth.middleware.ts - CORREGIDO CON SOPORTE SSE
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
      let token: string | undefined;

      // ✅ MODIFICADO: Obtener token del header O query parameter (para SSE)
      const authorization = req.headers.authorization;
      const queryToken = req.query.token as string;

      if (authorization && authorization.startsWith("Bearer ")) {
        // Token del header (método normal)
        token = authorization.split(" ")[1];
      } else if (queryToken) {
        // Token del query parameter (para SSE)
        token = queryToken;
        console.log('🔑 Using token from query parameter for SSE');
      }

      if (!token) {
        throw AuthErrors.tokenRequired();
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

        console.log(`✅ Token validated for user ${user.id} (${user.email}) via ${queryToken ? 'query' : 'header'}`);
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
      console.error('❌ Auth middleware error:', error);
      
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
    const queryToken = req.query.token as string;
    let token: string | undefined;

    // ✅ MODIFICADO: También soportar query token en auth opcional
    if (authorization && authorization.startsWith("Bearer ")) {
      token = authorization.split(" ")[1];
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      return next();
    }

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

    next();
  }
}