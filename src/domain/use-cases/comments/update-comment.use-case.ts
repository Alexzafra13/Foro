import { CommentRepository } from '../../repositories/comment.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ValidationErrors, UserErrors } from '../../../shared/errors';

export interface UpdateCommentRequestDto {
  commentId: number;
  content: string;
  userId: number; // Del JWT
}

export interface UpdateCommentResponseDto {
  id: number;
  content: string;
  isEdited: boolean;
  editedAt: Date;
  editCount: number;
  updatedAt: Date;
  minutesSinceCreation: number; // Para mostrar "hace X tiempo"
  message: string;
}

// Errores específicos para edición de comentarios
export class CommentEditErrors {
  static commentNotFound(id: number) {
    return ValidationErrors.invalidFormat('Comment', `comment with id ${id} not found`);
  }

  static cannotEditComment() {
    return new Error('You can only edit your own comments');
  }

  static editTimeExpired() {
    return new Error('Cannot edit deleted or hidden comments');
  }

  static commentDeleted() {
    return new Error('Cannot edit deleted comment');
  }

  static contentNotChanged() {
    return new Error('Content is the same as current version');
  }
}

interface UpdateCommentUseCase {
  execute(dto: UpdateCommentRequestDto): Promise<UpdateCommentResponseDto>;
}

export class UpdateComment implements UpdateCommentUseCase {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: UpdateCommentRequestDto): Promise<UpdateCommentResponseDto> {
    const { commentId, content, userId } = dto;

    // 1. Validar contenido
    this.validateContent(content);

    // 2. Verificar que el comentario existe
    const existingComment = await this.commentRepository.findById(commentId);
    if (!existingComment) {
      throw CommentEditErrors.commentNotFound(commentId);
    }

    // 3. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 4. Verificar permisos de edición
    if (!existingComment.canBeEditedBy(userId, user.role!.name)) {
      if (existingComment.isDeleted || existingComment.isHidden) {
        throw CommentEditErrors.commentDeleted();
      }
      throw CommentEditErrors.cannotEditComment();
    }

    // 5. Verificar que el comentario puede ser editado (no eliminado/oculto)
    const editInfo = existingComment.getEditInfo();
    
    if (!editInfo.canStillEdit) {
      throw CommentEditErrors.editTimeExpired();
    }

    // 6. Verificar que el contenido es diferente
    if (existingComment.content.trim() === content.trim()) {
      throw CommentEditErrors.contentNotChanged();
    }

    // 7. Actualizar el comentario
    const currentEditCount = existingComment.editCount || 0;
    
    const updatedComment = await this.commentRepository.updateById(commentId, {
      content: content.trim(),
      isEdited: true,
      editedAt: new Date(),
      editCount: currentEditCount + 1,
      updatedAt: new Date()
    });

    // 8. Calcular información actualizada
    const newEditInfo = updatedComment.getEditInfo();

    // 9. Retornar respuesta
    return {
      id: updatedComment.id,
      content: updatedComment.content,
      isEdited: updatedComment.isEdited,
      editedAt: updatedComment.editedAt!,
      editCount: updatedComment.editCount,
      updatedAt: updatedComment.updatedAt!,
      minutesSinceCreation: newEditInfo.minutesSinceCreation,
      message: `Comment updated successfully (edit ${updatedComment.editCount})`
    };
  }

  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw ValidationErrors.requiredField('Content');
    }

    if (content.trim().length < 3) {
      throw ValidationErrors.minLength('Content', 3);
    }

    if (content.trim().length > 2000) {
      throw ValidationErrors.maxLength('Content', 2000);
    }

    // Validación básica anti-spam
    const suspiciousPatterns = [
      /(.)\1{10,}/, // Caracteres repetidos más de 10 veces
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw ValidationErrors.invalidFormat('Content', 'appropriate content without spam patterns');
      }
    }
  }
}