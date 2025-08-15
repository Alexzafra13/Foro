// src/presentation/controllers/moderation.controller.ts
import { Request, Response } from 'express';
import { BanUser } from '../../domain/use-cases/moderation/ban-user.use-case';
import { UnbanUser } from '../../domain/use-cases/moderation/unban-user.use-case';
import { GetBannedUsers } from '../../domain/use-cases/moderation/get-banned-users.use-case';
import { GetModeratedComments } from '../../domain/use-cases/moderation/get-moderated-comments.use-case';
import { GetModerationStats } from '../../domain/use-cases/moderation/get-moderation-stats.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class ModerationController {
  constructor(
    private readonly banUser: BanUser,
    private readonly unbanUser: UnbanUser,
    private readonly getBannedUsers: GetBannedUsers,
    // ✅ NUEVAS DEPENDENCIAS
    private readonly getModeratedComments: GetModeratedComments,
    private readonly getModerationStats: GetModerationStats
  ) {}

  // POST /api/moderation/ban - Banear usuario
  async ban(req: Request, res: Response) {
    try {
      const { userId, reason } = req.body;
      const bannedBy = req.user?.userId!;

      if (!userId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'User ID and reason are required',
          code: 'MISSING_FIELDS'
        });
      }

      const result = await this.banUser.execute({
        targetUserId: userId,
        bannedBy,
        reason,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error banning user');
    }
  }

  // POST /api/moderation/unban - Desbanear usuario
  async unban(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const unbannedBy = req.user?.userId!;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
      }

      const result = await this.unbanUser.execute({
        targetUserId: userId,
        unbannedBy,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error unbanning user');
    }
  }

  // GET /api/moderation/banned-users - Listar usuarios baneados
  async getBanned(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const { page, limit } = req.query;

      const result = await this.getBannedUsers.execute({
        requesterId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
        message: `Found ${result.users.length} banned users`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching banned users');
    }
  }

  // ✅ NUEVO: GET /api/moderation/comments - Listar comentarios moderados
  async getComments(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const { 
        page, 
        limit, 
        sortBy, 
        sortOrder, 
        status 
      } = req.query;

      const result = await this.getModeratedComments.execute({
        requesterId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as 'createdAt' | 'voteScore' | 'replies' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        status: status as 'hidden' | 'visible' | 'all' | undefined
      });

      res.json({
        success: true,
        data: result,
        message: 'Moderated comments retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error retrieving moderated comments');
    }
  }

  // ✅ NUEVO: GET /api/moderation/stats - Estadísticas de moderación
  async getStats(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const { period } = req.query;

      const result = await this.getModerationStats.execute({
        requesterId,
        period: period as 'today' | 'week' | 'month' | 'year' | 'all' | undefined
      });

      res.json({
        success: true,
        data: result,
        message: 'Moderation statistics retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error retrieving moderation statistics');
    }
  }

  // ✅ Método auxiliar para obtener IP del cliente
  private getClientIP(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || undefined;
  }

  // ✅ Manejo de errores mejorado
  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);

    // Errores específicos de autenticación
    if (error.message?.includes('User not found')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (error.message?.includes('Insufficient permissions')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for moderation',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Errores específicos de moderación
    if (error.message?.includes('already banned')) {
      return res.status(400).json({
        success: false,
        error: 'User is already banned',
        code: 'USER_ALREADY_BANNED'
      });
    }

    if (error.message?.includes('not banned')) {
      return res.status(400).json({
        success: false,
        error: 'User is not banned',
        code: 'USER_NOT_BANNED'
      });
    }

    if (error.message?.includes('cannot ban admin')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot ban administrator users',
        code: 'CANNOT_BAN_ADMIN'
      });
    }

    // Manejo de errores del dominio
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }

    // Error genérico
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}