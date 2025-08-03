// src/presentation/controllers/post.controller.ts - COMPLETO CON TRACKING DE VISTAS
import { Request, Response } from 'express';
import { CreatePost } from '../../domain/use-cases/posts/create-post.use-case';
import { GetPosts } from '../../domain/use-cases/posts/get-posts.use-case';
import { GetPostDetail } from '../../domain/use-cases/posts/get-post-detail.use-case';
import { UpdatePost } from '../../domain/use-cases/posts/update-post.use-case';
import { DeletePost } from '../../domain/use-cases/posts/delete-post.use-case';
import { TrackPostView } from '../../domain/use-cases/post-views/track-post-view.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class PostController {
  constructor(
    private readonly createPost: CreatePost,
    private readonly getPosts: GetPosts,
    private readonly getPostDetail: GetPostDetail,
    private readonly updatePost: UpdatePost,
    private readonly deletePost: DeletePost,
    private readonly trackPostView: TrackPostView // ✅ NUEVO
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

  // ✅ NUEVO: POST /api/posts/:id/track-view - Endpoint específico para trackear vistas
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

  // ✅ NUEVO: Endpoint específico para obtener estadísticas de vistas
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

  // Métodos auxiliares privados
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
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