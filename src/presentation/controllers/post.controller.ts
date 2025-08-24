// src/presentation/controllers/post.controller.ts - COMPLETO CON TRACKING DE VISTAS Y MODERACIÓN
import { Request, Response } from 'express';
import { CreatePost } from '../../domain/use-cases/posts/create-post.use-case';
import { GetPosts } from '../../domain/use-cases/posts/get-posts.use-case';
import { GetPostDetail } from '../../domain/use-cases/posts/get-post-detail.use-case';
import { UpdatePost } from '../../domain/use-cases/posts/update-post.use-case';
import { DeletePost } from '../../domain/use-cases/posts/delete-post.use-case';
import { TrackPostView } from '../../domain/use-cases/post-views/track-post-view.use-case';
import { CreateNotification } from '../../domain/use-cases/notifications/create-notification.use-case';
import { PostRepository } from '../../domain/repositories/post.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CustomError, DomainError } from '../../shared/errors';

export class PostController {
  constructor(
    private readonly createPost: CreatePost,
    private readonly getPosts: GetPosts,
    private readonly getPostDetail: GetPostDetail,
    private readonly updatePost: UpdatePost,
    private readonly deletePost: DeletePost,
    private readonly trackPostView: TrackPostView,
    private readonly postRepository: PostRepository, // ✅ AGREGAR PARA MODERACIÓN
    private readonly userRepository: UserRepository, // ✅ AGREGAR PARA MODERACIÓN
    private readonly createNotification: CreateNotification // ✅ AGREGAR PARA NOTIFICACIONES
  ) {}

  // POST /api/posts
  async create(req: Request, res: Response) {
    try {
      const { channelId, title, content } = req.body;
      const authorId = req.user?.userId!;

      const result = await this.createPost.execute({
        channelId: parseInt(channelId),
        title,
        content,
        authorId
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Post created successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating post');
    }
  }

  // GET /api/posts - FORO PRIVADO: REQUIERE AUTENTICACIÓN
  async getMany(req: Request, res: Response) {
    try {
      const {
        channelId,
        authorId,
        search,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      const userId = req.user?.userId!;

      const result = await this.getPosts.execute({
        userId,
        channelId: channelId ? parseInt(channelId as string) : undefined,
        authorId: authorId ? parseInt(authorId as string) : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
        message: `Found ${result.posts.length} posts`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching posts');
    }
  }

  // GET /api/posts/:id - FORO PRIVADO: REQUIERE AUTENTICACIÓN CON TRACKING DE VISTAS
  async getById(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }
        // 1. Obtener el post
        const result = await this.getPostDetail.execute({
          postId,
          userId
        });

        // 2. Trackear vista del usuario (async, no bloqueante)
        this.trackPostView.execute({
          userId,
          postId,
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent']
        }).catch(error => {
          console.error(`Error tracking view for post ${postId} by user ${userId}:`, error);
          // No fallar la respuesta por error de tracking
        });

        res.json({
          success: true,
          data: result,
          message: 'Post retrieved successfully'
        });
      } catch (error) {
        this.handleError(error, res, 'Error fetching post');
      }
    }

  // ✅ POST /api/posts/:id/track-view - Endpoint específico para trackear vistas
  async trackView(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      console.log(`🔍 Tracking view for post ${postId} by user ${userId}`);

      const result = await this.trackPostView.execute({
        userId,
        postId,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      console.log(`✅ View tracking result:`, result);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error(`❌ Error tracking view for post ${req.params.id}:`, error);
      this.handleError(error, res, 'Error tracking post view');
    }
  }

  // PUT /api/posts/:id
  async update(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const { title, content } = req.body;
      const userId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      const result = await this.updatePost.execute({
        postId,
        title,
        content,
        userId
      });

      res.json({
        success: true,
        data: result,
        message: 'Post updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating post');
    }
  }

  // DELETE /api/posts/:id
  async delete(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      const result = await this.deletePost.execute({
        postId,
        userId
      });

      res.json({
        success: true,
        data: result,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error deleting post');
    }
  }

  // ✅ GET /api/posts/:id/view-stats - Endpoint específico para obtener estadísticas de vistas
  async getViewStats(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      // Solo administradores pueden ver estadísticas detalladas
      const userRole = req.user?.role;
      if (!['admin', 'moderator'].includes(userRole || '')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view detailed stats',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      const stats = await this.trackPostView.getPostViewStats(postId);

      res.json({
        success: true,
        data: stats,
        message: 'View statistics retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching view statistics');
    }
  }

  // ===== MÉTODOS DE MODERACIÓN (NUEVOS) =====

  // ✅ POST /api/posts/:id/hide - OCULTAR POST POR MODERACIÓN
  async hideByModeration(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const moderatorId = req.user?.userId!;
      const { reason } = req.body;

      console.log(`🔍 Attempting to hide post ${postId} by moderator ${moderatorId}`);

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      // Verificar que el post existe
      const post = await this.postRepository.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Verificar permisos del moderador
      const moderator = await this.userRepository.findById(moderatorId);
      if (!moderator || !['admin', 'moderator'].includes(moderator.role!.name)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for moderation',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Verificar que no está intentando moderar su propio post
      if (post.isAuthor(moderatorId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot moderate your own posts',
          code: 'CANNOT_MODERATE_OWN_POST'
        });
      }

      // Verificar que el post no está ya oculto
      if (post.isHidden) {
        return res.status(400).json({
          success: false,
          error: 'Post is already hidden',
          code: 'POST_ALREADY_HIDDEN'
        });
      }

      console.log(`🔄 Hiding post ${postId}...`);

      // Ocultar post
      const updatedPost = await this.postRepository.updateById(postId, {
        isHidden: true,
        deletedBy: moderatorId,
        deletionReason: reason || 'moderation',
        updatedAt: new Date()
      });

      console.log(`✅ Post ${postId} hidden successfully`);

      // Enviar notificación al autor del post
      if (post.authorId && post.authorId !== moderatorId) {
        try {
          const notificationDto = CreateNotification.forModeration(
            post.authorId,
            'post_hidden',
            moderator.username,
            undefined, // commentId
            post.id    // postId
          );
          
          await this.createNotification.execute(notificationDto);
          console.log(`📬 Moderation notification sent to user ${post.authorId}`);
        } catch (notifError) {
          console.error('Failed to send moderation notification:', notifError);
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedPost.id,
          isHidden: true,
          moderatedBy: {
            id: moderator.id,
            username: moderator.username,
            role: moderator.role!.name
          },
          moderatedAt: new Date()
        },
        message: 'Post hidden by moderation'
      });
    } catch (error) {
      console.error('❌ Error in hideByModeration:', error);
      this.handleModerationError(error, res, 'Error hiding post');
    }
  }

  // ✅ POST /api/posts/:id/unhide - MOSTRAR POST OCULTO
  async unhideByModeration(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const moderatorId = req.user?.userId!;
      const { reason } = req.body;

      console.log(`🔍 Attempting to unhide post ${postId} by moderator ${moderatorId}`);

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID',
          code: 'INVALID_POST_ID'
        });
      }

      // Verificar que el post existe
      const post = await this.postRepository.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Verificar permisos del moderador
      const moderator = await this.userRepository.findById(moderatorId);
      if (!moderator || !['admin', 'moderator'].includes(moderator.role!.name)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for moderation',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Verificar que no está intentando restaurar su propio post
      if (post.isAuthor(moderatorId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot moderate your own posts',
          code: 'CANNOT_MODERATE_OWN_POST'
        });
      }

      // Verificar que el post está realmente oculto
      if (!post.isHidden) {
        return res.status(400).json({
          success: false,
          error: 'Post is not hidden',
          code: 'POST_NOT_HIDDEN'
        });
      }

      console.log(`🔄 Restoring post ${postId}...`);

      // Restaurar post
      const updatedPost = await this.postRepository.updateById(postId, {
        isHidden: false,
        deletedBy: null,
        deletionReason: null,
        updatedAt: new Date()
      });

      console.log(`✅ Post ${postId} restored successfully`);

      // Enviar notificación al autor del post
      if (post.authorId && post.authorId !== moderatorId) {
        try {
          const notificationDto = CreateNotification.forModeration(
            post.authorId,
            'post_restored',
            moderator.username,
            undefined, // commentId
            post.id    // postId
          );
          
          await this.createNotification.execute(notificationDto);
          console.log(`📬 Restoration notification sent to user ${post.authorId}`);
        } catch (notifError) {
          console.error('Failed to send restoration notification:', notifError);
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedPost.id,
          isHidden: false,
          restoredBy: {
            id: moderator.id,
            username: moderator.username,
            role: moderator.role!.name
          },
          restoredAt: new Date()
        },
        message: 'Post restored by moderation'
      });
    } catch (error) {
      console.error('❌ Error in unhideByModeration:', error);
      this.handleModerationError(error, res, 'Error restoring post');
    }
  }

  // ===== MÉTODOS AUXILIARES PRIVADOS =====

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  // ✅ MANEJO DE ERRORES DE MODERACIÓN
  private handleModerationError(error: any, res: Response, defaultMessage: string) {
    if (error.message.includes('already hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Post is already hidden',
        code: 'POST_ALREADY_HIDDEN'
      });
    }

    if (error.message.includes('not hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Post is not hidden',
        code: 'POST_NOT_HIDDEN'
      });
    }

    if (error.message.includes('moderate your own')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot moderate your own posts',
        code: 'CANNOT_MODERATE_OWN_POST'
      });
    }

    if (error.message.includes('Insufficient permissions')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for moderation',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Usar el manejo de errores existente como fallback
    return this.handleError(error, res, defaultMessage);
  }

  private handleError(error: unknown, res: Response, defaultMessage: string) {
    console.error(defaultMessage, error);

    if (error instanceof CustomError || error instanceof DomainError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
        code: error.code || 'DOMAIN_ERROR'
      });
    }

    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: defaultMessage,
      code: 'UNKNOWN_ERROR'
    });
  }
}