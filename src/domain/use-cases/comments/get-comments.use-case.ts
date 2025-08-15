// src/domain/use-cases/comments/get-comments.use-case.ts - ACTUALIZADA PARA FORO PRIVADO CON MODERACIÓN
import { CommentRepository } from '../../repositories/comment.repository';
import { PostRepository } from '../../repositories/post.repository';
import { CommentPaginationOptions } from '../../datasources/comment.datasource';
import { PostErrors, AuthErrors } from '../../../shared/errors';

export interface GetCommentsRequestDto {
  postId: number;
  userId: number; // ✅ REQUERIDO (foro privado)
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'voteScore' | 'replies';
  sortOrder?: 'asc' | 'desc';
  includeReplies?: boolean; 
}

export interface CommentSummaryDto {
  id: number;
  postId: number;
  content: string;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  isReply: boolean;
  parentCommentId: number | null;
  
  // ✅ CRÍTICO: Añadir propiedades de moderación
  isHidden: boolean;
  isDeleted: boolean;
  
  author: {
    id: number;
    username: string;
    reputation: number;
    avatarUrl: string | null;
    role: {
      id: number;
      name: string;
    };
  } | null;
  parentComment?: {
    id: number;
    content: string;
    authorUsername: string;
  };
  stats: {
    voteScore: number;
    repliesCount: number;
    upvotes: number;
    downvotes: number;
  };
  // ✅ CAMPOS DE VOTOS PRINCIPALES
  voteScore: number;
  userVote: 1 | -1 | null; // Voto del usuario actual
  replies?: CommentSummaryDto[]; // Respuestas anidadas (opcional)
}

export interface GetCommentsResponseDto {
  comments: CommentSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  postInfo: {
    id: number;
    title: string;
    isLocked: boolean;
    totalComments: number;
  };
}

interface GetCommentsUseCase {
  execute(dto: GetCommentsRequestDto): Promise<GetCommentsResponseDto>;
}

export class GetComments implements GetCommentsUseCase {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository
  ) {}

  async execute(dto: GetCommentsRequestDto): Promise<GetCommentsResponseDto> {
    const { postId, userId, includeReplies = false } = dto;

    // ✅ VALIDAR AUTENTICACIÓN (foro privado)
    if (!userId) {
      throw AuthErrors.tokenRequired();
    }

    // 1. Verificar que el post existe
    const post = await this.postRepository.findById(postId, userId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    // 2. Construir parámetros de paginación
    const pagination = this.buildPagination(dto);

    // 3. Obtener comentarios raíz (no respuestas) CON userId
    console.log(`🔍 Getting comments for post ${postId} with userId ${userId}`);
    const result = await this.commentRepository.findByPostId(postId, pagination, userId);
    console.log(`✅ Found ${result.data.length} comments with pagination:`, result.pagination);

    // 4. Formatear comentarios base
    const formattedComments = await Promise.all(
      result.data.map(async (comment) => {
        let replies: CommentSummaryDto[] = [];
        
        // 5. Si se solicitan respuestas, cargarlas
        if (includeReplies) {
          replies = await this.loadReplies(comment.id, userId);
        }
        
        // 6. Formatear el comentario principal
        const formattedComment = await this.formatComment(comment);
        
        // 7. Agregar replies si existen
        if (includeReplies && replies.length > 0) {
          formattedComment.replies = replies;
        }
        
        return formattedComment;
      })
    );

    // 8. Obtener estadísticas del post
    const totalComments = await this.getTotalCommentsCount(postId);

    // 9. Retornar respuesta
    return {
      comments: formattedComments,
      pagination: result.pagination,
      postInfo: {
        id: post.id,
        title: post.title,
        isLocked: post.isLocked,
        totalComments
      }
    };
  }

  private buildPagination(dto: GetCommentsRequestDto): CommentPaginationOptions {
    return {
      page: Math.max(1, dto.page || 1),
      limit: Math.min(50, Math.max(1, dto.limit || 20)),
      sortBy: dto.sortBy || 'createdAt',
      sortOrder: dto.sortOrder || 'asc'
    };
  }

  private async loadReplies(parentCommentId: number, userId: number): Promise<CommentSummaryDto[]> {
    const repliesResult = await this.commentRepository.findReplies(
      parentCommentId, 
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'asc' }, // Máximo 10 respuestas por comentario
      userId // ✅ PASAR userId
    );

    return Promise.all(
      repliesResult.data.map(reply => this.formatComment(reply))
    );
  }

  // ✅ MÉTODO formatComment CORREGIDO CON isHidden e isDeleted
  private async formatComment(comment: any): Promise<CommentSummaryDto> {
    // Obtener estadísticas detalladas del comentario
    const stats = await this.commentRepository.getCommentStats(comment.id);

    console.log(`🔍 Formatting comment ${comment.id}:`, {
      isHidden: comment.isHidden,
      isDeleted: comment.isDeleted,
      rawComment: comment
    });

    const formatted: CommentSummaryDto = {
      id: comment.id,
      postId: comment.postId,
      content: comment.getDisplayContent(), // Usar el método de la entidad
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      isReply: comment.isReply(),
      parentCommentId: comment.parentCommentId,
      
      // ✅ CRÍTICO: Incluir propiedades de moderación con valores por defecto
      isHidden: comment.isHidden ?? false,
      isDeleted: comment.isDeleted ?? false,
      
      author: comment.author ? {
        id: comment.author.id,
        username: comment.author.username,
        reputation: comment.author.reputation ?? 0,
        avatarUrl: comment.author.avatarUrl || null,
        role: comment.author.role || { id: 1, name: 'user' }
      } : null,
      
      parentComment: comment.parentComment,
      
      stats: {
        voteScore: stats.voteScore ?? 0,
        repliesCount: stats.repliesCount ?? 0,
        upvotes: stats.upvotes ?? 0,
        downvotes: stats.downvotes ?? 0
      },
      
      // ✅ CAMPOS DE VOTOS PRINCIPALES
      voteScore: comment.voteScore ?? stats.voteScore ?? 0,
      userVote: comment.userVote || null
    };

    console.log(`✅ Formatted comment ${comment.id}:`, {
      isHidden: formatted.isHidden,
      isDeleted: formatted.isDeleted,
      hasAuthor: !!formatted.author
    });

    return formatted;
  }

  // ✅ ACTUALIZADO: Incluir comentarios moderados en el conteo total
  private async getTotalCommentsCount(postId: number): Promise<number> {
    // Solo excluir comentarios eliminados, NO los moderados
    const result = await this.commentRepository.findMany(
      { 
        postId, 
        isDeleted: false 
        // ✅ REMOVIDO: isHidden: false - Los comentarios moderados se cuentan
      },
      { page: 1, limit: 1 }
    );
    return result.pagination.total;
  }
}