// src/presentation/controllers/moderation.controller.ts - COMPLETO CON POSTS
import { Request, Response } from 'express';
import { BanUser } from '../../domain/use-cases/moderation/ban-user.use-case';
import { UnbanUser } from '../../domain/use-cases/moderation/unban-user.use-case';
import { GetBannedUsers } from '../../domain/use-cases/moderation/get-banned-users.use-case';
import { GetModeratedComments } from '../../domain/use-cases/moderation/get-moderated-comments.use-case';
import { GetModerationStats } from '../../domain/use-cases/moderation/get-moderation-stats.use-case';
import { GetModeratedPosts } from '../../domain/use-cases/moderation/get-moderated-posts.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class ModerationController {
  constructor(
    private readonly banUser: BanUser,
    private readonly unbanUser: UnbanUser,
    private readonly getBannedUsers: GetBannedUsers,
    private readonly getModeratedComments: GetModeratedComments,
    private readonly getModerationStats: GetModerationStats,
    private readonly getModeratedPosts: GetModeratedPosts // ✅ NUEVA DEPENDENCIA
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

  // ===== GESTIÓN DE COMENTARIOS MODERADOS =====

  // GET /api/moderation/comments - Listar comentarios moderados
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

  // ===== GESTIÓN DE POSTS MODERADOS (NUEVOS) =====

  // ✅ GET /api/moderation/posts - Listar posts moderados
  async getPostsList(req: Request, res: Response) { // ✅ CAMBIAR NOMBRE DEL MÉTODO
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

      console.log(`🔍 Getting moderated posts for moderator ${moderatorId}:`, {
        status, page, limit, sortBy, sortOrder, search, channelId
      });

      const result = await this.getModeratedPosts.execute({
        moderatorId,
        status: status as 'hidden' | 'visible' | 'all',
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | 'views' | 'author', // ✅ AGREGAR 'author'
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
          moderatedBy: req.user?.username // ✅ USAR req.user?.username DIRECTAMENTE
        }
      });
    } catch (error) {
      console.error('❌ Error in getModeratedPosts:', error);
      this.handleError(error, res, 'Error getting moderated posts');
    }
  }

  // ✅ GET /api/moderation/posts/stats - Estadísticas de moderación de posts
  async getPostModerationStats(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.userId!;
      const { period = '7d' } = req.query;

      console.log(`📊 Getting post moderation stats for moderator ${moderatorId}, period: ${period}`);

      // Obtener estadísticas básicas usando GetModeratedPosts use case
      const result = await this.getModeratedPosts.execute({
        moderatorId,
        status: 'all',
        page: 1,
        limit: 1 // Solo necesitamos el summary
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
          recentlyModerated: 0, // TODO: Implementar conteo por período
          averagePerDay: 0      // TODO: Implementar cálculo por período
        },
        moderator: {
          id: moderatorId,
          username: 'Moderador', // ✅ Usar valor fijo o buscar en BD
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
      console.error('❌ Error in getPostModerationStats:', error);
      this.handleError(error, res, 'Error getting post moderation statistics');
    }
  }

  // ===== ESTADÍSTICAS GENERALES =====

  // GET /api/moderation/stats - Estadísticas generales de moderación
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

  // ✅ GET /api/moderation/stats/comprehensive - Estadísticas completas (posts + comentarios)
  async getComprehensiveStats(req: Request, res: Response) {
    try {
      const moderatorId = req.user?.userId!;
      const { period = '7d' } = req.query;

      // Obtener estadísticas de comentarios
      const commentStats = await this.getModerationStats.execute({
        requesterId: moderatorId,
        period: period as 'today' | 'week' | 'month' | 'year' | 'all'
      });

      // Obtener estadísticas de posts usando el use case
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
        comments: commentStats, // Estadísticas de comentarios del use case existente
        moderator: {
          id: moderatorId,
          username: 'Moderador', // ✅ Usar valor fijo o buscar en BD
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
      console.error('❌ Error in comprehensive stats:', error);
      this.handleError(error, res, 'Error getting comprehensive statistics');
    }
  }

  // ===== MÉTODOS AUXILIARES PRIVADOS =====

  private getClientIP(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || undefined;
  }

  // ✅ MANEJO DE ERRORES MEJORADO (incluye errores de posts)
  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);

    // Errores específicos de posts
    if (error.message.includes('Post not found')) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

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

    // Errores comunes de moderación (posts y comentarios)
    if (error.message.includes('already hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Content is already hidden',
        code: 'ALREADY_HIDDEN'
      });
    }

    if (error.message.includes('not hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Content is not hidden',
        code: 'NOT_HIDDEN'
      });
    }

    if (error.message.includes('moderate your own')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot moderate your own content',
        code: 'CANNOT_MODERATE_OWN_CONTENT'
      });
    }

    // Errores específicos de usuarios baneados
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