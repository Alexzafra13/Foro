// src/domain/use-cases/moderation/get-moderated-posts.use-case.ts - CORREGIDO PARA OBTENER MODERADOR REAL

import { PostRepository } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';

export interface GetModeratedPostsRequestDto {
  moderatorId: number;
  status?: 'hidden' | 'visible' | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'views' | 'author';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  channelId?: number;
}

export interface ModeratedPostDto {
  id: number;
  channelId: number;
  title: string;
  content: string;
  views: number;
  isHidden: boolean;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  
  author: {
    id: number;
    username: string;
    role: string;
  } | null;
  
  channel: {
    id: number;
    name: string;
  };
  
  moderatedBy?: {
    id: number;
    username: string;
    role: string;
  } | null;
  
  stats: {
    commentsCount: number;
    voteScore: number;
  };
  
  moderationInfo?: {
    reason: string | null;
    moderatedAt: Date | null;
  };
}

export interface GetModeratedPostsResponseDto {
  posts: ModeratedPostDto[];
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

interface GetModeratedPostsUseCase {
  execute(dto: GetModeratedPostsRequestDto): Promise<GetModeratedPostsResponseDto>;
}

export class GetModeratedPosts implements GetModeratedPostsUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetModeratedPostsRequestDto): Promise<GetModeratedPostsResponseDto> {
    const { moderatorId, status = 'all' } = dto;

    // Verificar permisos de moderador
    const moderator = await this.userRepository.findById(moderatorId);
    if (!moderator || !moderator.role || !['admin', 'moderator'].includes(moderator.role.name)) {
      throw new Error('Insufficient permissions for moderation');
    }

    // Construir parámetros de paginación
    const pagination = {
      page: Math.max(1, dto.page || 1),
      limit: Math.min(100, Math.max(1, dto.limit || 20)),
      sortBy: dto.sortBy || 'createdAt',
      sortOrder: dto.sortOrder || 'desc'
    };

    // Construir filtros
    const filters: any = {};
    
    if (status === 'hidden') {
      filters.isHidden = true;
    } else if (status === 'visible') {
      filters.isHidden = false;
    }
    
    if (dto.search) {
      filters.search = dto.search;
    }
    
    if (dto.channelId) {
      filters.channelId = dto.channelId;
    }

    // Obtener posts
    const result = await this.postRepository.findMany(filters, pagination);

    // ✅ CORREGIDO: Formatear posts con información completa del moderador real
    const formattedPosts: ModeratedPostDto[] = await Promise.all(
      result.data.map(async (post) => {
        let moderatedBy = null;
        
        // ✅ BUSCAR EL USUARIO REAL DEL MODERADOR
        if (post.deletedBy) {
          try {
            const moderatorUser = await this.userRepository.findById(post.deletedBy);
            if (moderatorUser && moderatorUser.role) {
              moderatedBy = {
                id: moderatorUser.id,
                username: moderatorUser.username,
                role: moderatorUser.role.name
              };
            } else {
              // Fallback si el usuario fue eliminado o no tiene rol
              moderatedBy = {
                id: post.deletedBy,
                username: 'Usuario eliminado',
                role: 'unknown'
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch moderator ${post.deletedBy}:`, error);
            // Fallback en caso de error
            moderatedBy = {
              id: post.deletedBy,
              username: 'Moderador',
              role: 'moderator'
            };
          }
        }

        return {
          id: post.id,
          channelId: post.channelId,
          title: post.title.length > 100 ? post.title.substring(0, 100) + '...' : post.title,
          content: post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content,
          views: post.views,
          isHidden: post.isHidden,
          isPinned: post.isPinned,
          isLocked: post.isLocked,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,

          author: post.author ? {
            id: post.author.id,
            username: post.author.username,
            role: post.author.role?.name || 'user'
          } : null,

          channel: {
            id: post.channel?.id || post.channelId,
            name: post.channel?.name || 'Canal desconocido'
          },

          moderatedBy, // ✅ AHORA CONTIENE EL USUARIO REAL

          stats: {
            commentsCount: post._count?.comments || 0,
            voteScore: post.voteScore || 0
          },

          moderationInfo: post.isHidden ? {
            reason: post.deletionReason,
            moderatedAt: post.updatedAt
          } : undefined
        };
      })
    );

    // Obtener estadísticas de resumen
    const summary = {
      totalHidden: result.data.filter(p => p.isHidden).length,
      totalVisible: result.data.filter(p => !p.isHidden).length,
      totalModerated: result.data.filter(p => p.isHidden).length
    };

    return {
      posts: formattedPosts,
      pagination: result.pagination,
      summary
    };
  }
}