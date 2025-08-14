// src/presentation/controllers/comment.controller.ts - COMPLETO CON MODERACIÓN MEJORADA
import { Request, Response } from 'express';
import { CreateComment } from '../../domain/use-cases/comments/create-comment.use-case';
import { GetComments } from '../../domain/use-cases/comments/get-comments.use-case';
import { UpdateComment } from '../../domain/use-cases/comments/update-comment.use-case';
import { DeleteComment } from '../../domain/use-cases/comments/delete-comment.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';
import { CommentRepository } from '../../domain/repositories/comment.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
// ✅ AGREGAR PARA NOTIFICACIONES
import { CreateNotification } from '../../domain/use-cases/notifications/create-notification.use-case';

export class CommentController {
  constructor(
    private readonly createComment: CreateComment,
    private readonly getComments: GetComments,
    private readonly updateComment: UpdateComment,
    private readonly deleteComment: DeleteComment,
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository,
    // ✅ AGREGAR USE CASE DE NOTIFICACIONES
    private readonly createNotification: CreateNotification
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
      
      console.log(`🔍 CommentController.getByPostId called with:`, { 
        postId, 
        userId, 
        userExists: !!req.user,
        rawPostId: req.params.postId 
      });

      if (isNaN(postId)) {
        console.log(`❌ Invalid postId: ${req.params.postId}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID'
        });
      }

      if (!userId) {
        console.log(`❌ No userId found in request`);
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const {
        page,
        limit,
        sortBy,
        sortOrder,
        includeReplies
      } = req.query;

      console.log(`🔍 Getting comments for post ${postId} by user ${userId}`);

      const result = await this.getComments.execute({
        postId,
        userId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
        includeReplies: includeReplies === 'true'
      });

      console.log(`✅ Returning ${result.comments.length} comments with pagination:`, result.pagination);

      res.json({
        success: true,
        data: result.comments,
        pagination: result.pagination,
        postInfo: result.postInfo,
        message: `Found ${result.comments.length} comments`
      });
    } catch (error) {
      console.error(`❌ Error in getByPostId:`, error);
      this.handleError(error, res, 'Error fetching comments');
    }
  }

  // PUT /api/comments/:id - Editar comentario
  async update(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const { content } = req.body;
      const userId = req.user?.userId!;

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

  // GET /api/comments/:id/replies
  async getReplies(req: Request, res: Response) {
    try {
      const parentCommentId = parseInt(req.params.id);
      const userId = req.user?.userId!;
      
      if (isNaN(parentCommentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID'
        });
      }

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
        message: 'Replies feature working - but empty for now'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching replies');
    }
  }

  // ✅ MEJORADO: Ocultar comentario por moderación CON VALIDACIONES ADICIONALES
  async hideByModeration(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const moderatorId = req.user?.userId!;

      console.log(`🔍 Attempting to hide comment ${commentId} by moderator ${moderatorId}`);

      if (isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID',
          code: 'INVALID_COMMENT_ID'
        });
      }

      // Verificar que el comentario existe
      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found',
          code: 'COMMENT_NOT_FOUND'
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

      // Verificar que no está intentando moderar su propio comentario
      if (comment.isAuthor(moderatorId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot moderate your own comments',
          code: 'CANNOT_MODERATE_OWN_COMMENT'
        });
      }

      // ✅ NUEVA VALIDACIÓN: Verificar que el comentario no está ya oculto
      if (comment.isHidden) {
        return res.status(400).json({
          success: false,
          error: 'Comment is already hidden',
          code: 'COMMENT_ALREADY_HIDDEN'
        });
      }

      console.log(`🔄 Hiding comment ${commentId}...`);

      // Ocultar comentario
      const updatedComment = await this.commentRepository.updateById(commentId, {
        isHidden: true,
        deletedBy: moderatorId,
        deletionReason: 'moderation',
        updatedAt: new Date()
      });

      console.log(`✅ Comment ${commentId} hidden successfully`);

      // ✅ ENVIAR NOTIFICACIÓN AL AUTOR DEL COMENTARIO
      if (comment.authorId && comment.authorId !== moderatorId) {
        try {
          const notificationDto = CreateNotification.forModeration(
            comment.authorId,
            'comment_hidden',
            moderator.username,
            comment.id,
            comment.postId
          );
          
          await this.createNotification.execute(notificationDto);
          console.log(`📬 Moderation notification sent to user ${comment.authorId}`);
        } catch (notifError) {
          console.error('Failed to send moderation notification:', notifError);
          // No fallar la operación si falla la notificación
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedComment.id,
          isHidden: true,
          moderatedBy: {
            id: moderator.id,
            username: moderator.username,
            role: moderator.role!.name
          },
          moderatedAt: new Date()
        },
        message: 'Comment hidden by moderation'
      });
    } catch (error) {
      console.error('❌ Error in hideByModeration:', error);
      this.handleError(error, res, 'Error hiding comment');
    }
  }

  // ✅ COMPLETADO: Mostrar comentario oculto CON VALIDACIONES ADICIONALES
  async unhideByModeration(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const moderatorId = req.user?.userId!;

      console.log(`🔍 Attempting to unhide comment ${commentId} by moderator ${moderatorId}`);

      if (isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID',
          code: 'INVALID_COMMENT_ID'
        });
      }

      // Verificar que el comentario existe
      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found',
          code: 'COMMENT_NOT_FOUND'
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

      // Verificar que no está intentando restaurar su propio comentario
      if (comment.isAuthor(moderatorId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot moderate your own comments',
          code: 'CANNOT_MODERATE_OWN_COMMENT'
        });
      }

      // ✅ NUEVA VALIDACIÓN: Verificar que el comentario está realmente oculto
      if (!comment.isHidden) {
        return res.status(400).json({
          success: false,
          error: 'Comment is not hidden',
          code: 'COMMENT_NOT_HIDDEN'
        });
      }

      console.log(`🔄 Restoring comment ${commentId}...`);

      // Restaurar comentario
      const updatedComment = await this.commentRepository.updateById(commentId, {
        isHidden: false,
        deletedBy: null,
        deletionReason: null,
        updatedAt: new Date()
      });

      console.log(`✅ Comment ${commentId} restored successfully`);

      // ✅ ENVIAR NOTIFICACIÓN AL AUTOR DEL COMENTARIO
      if (comment.authorId && comment.authorId !== moderatorId) {
        try {
          const notificationDto = CreateNotification.forModeration(
            comment.authorId,
            'comment_restored',
            moderator.username,
            comment.id,
            comment.postId
          );
          
          await this.createNotification.execute(notificationDto);
          console.log(`📬 Restoration notification sent to user ${comment.authorId}`);
        } catch (notifError) {
          console.error('Failed to send restoration notification:', notifError);
          // No fallar la operación si falla la notificación
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedComment.id,
          isHidden: false,
          restoredBy: {
            id: moderator.id,
            username: moderator.username,
            role: moderator.role!.name
          },
          restoredAt: new Date()
        },
        message: 'Comment restored by moderation'
      });
    } catch (error) {
      console.error('❌ Error in unhideByModeration:', error);
      this.handleError(error, res, 'Error restoring comment');
    }
  }

  // ✅ MEJORADO: Error handling con casos específicos de moderación
  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);
    
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

    if (error.message.includes('delete your own') || error.message.includes('insufficient permissions')) {
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

    // ✅ NUEVOS: Errores específicos de moderación
    if (error.message.includes('already hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Comment is already hidden',
        code: 'COMMENT_ALREADY_HIDDEN'
      });
    }

    if (error.message.includes('not hidden')) {
      return res.status(400).json({
        success: false,
        error: 'Comment is not hidden',
        code: 'COMMENT_NOT_HIDDEN'
      });
    }

    if (error.message.includes('moderate your own')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot moderate your own comments',
        code: 'CANNOT_MODERATE_OWN_COMMENT'
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