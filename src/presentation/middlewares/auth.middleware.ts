// src/presentation/middlewares/auth.middleware.ts - COMPLETO CON SANCIONES Y USERNAME
import { Request, Response, NextFunction } from "express";
import { JwtAdapter } from "../../config/jwt.adapter";
import { AuthErrors } from "../../shared/errors";
import { Dependencies } from "../../infrastructure/dependencies";

// ✅ INTERFAZ COMPLETA CON USERNAME Y DATOS DE SANCIONES
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        username: string;        
        isEmailVerified?: boolean;
        role?: string;
        // ✅ NUEVOS CAMPOS PARA SANCIONES
        isBanned?: boolean;
        isSilenced?: boolean;
        warningsCount?: number;
        activeSanctions?: any[];
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

      // Validar token JWT
      const payload = JwtAdapter.validateToken<{ userId: number; email: string }>(token);
      if (!payload) {
        throw AuthErrors.invalidToken();
      }

      // ✅ VERIFICACIÓN COMPLETA DEL USUARIO EN BD
      try {
        const deps = await Dependencies.create();
        const user = await deps.repositories.userRepository.findById(payload.userId);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // ✅ CRÍTICO: Verificar estado de ban actual (podría haber cambiado desde que se emitió el token)
        if (user.isBanned) {
          return res.status(403).json({
            success: false,
            error: 'Your account is banned',
            code: 'USER_BANNED',
            details: {
              reason: user.banReason,
              bannedAt: user.bannedAt,
              bannedBy: user.bannedBy,
              isPermanent: true // Los bans temporales se limpian automáticamente
            }
          });
        }

        // ✅ NUEVO: Verificar sanciones activas que bloqueen el acceso
        const activeSanctions = await deps.repositories.sanctionRepository.findActiveSanctionsForUser(user.id);
        const blockingSanctions = activeSanctions.filter((sanction: any) => 
          ['temp_suspend', 'permanent_ban', 'ip_ban'].includes(sanction.sanctionType)
        );

        if (blockingSanctions.length > 0) {
          const sanction = blockingSanctions[0];
          return res.status(403).json({
            success: false,
            error: 'Account suspended',
            code: 'USER_SUSPENDED',
            details: {
              sanctionType: sanction.sanctionType,
              reason: sanction.reason,
              expiresAt: sanction.expiresAt,
              isTemporary: sanction.expiresAt !== null,
              appliedBy: sanction.moderator?.username || 'System'
            }
          });
        }

        // ✅ AGREGAR INFORMACIÓN COMPLETA AL REQUEST
        req.user = {
          userId: user.id,
          email: user.email,
          username: user.username,           
          isEmailVerified: user.isEmailVerified || false,
          role: user.role?.name,
          // ✅ NUEVOS CAMPOS DE SANCIONES
          isBanned: false, // Confirmado que no está baneado
          isSilenced: user.isSilenced || false,
          warningsCount: user.warningsCount || 0,
          activeSanctions: activeSanctions.map((s: any) => ({
            id: s.id,
            type: s.sanctionType,
            reason: s.reason,
            expiresAt: s.expiresAt,
            isTemporary: s.expiresAt !== null
          }))
        };

        console.log(`✅ Token validated for user ${user.id} (${user.username}) via ${queryToken ? 'query' : 'header'} - ${activeSanctions.length} active sanctions`);

      } catch (dbError) {
        // Si falla la consulta a BD, usar solo datos del JWT (fallback limitado)
        console.warn('⚠️ Error fetching user details, using JWT payload only:', dbError);
        req.user = {
          userId: payload.userId,
          email: payload.email,
          username: 'Usuario',               
          isEmailVerified: false,
          isBanned: false,
          isSilenced: false,
          warningsCount: 0,
          activeSanctions: []
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

  // ✅ MIDDLEWARE OPCIONAL TAMBIÉN ACTUALIZADO CON VERIFICACIÓN DE SANCIONES
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
      // ✅ VERIFICACIÓN COMPLETA TAMBIÉN PARA AUTH OPCIONAL
      try {
        const deps = await Dependencies.create();
        const user = await deps.repositories.userRepository.findById(payload.userId);
        
        if (user && !user.isBanned) { // Solo agregar si no está baneado
          const activeSanctions = await deps.repositories.sanctionRepository.findActiveSanctionsForUser(user.id);
          
          // Verificar que no tenga sanciones que bloqueen acceso
          const blockingSanctions = activeSanctions.filter((sanction: any) => 
            ['temp_suspend', 'permanent_ban', 'ip_ban'].includes(sanction.sanctionType)
          );

          if (blockingSanctions.length === 0) {
            req.user = {
              userId: user.id,
              email: user.email,
              username: user.username,         
              isEmailVerified: user.isEmailVerified || false,
              role: user.role?.name,
              isBanned: false,
              isSilenced: user.isSilenced || false,
              warningsCount: user.warningsCount || 0,
              activeSanctions: activeSanctions.map((s: any) => ({
                id: s.id,
                type: s.sanctionType,
                reason: s.reason,
                expiresAt: s.expiresAt,
                isTemporary: s.expiresAt !== null
              }))
            };
          }
          // Si tiene sanciones bloqueantes, no agregar el usuario (actúa como no autenticado)
        }
      } catch (dbError) {
        // Fallback silencioso para auth opcional
        req.user = {
          userId: payload.userId,
          email: payload.email,
          username: 'Usuario',               
          isEmailVerified: false,
          isBanned: false,
          isSilenced: false,
          warningsCount: 0,
          activeSanctions: []
        };
      }
    }

    next();
  }
}