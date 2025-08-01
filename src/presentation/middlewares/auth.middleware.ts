import { Request, Response, NextFunction } from "express";
import { JwtAdapter } from "../../config/jwt.adapter";
import { AuthErrors } from "../../shared/errors";

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role?: {
          id: number;
          name: string;
        };
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

      // Agregar usuario al request
      req.user = payload;

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
        req.user = payload;
      }
    }

    next();
  }
}
