// src/presentation/controllers/moderation.controller.ts - COMPLETO CON ESTADÍSTICAS REALES

import { Request, Response } from 'express';
// Use cases existentes
import { BanUser } from '../../domain/use-cases/moderation/ban-user.use-case';
import { UnbanUser } from '../../domain/use-cases/moderation/unban-user.use-case';
import { GetBannedUsers } from '../../domain/use-cases/moderation/get-banned-users.use-case';
import { GetModeratedComments } from '../../domain/use-cases/moderation/get-moderated-comments.use-case';
import { GetModerationStats } from '../../domain/use-cases/moderation/get-moderation-stats.use-case';
import { GetModeratedPosts } from '../../domain/use-cases/moderation/get-moderated-posts.use-case';
// Nuevos use cases de sanciones
import { ApplySanction } from '../../domain/use-cases/moderation/apply-sanction.use-case';
import { RevokeSanction } from '../../domain/use-cases/moderation/revoke-sanction.use-case';
import { GetUserSanctions } from '../../domain/use-cases/moderation/get-user-sanctions.use-case';
import { GetSanctionsHistory } from '../../domain/use-cases/moderation/get-sanctions-history.use-case';
import { SanctionRepository } from '../../domain/repositories/sanction.repository';
import { CustomError, DomainError } from '../../shared/errors';

export class ModerationController {
  constructor(
    // Use cases existentes
    private readonly banUser: BanUser,
    private readonly unbanUser: UnbanUser,
    private readonly getBannedUsers: GetBannedUsers,
    private readonly getModeratedComments: GetModeratedComments,
    private readonly getModerationStats: GetModerationStats,
    private readonly getModeratedPosts: GetModeratedPosts,
    // Use cases de sanciones renombrados
    private readonly applySanctionUseCase: ApplySanction,
    private readonly revokeSanctionUseCase: RevokeSanction,
    private readonly getUserSanctionsUseCase: GetUserSanctions,
    private readonly getSanctionsHistoryUseCase: GetSanctionsHistory,
    // Repositorio para estadísticas directas
    private readonly sanctionRepository: SanctionRepository
  ) {}

  // ===== MÉTODOS EXISTENTES (SIN CAMBIOS) =====

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

  async getPostsList(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.userId!;
      
      const {
        status = 'all',
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        channelId
      } = req.query;

      const result = await this.getModeratedPosts.execute({
        moderatorId,
        status: status as 'hidden' | 'visible' | 'all',
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | 'views' | 'author',
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        channelId: channelId ? parseInt(channelId as string) : undefined
      });

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
        summary: result.summary,
        meta: {
          requestedStatus: status,
          totalResults: result.pagination.total,
          moderatedBy: req.user?.username
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting moderated posts');
    }
  }

  async getPostModerationStats(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.userId!;
      const { period = '7d' } = req.query;

      const result = await this.getModeratedPosts.execute({
        moderatorId,
        status: 'all',
        page: 1,
        limit: 1
      });

      const stats = {
        period: period as string,
        posts: {
          total: result.summary.totalVisible + result.summary.totalHidden,
          visible: result.summary.totalVisible,
          hidden: result.summary.totalHidden,
          moderatedRatio: result.summary.totalModerated > 0 ? 
            (result.summary.totalModerated / (result.summary.totalVisible + result.summary.totalHidden)) * 100 : 0
        },
        actions: {
          totalModerated: result.summary.totalModerated,
          recentlyModerated: 0,
          averagePerDay: 0
        },
        moderator: {
          id: moderatorId,
          username: 'Moderador',
          role: req.user?.role
        },
        generatedAt: new Date()
      };

      res.json({
        success: true,
        data: stats,
        message: 'Post moderation statistics retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting post moderation statistics');
    }
  }

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

  async getComprehensiveStats(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.userId!;
      const { period = '7d' } = req.query;

      const commentStats = await this.getModerationStats.execute({
        requesterId: moderatorId,
        period: period as 'today' | 'week' | 'month' | 'year' | 'all'
      });

      const postStatsResult = await this.getModeratedPosts.execute({
        moderatorId,
        status: 'all',
        page: 1,
        limit: 1
      });

      const comprehensiveStats = {
        period: period as string,
        overview: {
          totalContent: (postStatsResult.summary.totalVisible + postStatsResult.summary.totalHidden),
          totalModerated: postStatsResult.summary.totalModerated,
          moderationRate: postStatsResult.summary.totalModerated > 0 ? 
            ((postStatsResult.summary.totalModerated) / 
            (postStatsResult.summary.totalVisible + postStatsResult.summary.totalHidden)) * 100 : 0
        },
        posts: {
          total: postStatsResult.summary.totalVisible + postStatsResult.summary.totalHidden,
          visible: postStatsResult.summary.totalVisible,
          hidden: postStatsResult.summary.totalHidden,
          moderatedRatio: postStatsResult.summary.totalHidden > 0 ? 
            (postStatsResult.summary.totalHidden / 
            (postStatsResult.summary.totalVisible + postStatsResult.summary.totalHidden)) * 100 : 0
        },
        comments: commentStats,
        moderator: {
          id: moderatorId,
          username: 'Moderador',
          role: req.user?.role
        },
        generatedAt: new Date()
      };

      res.json({
        success: true,
        data: comprehensiveStats,
        message: 'Comprehensive moderation statistics retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting comprehensive statistics');
    }
  }

  // ===== MÉTODOS DE SANCIONES CON ESTADÍSTICAS REALES =====

  // GET /api/moderation/sanctions/stats - Estadísticas de sanciones REALES
  async getSanctionsStats(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const { period = 'all' } = req.query;

      console.log(`Getting sanctions stats for user ${requesterId}, period: ${period}`);

      // Calcular estadísticas reales desde la base de datos
      const [
        totalStats,
        activeStats,
        expiredTodayCount,
        moderationStats
      ] = await Promise.all([
        // Total de sanciones
        this.sanctionRepository.findMany({}, { page: 1, limit: 1 }),
        
        // Sanciones activas (no expiradas y isActive = true)
        this.sanctionRepository.findMany(
          { isActive: true }, 
          { page: 1, limit: 1 }
        ),
        
        // Sanciones que expiran hoy
        this.getExpiredTodayCount(),
        
        // Estadísticas por tipo y severidad
        this.sanctionRepository.getModerationStats()
      ]);

      // Calcular usuarios únicos con sanciones activas
      const activeSanctions = await this.sanctionRepository.findMany(
        { isActive: true }, 
        { page: 1, limit: 1000 } // Obtener todas las activas para contar usuarios únicos
      );
      
      const uniqueUserIds = new Set(
        activeSanctions.data.map(s => s.userId).filter(Boolean)
      );

      const stats = {
        totalSanctions: totalStats.pagination.total,
        activeSanctions: activeStats.pagination.total,
        usersWithActiveSanctions: uniqueUserIds.size,
        expiredToday: expiredTodayCount,
        sanctionsByType: moderationStats.sanctionsByType || {
          warning: 0,
          silence: 0,
          restriction: 0,
          temp_suspend: 0,
          permanent_ban: 0,
          ip_ban: 0
        },
        sanctionsBySeverity: moderationStats.sanctionsBySeverity || {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        recentActivity: [],
        period: period as string,
        requesterId,
        generatedAt: new Date()
      };

      console.log(`Sanctions stats calculated:`, stats);

      res.json({
        success: true,
        data: stats,
        message: `Sanctions statistics retrieved successfully for period: ${period}`
      });

    } catch (error) {
      console.error('Error retrieving sanctions statistics:', error);
      this.handleError(error, res, 'Error retrieving sanctions statistics');
    }
  }

  // POST /api/moderation/sanctions - Aplicar sanción
  async applySanction(req: Request, res: Response) {
    try {
      const { 
        targetUserId, 
        sanctionType, 
        reason, 
        durationHours, 
        severity, 
        evidence 
      } = req.body;
      const moderatorId = req.user?.userId!;

      if (!targetUserId || !sanctionType || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Target user ID, sanction type, and reason are required',
          code: 'MISSING_FIELDS'
        });
      }

      const validSanctionTypes = ['warning', 'temp_suspend', 'permanent_ban', 'silence', 'restriction', 'ip_ban'];
      if (!validSanctionTypes.includes(sanctionType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sanction type',
          code: 'INVALID_SANCTION_TYPE'
        });
      }

      const result = await this.applySanctionUseCase.execute({
        targetUserId: parseInt(targetUserId),
        moderatorId,
        sanctionType,
        reason,
        durationHours: durationHours ? parseInt(durationHours) : undefined,
        severity,
        evidence,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error applying sanction');
    }
  }

  // POST /api/moderation/sanctions/:id/revoke - Revocar sanción
  async revokeSanction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const moderatorId = req.user?.userId!;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Revoke reason is required',
          code: 'MISSING_REASON'
        });
      }

      const result = await this.revokeSanctionUseCase.execute({
        sanctionId: parseInt(id),
        moderatorId,
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
      this.handleError(error, res, 'Error revoking sanction');
    }
  }

  // GET /api/moderation/users/:id/sanctions - Obtener sanciones de usuario
  async getUserSanctions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requesterId = req.user?.userId!;
      const { includeInactive, page, limit } = req.query;

      const result = await this.getUserSanctionsUseCase.execute({
        targetUserId: parseInt(id),
        requesterId,
        includeInactive: includeInactive === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result,
        message: `Found ${result.sanctions.length} sanctions for user`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching user sanctions');
    }
  }

  // GET /api/moderation/sanctions - Historial de sanciones
  async getSanctionsHistory(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const {
        page,
        limit,
        sanctionType,
        severity,
        status,
        userId,
        moderatorId,
        sortBy,
        sortOrder
      } = req.query;

      const result = await this.getSanctionsHistoryUseCase.execute({
        requesterId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sanctionType: sanctionType as string,
        severity: severity as string,
        status: status as 'active' | 'inactive' | 'all',
        userId: userId ? parseInt(userId as string) : undefined,
        moderatorId: moderatorId ? parseInt(moderatorId as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.sanctions,
        pagination: result.pagination,
        stats: result.stats,
        message: `Found ${result.sanctions.length} sanctions`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching sanctions history');
    }
  }

  // ===== MÉTODOS AUXILIARES PARA ESTADÍSTICAS =====

  private async getExpiredTodayCount(): Promise<number> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Buscar sanciones que expiran hoy
      const result = await this.sanctionRepository.findMany(
        {}, 
        { page: 1, limit: 1000 }
      );
      
      const expiredToday = result.data.filter(sanction => {
        if (!sanction.expiresAt) return false;
        const expiryDate = new Date(sanction.expiresAt);
        return expiryDate >= todayStart && expiryDate < todayEnd;
      });

      return expiredToday.length;
    } catch (error) {
      console.error('Error calculating expired today count:', error);
      return 0;
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  private getClientIP(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || undefined;
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);

    // Errores específicos de sanciones
    if (error.message?.includes('Sanction not found')) {
      return res.status(404).json({
        success: false,
        error: 'Sanction not found',
        code: 'SANCTION_NOT_FOUND'
      });
    }

    if (error.message?.includes('Administrators cannot be sanctioned')) {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot be sanctioned',
        code: 'CANNOT_SANCTION_ADMIN'
      });
    }

    if (error.message?.includes('Only administrators can sanction moderators')) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can sanction moderators',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Errores de usuarios
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

    // Error genérico
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}