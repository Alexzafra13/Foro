import { Request, Response } from 'express';
import { CreateComment } from '../../domain/use-cases/comments/create-comment.use-case';
import { GetComments } from '../../domain/use-cases/comments/get-comments.use-case';
import { UpdateComment } from '../../domain/use-cases/comments/update-comment.use-case';
import { DeleteComment } from '@/domain/use-cases/comments/delete-comment.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';

export class CommentController {
  constructor(
    private readonly createComment: CreateComment,
    private readonly getComments: GetComments,
    private readonly updateComment: UpdateComment,
    private readonly deleteComment: DeleteComment
  ) {}

  // POST /api/posts/:postId/comments
  async create(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);
      const { content, parentCommentId } = req.body;
      const authorId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID'
        });
      }

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
      const userId = req.user?.userId;
      
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID'
        });
      }

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

  // PUT /api/comments/:id - Editar comentario
  async update(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const { content } = req.body;
      const userId = req.user?.userId!;

      // Validaciones básicas
      if (isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID',
          code: 'INVALID_COMMENT_ID'
        });
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Content is required and must be a non-empty string',
          code: 'CONTENT_REQUIRED'
        });
      }

      const result = await this.updateComment.execute({
        commentId,
        content,
        userId
      });

      res.json({
        success: true,
        data: {
          id: result.id,
          content: result.content,
          isEdited: result.isEdited,
          editedAt: result.editedAt,
          editCount: result.editCount,
          minutesSinceCreation: result.minutesSinceCreation
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating comment');
    }
  }

  // DELETE /api/comments/:id - Eliminar comentario
  async delete(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      if (isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID',
          code: 'INVALID_COMMENT_ID'
        });
      }

      const result = await this.deleteComment.execute({
        commentId,
        userId
      });

      res.json({
        success: true,
        data: {
          id: result.id,
          content: result.content,
          deletedAt: result.deletedAt,
          isAuthor: result.isAuthor
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error deleting comment');
    }
  }

  // GET /api/comments/:id/replies - Obtener respuestas
  async getReplies(req: Request, res: Response) {
    try {
      const parentCommentId = parseInt(req.params.id);
      const userId = req.user?.userId;
      
      if (isNaN(parentCommentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID'
        });
      }

      // TODO: Implementar cuando tengamos más tiempo
      res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        message: 'Replies feature coming soon'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching replies');
    }
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);
    
    // Errores específicos de edición
    if (error.message.includes('Cannot edit deleted')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit deleted or hidden comments',
        code: 'COMMENT_NOT_EDITABLE'
      });
    }

    if (error.message.includes('Content is the same')) {
      return res.status(400).json({
        success: false,
        error: 'No changes detected in content',
        code: 'CONTENT_UNCHANGED'
      });
    }

    if (error.message.includes('edit your own')) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments',
        code: 'EDIT_PERMISSION_DENIED'
      });
    }

    if (error.message.includes('delete your own')) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments or need moderator permissions',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    if (error.message.includes('already deleted')) {
      return res.status(400).json({
        success: false,
        error: 'Comment is already deleted',
        code: 'COMMENT_ALREADY_DELETED'
      });
    }

    if (error.message.includes('Cannot edit deleted')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit deleted comment',
        code: 'COMMENT_DELETED'
      });
    }
    
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