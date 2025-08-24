// src/presentation/middlewares/auth.middleware.ts - COMPLETO CON USERNAME
import { Request, Response, NextFunction } from "express";
import { JwtAdapter } from "../../config/jwt.adapter";
import { AuthErrors } from "../../shared/errors";
import { Dependencies } from "../../infrastructure/dependencies";

// ✅ INTERFAZ ACTUALIZADA CON USERNAME
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        username: string;        // ✅ AGREGADO
        isEmailVerified?: boolean;
        role?: string;
      };
    }
  }
}

export class AuthMiddleware {
  static async validateToken(req: Request, res: Response, next: NextFunction) {
    try {
      let token: string | undefined;

      // ✅ SOPORTE PARA SSE: Token del header O query parameter
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

      // Obtener información completa del usuario
      try {
        const deps = await Dependencies.create();
        const user = await deps.repositories.userRepository.findById(payload.userId);
        
        if (!user) {
          throw AuthErrors.invalidToken();
        }

        // ✅ AGREGAR USUARIO AL REQUEST CON USERNAME
        req.user = {
          userId: user.id,
          email: user.email,
          username: user.username,           // ✅ AGREGADO
          isEmailVerified: user.isEmailVerified || false,
          role: user.role?.name
        };

        console.log(`✅ Token validated for user ${user.id} (${user.username}) via ${queryToken ? 'query' : 'header'}`);
      } catch (dbError) {
        // Si falla la consulta a BD, usar solo datos del JWT (fallback)
        console.warn('Error fetching user details, using JWT payload only:', dbError);
        req.user = {
          userId: payload.userId,
          email: payload.email,
          username: 'Usuario',               // ✅ FALLBACK
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

  // ✅ MIDDLEWARE OPCIONAL TAMBIÉN ACTUALIZADO
  static async optionalAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    const queryToken = req.query.token as string;
    let token: string | undefined;

    // Soporte para query token en auth opcional
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
      // Obtener info completa para auth opcional
      try {
        const deps = await Dependencies.create();
        const user = await deps.repositories.userRepository.findById(payload.userId);
        
        if (user) {
          req.user = {
            userId: user.id,
            email: user.email,
            username: user.username,         // ✅ AGREGADO
            isEmailVerified: user.isEmailVerified || false,
            role: user.role?.name
          };
        }
      } catch (dbError) {
        // Fallback a datos del JWT
        req.user = {
          userId: payload.userId,
          email: payload.email,
          username: 'Usuario',               // ✅ FALLBACK
          isEmailVerified: false
        };
      }
    }

    next();
  }
}