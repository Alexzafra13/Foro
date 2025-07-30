import { CommentRepository } from '../../repositories/comment.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ValidationErrors, UserErrors } from '../../../shared/errors';

export interface DeleteCommentRequestDto {
  commentId: number;
  userId: number; // Del JWT
}

export interface DeleteCommentResponseDto {
  id: number;
  content: string; // "[Comentario eliminado]"
  deletedAt: Date;
  deletedBy: number;
  deletionReason: string;
  isAuthor: boolean;
  message: string;
}

// Errores específicos para eliminación de comentarios
export class CommentDeleteErrors {
  static commentNotFound(id: number) {
    return ValidationErrors.invalidFormat('Comment', `comment with id ${id} not found`);
  }

  static commentAlreadyDeleted() {
    return new Error('Comment is already deleted');
  }

  static cannotDeleteComment() {
    return new Error('You can only delete your own comments, or you need moderator permissions');
  }
}

interface DeleteCommentUseCase {
  execute(dto: DeleteCommentRequestDto): Promise<DeleteCommentResponseDto>;
}

export class DeleteComment implements DeleteCommentUseCase {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: DeleteCommentRequestDto): Promise<DeleteCommentResponseDto> {
    const { commentId, userId } = dto;

    // 1. Verificar que el comentario existe
    const existingComment = await this.commentRepository.findById(commentId);
    if (!existingComment) {
      throw CommentDeleteErrors.commentNotFound(commentId);
    }

    // 2. Verificar que no esté ya eliminado
    if (existingComment.isDeleted) {
      throw CommentDeleteErrors.commentAlreadyDeleted();
    }

    // 3. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 4. Verificar permisos de eliminación
    if (!existingComment.canBeDeletedBy(userId, user.role!.name)) {
      throw CommentDeleteErrors.cannotDeleteComment();
    }

    // 5. Determinar el tipo de eliminación
    const isAuthor = existingComment.isAuthor(userId);
    const isModerator = ['admin', 'moderator'].includes(user.role!.name);
    
    let deletionReason: string;
    if (isAuthor) {
      deletionReason = 'user_request';
    } else if (isModerator) {
      deletionReason = 'moderation';
    } else {
      throw CommentDeleteErrors.cannotDeleteComment();
    }

    // 6. Realizar soft delete
    const deletedComment = await this.commentRepository.updateById(commentId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      deletionReason,
      updatedAt: new Date()
    });

    // 7. Retornar confirmación
    return {
      id: deletedComment.id,
      content: deletedComment.getDisplayContent(), // "[Comentario eliminado]"
      deletedAt: deletedComment.deletedAt!,
      deletedBy: userId,
      deletionReason,
      isAuthor,
      message: isAuthor 
        ? 'Comment deleted successfully' 
        : 'Comment removed by moderation'
    };
  }
}