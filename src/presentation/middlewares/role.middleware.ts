// src/presentation/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Dependencies } from '../../infrastructure/dependencies';

export class RoleMiddleware {
  static requireRole(allowedRoles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 1. Verificar que el usuario está autenticado
        if (!req.user?.userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // 2. Obtener información del usuario
        const deps = await Dependencies.create();
        const userRepository = deps.repositories.userRepository;
        const user = await userRepository.findById(req.user.userId);

        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // 3. Verificar si el usuario está baneado
        if (user.isBanned) {
          return res.status(403).json({
            success: false,
            error: 'Your account has been banned',
            code: 'USER_BANNED',
            details: {
              reason: user.banReason,
              bannedAt: user.bannedAt
            }
          });
        }

        // 4. Verificar el rol
        const userRole = user.role?.name;
        if (!userRole || !allowedRoles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            error: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
            code: 'INSUFFICIENT_ROLE',
            details: {
              userRole,
              requiredRoles: allowedRoles
            }
          });
        }

        // 5. Agregar información del rol al request
        req.user.role = userRole;

        next();
      } catch (error) {
        console.error('Error in RoleMiddleware:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'MIDDLEWARE_ERROR'
        });
      }
    };
  }

  // Middleware específico para admins
  static adminOnly() {
    return RoleMiddleware.requireRole(['admin']);
  }

  // Middleware para admin o moderator
  static moderatorOrAdmin() {
    return RoleMiddleware.requireRole(['admin', 'moderator']);
  }
}