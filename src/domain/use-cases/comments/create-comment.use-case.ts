// src/domain/use-cases/comments/create-comment.use-case.ts - ACTUALIZADO CON NOTIFICACIONES
import { CommentRepository } from '../../repositories/comment.repository';
import { UserRepository } from '../../repositories/user.repository';
import { PostRepository } from '../../repositories/post.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { ValidationErrors, UserErrors, PostErrors } from '../../../shared/errors';

export interface CreateCommentRequestDto {
  postId: number;
  content: string;
  authorId: number; // Del JWT
  parentCommentId?: number; // Para respuestas
}

export interface CreateCommentResponseDto {
  id: number;
  postId: number;
  content: string;
  isReply: boolean;
  parentCommentId: number | null;
  createdAt: Date;
  author: {
    id: number;
    username: string;
    reputation: number;
    avatarUrl: string | null;
    role: {
      id: number;
      name: string;
    };
  };
  parentComment?: {
    id: number;
    content: string;
    authorUsername: string;
  };
  stats: {
    voteScore: number;
    repliesCount: number;
  };
}

interface CreateCommentUseCase {
  execute(dto: CreateCommentRequestDto): Promise<CreateCommentResponseDto>;
}

export class CreateComment implements CreateCommentUseCase {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
    private readonly notificationRepository?: NotificationRepository // ✅ NUEVO: Opcional para compatibilidad
  ) {}

  async execute(dto: CreateCommentRequestDto): Promise<CreateCommentResponseDto> {
    const { postId, content, authorId, parentCommentId } = dto;

    // 1. Validaciones básicas
    this.validateInput(content, postId);

    // 2. Verificar que el usuario existe y está verificado
    const author = await this.userRepository.findById(authorId);
    if (!author) {
      throw UserErrors.userNotFound(authorId);
    }

    if (!author.isEmailVerified) {
      throw UserErrors.insufficientPermissions();
    }

    // 3. Verificar que el post existe y no está bloqueado
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    if (post.isLocked) {
      throw PostErrors.postIsLocked();
    }

    // 4. Si es una respuesta, verificar el comentario padre
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await this.validateParentComment(parentCommentId, postId);
    }

    // 5. Crear el comentario
    const newComment = await this.commentRepository.create({
      postId,
      authorId,
      content: content.trim(),
      parentCommentId
    });

    // 6. ✅ NUEVO: Crear notificaciones (sin bloquear la respuesta)
    this.createNotifications(newComment, post, parentComment, author).catch(error => {
      console.error('Error creating notifications:', error);
    });

    // 7. Obtener estadísticas iniciales
    const stats = await this.commentRepository.getCommentStats(newComment.id);

    // 8. Retornar respuesta formateada
    return {
      id: newComment.id,
      postId: newComment.postId,
      content: newComment.content,
      isReply: newComment.isReply(),
      parentCommentId: newComment.parentCommentId,
      createdAt: newComment.createdAt,
      author: {
        id: author.id,
        username: author.username,
        reputation: author.reputation,
        avatarUrl: author.avatarUrl || null,
        role: author.role!
      },
      parentComment: newComment.parentComment,
      stats: {
        voteScore: 0,
        repliesCount: 0
      }
    };
  }

  // ✅ NUEVO: Método para crear notificaciones
  private async createNotifications(
    comment: any,
    post: any,
    parentComment: any,
    author: any
  ): Promise<void> {
    if (!this.notificationRepository) return;

    try {
      // Notificar al autor del post (si no es el mismo que comenta)
      if (post.authorId && post.authorId !== author.id) {
        await this.notificationRepository.create({
          userId: post.authorId,
          type: 'post_reply',
          content: `${author.username} commented on your post`,
          relatedData: {
            postId: post.id,
            commentId: comment.id
          }
        });
      }

      // Si es respuesta a un comentario, notificar al autor del comentario padre
      if (parentComment && parentComment.authorId && parentComment.authorId !== author.id) {
        await this.notificationRepository.create({
          userId: parentComment.authorId,
          type: 'comment_reply',
          content: `${author.username} replied to your comment`,
          relatedData: {
            postId: post.id,
            commentId: comment.id
          }
        });
      }

      // TODO: Detectar menciones en el contenido y notificar
      // const mentions = this.extractMentions(comment.content);
      // for (const username of mentions) { ... }
    } catch (error) {
      // Log pero no fallar
      console.error('Failed to create notifications:', error);
    }
  }

  private async validateParentComment(parentCommentId: number, postId: number): Promise<any> {
    const parentComment = await this.commentRepository.findById(parentCommentId);
    
    if (!parentComment) {
      throw ValidationErrors.invalidFormat('Parent comment', 'existing comment');
    }

    if (parentComment.postId !== postId) {
      throw ValidationErrors.invalidFormat('Parent comment', 'comment from the same post');
    }

    if (!parentComment.isVisible()) {
      throw ValidationErrors.invalidFormat('Parent comment', 'visible comment');
    }

    // No permitir respuestas a respuestas (solo 1 nivel)
    if (parentComment.parentCommentId) {
      throw ValidationErrors.invalidFormat('Parent comment', 'root comment (nested replies not allowed)');
    }

    return parentComment;
  }

  private validateInput(content: string, postId: number): void {
    // Validar contenido
    if (!content || content.trim().length === 0) {
      throw ValidationErrors.requiredField('Content');
    }

    if (content.trim().length < 3) {
      throw ValidationErrors.minLength('Content', 3);
    }

    if (content.trim().length > 2000) {
      throw ValidationErrors.maxLength('Content', 2000);
    }

    // Validar postId
    if (!postId || postId <= 0) {
      throw ValidationErrors.requiredField('Post ID');
    }

    // Validación anti-spam básica
    const suspiciousPatterns = [
      /(.)\1{10,}/, // Caracteres repetidos más de 10 veces
      /https?:\/\/[^\s]+/gi, // URLs (podrías permitirlas si quieres)
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw ValidationErrors.invalidFormat('Content', 'appropriate content without spam');
      }
    }
  }
}