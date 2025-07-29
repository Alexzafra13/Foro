import { Request, Response } from 'express';
import { CreateComment } from '../../domain/use-cases/comments/create-comment.use-case';
import { GetComments } from '../../domain/use-cases/comments/get-comments.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class CommentController {
  constructor(
    private readonly createComment: CreateComment,
    private readonly getComments: GetComments
  ) {}

  // POST /api/posts/:postId/comments
  async create(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);
      const { content, parentCommentId } = req.body;
      const authorId = req.user?.userId!; // Del middleware de auth

      const result = await this.createComment.execute({
        postId,
        content,
        authorId,
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : undefined
      });

      res.status(201).json({
        success: true,
        data: result,
        message: result.isReply ? 'Reply created successfully' : 'Comment created successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating comment');
    }
  }

  // GET /api/posts/:postId/comments
  async getByPostId(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);
      const userId = req.user?.userId; // Opcional para votos
      
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        includeReplies
      } = req.query;

      const result = await this.getComments.execute({
        postId,
        userId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
        includeReplies: includeReplies === 'true'
      });

      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination,
        postInfo: result.postInfo,
        message: `Found ${result.comments.length} comments`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching comments');
    }
  }

  // GET /api/comments/:id/replies  
  async getReplies(req: Request, res: Response) {
    try {
      const parentCommentId = parseInt(req.params.id);
      const userId = req.user?.userId;
      
      const {
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // Usar getComments pero filtrar por parentCommentId
      // Por ahora simple implementación, después optimizaremos
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon - replies endpoint'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching replies');
    }
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