// src/domain/use-cases/moderation/get-moderated-comments.use-case.ts
import { CommentRepository } from '../../repositories/comment.repository';
import { UserRepository } from '../../repositories/user.repository';
import { CommentPaginationOptions, CommentFilters } from '../../datasources/comment.datasource';
import { UserErrors } from '../../../shared/errors';

export interface GetModeratedCommentsRequestDto {
  requesterId: number; // Admin/Moderator que hace la consulta
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'voteScore' | 'replies';
  sortOrder?: 'asc' | 'desc';
  status?: 'hidden' | 'visible' | 'all'; // Filtro por estado
}

export interface ModeratedCommentDto {
  id: number;
  postId: number;
  content: string;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  
  // Información del autor
  author: {
    id: number;
    username: string;
    role: string;
  } | null;
  
  // Información del post
  post: {
    id: number;
    title: string;
    channelName: string;
  };
  
  // Información del moderador (si aplica)
  moderatedBy: {
    id: number;
    username: string;
    role: string;
  } | null;
  
  // Estadísticas
  stats: {
    voteScore: number;
    repliesCount: number;
  };
}

export interface GetModeratedCommentsResponseDto {
  comments: ModeratedCommentDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalHidden: number;
    totalVisible: number;
    totalModerated: number;
  };
}

export class GetModeratedComments {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetModeratedCommentsRequestDto): Promise<GetModeratedCommentsResponseDto> {
    const { requesterId, status = 'all' } = dto;

    // 1. Verificar permisos del solicitante
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Construir parámetros de paginación
    const pagination = this.buildPagination(dto);

    // 3. Definir filtros según el estado solicitado
    const filters = this.buildFilters(status);

    // 4. Obtener comentarios moderados
    const result = await this.commentRepository.findMany(filters, pagination);

    // 5. Formatear comentarios con información adicional
    const formattedComments = await Promise.all(
      result.data.map(comment => this.formatModeratedComment(comment))
    );

    // 6. Obtener estadísticas de resumen
    const summary = await this.getModerationSummary();

    return {
      comments: formattedComments,
      pagination: result.pagination,
      summary
    };
  }

  private buildPagination(dto: GetModeratedCommentsRequestDto): CommentPaginationOptions {
    return {
      page: Math.max(1, dto.page || 1),
      limit: Math.min(100, Math.max(1, dto.limit || 20)),
      sortBy: dto.sortBy || 'createdAt',
      sortOrder: dto.sortOrder || 'desc'
    };
  }

  private buildFilters(status: string): CommentFilters {
    const baseFilters: CommentFilters = {
      isDeleted: false // No incluir comentarios eliminados permanentemente
    };

    switch (status) {
      case 'hidden':
        return { ...baseFilters, isHidden: true };
      case 'visible':
        return { ...baseFilters, isHidden: false };
      case 'all':
      default:
        // Todos los comentarios (tanto ocultos como visibles)
        return baseFilters;
    }
  }

  private async formatModeratedComment(comment: any): Promise<ModeratedCommentDto> {
    // Obtener estadísticas del comentario
    const stats = await this.commentRepository.getCommentStats(comment.id);

    // Obtener información del moderador si existe deletedBy
    let moderatedBy = null;
    if (comment.deletedBy) {
      const moderator = await this.userRepository.findById(comment.deletedBy);
      if (moderator) {
        moderatedBy = {
          id: moderator.id,
          username: moderator.username,
          role: moderator.role?.name || 'unknown'
        };
      }
    }

    return {
      id: comment.id,
      postId: comment.postId,
      content: comment.content.length > 200 
        ? comment.content.substring(0, 200) + '...' 
        : comment.content,
      isHidden: comment.isHidden ?? false,
      isDeleted: comment.isDeleted ?? false,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,

      author: comment.author ? {
        id: comment.author.id,
        username: comment.author.username,
        role: comment.author.role?.name || 'user'
      } : null,

      post: {
        id: comment.post?.id || comment.postId,
        title: comment.post?.title || 'Post eliminado',
        channelName: comment.post?.channel?.name || 'Canal desconocido'
      },

      moderatedBy,

      stats: {
        voteScore: stats.voteScore ?? 0,
        repliesCount: stats.repliesCount ?? 0
      }
    };
  }

  private async getModerationSummary(): Promise<{ 
    totalHidden: number; 
    totalVisible: number; 
    totalModerated: number; 
  }> {
    // Obtener comentarios ocultos
    const hiddenResult = await this.commentRepository.findMany(
      { isHidden: true, isDeleted: false },
      { page: 1, limit: 1 }
    );

    // Obtener comentarios visibles
    const visibleResult = await this.commentRepository.findMany(
      { isHidden: false, isDeleted: false },
      { page: 1, limit: 1 }
    );

    const totalHidden = hiddenResult.pagination.total;
    const totalVisible = visibleResult.pagination.total;
    const totalModerated = totalHidden; // Por ahora, consideramos moderados solo los ocultos

    return {
      totalHidden,
      totalVisible,
      totalModerated
    };
  }
}