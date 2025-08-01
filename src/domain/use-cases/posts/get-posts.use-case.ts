// src/domain/use-cases/posts/get-posts.use-case.ts - ACTUALIZADO CON avatarUrl
import { PostRepository } from '../../repositories/post.repository';
import { PostFilters, PaginationOptions, PaginatedResult } from '../../datasources/post.datasource';
import { ValidationErrors, AuthErrors } from '../../../shared/errors';

export interface GetPostsRequestDto {
  // ✅ USUARIO REQUERIDO (foro privado)
  userId: number;

  // Filtros
  channelId?: number;
  authorId?: number;
  search?: string;
  
  // Paginación
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'voteScore';
  sortOrder?: 'asc' | 'desc';
}

export interface PostSummaryDto {
  id: number;
  channelId: number;
  title: string;
  content: string;
  views: number; // Truncado para lista
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  author: {
    id: number;
    username: string;
    reputation: number;
    avatarUrl: string | null; // ✅ INCLUIR avatarUrl
  } | null;
  channel: {
    id: number;
    name: string;
  };
  stats: {
    comments: number;
    votes: number;
    voteScore: number;
    views: number;
  };
  // ✅ CAMPOS DE VOTOS PRINCIPALES
  voteScore: number;
  userVote: 1 | -1 | null;
}

export interface GetPostsResponseDto {
  posts: PostSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface GetPostsUseCase {
  execute(dto: GetPostsRequestDto): Promise<GetPostsResponseDto>;
}

export class GetPosts implements GetPostsUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute(dto: GetPostsRequestDto): Promise<GetPostsResponseDto> {
    const { userId } = dto;

    // ✅ VALIDAR AUTENTICACIÓN (foro privado)
    if (!userId) {
      throw AuthErrors.tokenRequired();
    }

    // 1. Validar y normalizar parámetros
    const filters = this.buildFilters(dto);
    const pagination = this.buildPagination(dto);

    // 2. Obtener posts del repositorio CON userId
    const result = await this.postRepository.findMany(filters, pagination, userId);

    // 3. Formatear respuesta
    return {
      posts: result.data.map(post => this.formatPostSummary(post)),
      pagination: result.pagination
    };
  }

  private buildFilters(dto: GetPostsRequestDto): PostFilters {
    const filters: PostFilters = {};

    if (dto.channelId && dto.channelId > 0) {
      filters.channelId = dto.channelId;
    }

    if (dto.authorId && dto.authorId > 0) {
      filters.authorId = dto.authorId;
    }

    if (dto.search && dto.search.trim().length > 0) {
      filters.search = dto.search.trim();
    }

    return filters;
  }

  private buildPagination(dto: GetPostsRequestDto): PaginationOptions {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(50, Math.max(1, dto.limit || 20)); // Max 50 posts por página

    // Validar sortBy
    const validSortFields = ['createdAt', 'updatedAt', 'title', 'voteScore'];
    const sortBy = validSortFields.includes(dto.sortBy || '') 
      ? dto.sortBy as any 
      : 'createdAt';

    const sortOrder = dto.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, sortBy, sortOrder };
  }

  private formatPostSummary(post: any): PostSummaryDto {
    return {
      id: post.id,
      channelId: post.channelId,
      title: post.title,
      content: this.truncateContent(post.content, 300),
      views: post.views || 0,
      isLocked: post.isLocked,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        reputation: post.author.reputation,
        avatarUrl: post.author.avatarUrl || null // ✅ INCLUIR avatarUrl
      } : null,
      channel: {
        id: post.channel.id,
        name: post.channel.name
      },
      stats: {
        comments: post._count?.comments || 0,
        votes: post._count?.votes || 0,
        voteScore: post.voteScore || 0,
        views: post.views || 0
      },
      // ✅ CAMPOS DE VOTOS PRINCIPALES
      voteScore: post.voteScore || 0,
      userVote: post.userVote || null
    };
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  }
}