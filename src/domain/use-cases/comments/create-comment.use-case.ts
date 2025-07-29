import { CommentRepository } from '../../repositories/comment.repository';
import { UserRepository } from '../../repositories/user.repository';
import { PostRepository } from '../../repositories/post.repository';
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
    private readonly postRepository: PostRepository
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

    // 4. Si es una respuesta, verificar que el comentario padre existe
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await this.commentRepository.findById(parentCommentId);
      if (!parentComment) {
        throw ValidationErrors.invalidFormat('Parent comment', 'existing comment');
      }

      // Verificar que el comentario padre pertenece al mismo post
      if (parentComment.postId !== postId) {
        throw ValidationErrors.invalidFormat('Parent comment', 'comment from the same post');
      }

      // Verificar que el comentario padre no está eliminado
      if (!parentComment.isVisible()) {
        throw ValidationErrors.invalidFormat('Parent comment', 'visible comment');
      }

      // Limitar profundidad de anidamiento (máximo 3 niveles)
      if (parentComment.parentCommentId !== null) {
        throw ValidationErrors.invalidFormat('Comment', 'maximum nesting depth exceeded');
      }
    }

    // 5. Rate limiting básico (opcional)
    // TODO: Implementar rate limiting por usuario/IP

    // 6. Crear el comentario
    const newComment = await this.commentRepository.create({
      postId,
      authorId,
      content: content.trim(),
      parentCommentId
    });

    // 7. TODO: Crear notificación para el autor del post/comentario padre
    // TODO: Actualizar estadísticas del usuario

    // 8. Formatear y retornar respuesta
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
        role: author.role!
      },
      parentComment: newComment.parentComment,
      stats: {
        voteScore: newComment.voteScore || 0,
        repliesCount: newComment._count?.replies || 0
      }
    };
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

    // Validación básica de contenido spam/malicioso
    const suspiciousPatterns = [
      /(.)\1{10,}/, // Caracteres repetidos
      /https?:\/\/[^\s]+/gi // URLs (opcional - podrías permitirlas)
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw ValidationErrors.invalidFormat('Content', 'appropriate content without spam');
      }
    }
  }
}