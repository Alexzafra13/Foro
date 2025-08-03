// src/presentation/controllers/moderation.controller.ts
import { Request, Response } from 'express';
import { BanUser } from '../../domain/use-cases/moderation/ban-user.use-case';
import { UnbanUser } from '../../domain/use-cases/moderation/unban-user.use-case';
import { GetBannedUsers } from '../../domain/use-cases/moderation/get-banned-users.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class ModerationController {
  constructor(
    private readonly banUser: BanUser,
    private readonly unbanUser: UnbanUser,
    private readonly getBannedUsers: GetBannedUsers
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

 private getClientIP(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || undefined;
}


  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);

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

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}