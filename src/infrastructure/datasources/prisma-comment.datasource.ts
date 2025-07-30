// src/infrastructure/datasources/prisma-comment.datasource.ts
// FIX TEMPORAL: Comentarios sin sistema de votos para resolver error 500

import { PrismaClient } from '@prisma/client';
import { 
  CommentDatasource, 
  CreateCommentDto, 
  UpdateCommentDto, 
  CommentFilters, 
  CommentPaginationOptions, 
  PaginatedCommentsResult 
} from '../../domain/datasources/comment.datasource';
import { CommentEntity } from '../../domain/entities/comment.entity';

export class PrismaCommentDatasource implements CommentDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createCommentDto: CreateCommentDto): Promise<CommentEntity> {
    const comment = await this.prisma.comment.create({
      data: createCommentDto,
      include: {
        author: {
          include: { role: true }
        },
        parentComment: {
          include: {
            author: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore: 0, // Temporal: sin sistema de votos
      userVote: null,
      parentComment: comment.parentComment ? {
        id: comment.parentComment.id,
        content: comment.parentComment.content.substring(0, 50) + '...',
        authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
      } : undefined
    });
  }

  async findById(id: number, userId?: number): Promise<CommentEntity | null> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          include: { role: true }
        },
        parentComment: {
          include: {
            author: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    if (!comment) return null;

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore: 0, // Temporal: sin sistema de votos
      userVote: null,
      parentComment: comment.parentComment ? {
        id: comment.parentComment.id,
        content: comment.parentComment.content.substring(0, 50) + '...',
        authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
      } : undefined
    });
  }

  async findMany(
    filters?: CommentFilters,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      // Construir where clause
      const where = this.buildWhereClause(filters);

      // Construir orderBy clause
      const orderBy = this.buildOrderByClause(pagination);

      console.log('🔍 Finding comments with:', { where, orderBy, skip, limit });

      // Ejecutar queries en paralelo
      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            author: {
              include: { role: true }
            },
            parentComment: {
              include: {
                author: true
              }
            },
            _count: {
              select: {
                replies: true
              }
            }
          }
        }),
        this.prisma.comment.count({ where })
      ]);

      console.log(`✅ Found ${comments.length} comments out of ${total} total`);

      // Procesar comentarios sin sistema de votos (temporal)
      const processedComments = comments.map((comment) => {
        return CommentEntity.fromObject({ 
          ...comment, 
          voteScore: 0, // Temporal: sin sistema de votos
          userVote: null,
          parentComment: comment.parentComment ? {
            id: comment.parentComment.id,
            content: comment.parentComment.content.substring(0, 50) + '...',
            authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
          } : undefined
        });
      });

      // Calcular paginación
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: processedComments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      };
    } catch (error) {
      console.error('❌ Error in findMany comments:', error);
      throw new Error(`Failed to fetch comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateById(id: number, updateDto: UpdateCommentDto): Promise<CommentEntity> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: updateDto,
      include: {
        author: {
          include: { role: true }
        },
        parentComment: {
          include: {
            author: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore: 0, // Temporal: sin sistema de votos
      userVote: null,
      parentComment: comment.parentComment ? {
        id: comment.parentComment.id,
        content: comment.parentComment.content.substring(0, 50) + '...',
        authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
      } : undefined
    });
  }

  async deleteById(id: number): Promise<CommentEntity> {
    const comment = await this.prisma.comment.delete({
      where: { id },
      include: {
        author: {
          include: { role: true }
        },
        parentComment: {
          include: {
            author: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore: 0,
      userVote: null,
      parentComment: comment.parentComment ? {
        id: comment.parentComment.id,
        content: comment.parentComment.content.substring(0, 50) + '...',
        authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
      } : undefined
    });
  }

  async findByPostId(
    postId: number, 
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    console.log(`🔍 Finding comments for post ${postId}`);
    return this.findMany(
      { postId, parentCommentId: null }, // Solo comentarios raíz
      pagination,
      userId
    );
  }

  async findReplies(
    parentCommentId: number,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    return this.findMany(
      { parentCommentId },
      pagination,
      userId
    );
  }

  async getCommentStats(commentId: number): Promise<{
    voteScore: number;
    upvotes: number;
    downvotes: number;
    repliesCount: number;
  }> {
    try {
      const repliesCount = await this.prisma.comment.count({
        where: { parentCommentId: commentId, isDeleted: false }
      });

      return {
        voteScore: 0, // Temporal: sin sistema de votos
        upvotes: 0,
        downvotes: 0,
        repliesCount
      };
    } catch (error) {
      console.error(`Error getting comment stats for ${commentId}:`, error);
      return {
        voteScore: 0,
        upvotes: 0,
        downvotes: 0,
        repliesCount: 0
      };
    }
  }

  // Métodos privados auxiliares
  private buildWhereClause(filters?: CommentFilters) {
    const where: any = {};

    if (filters?.postId) {
      where.postId = filters.postId;
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters?.parentCommentId !== undefined) {
      where.parentCommentId = filters.parentCommentId;
    }

    // Por defecto, no mostrar comentarios eliminados u ocultos
    if (!filters?.includeDeleted) {
      where.isDeleted = false;
    }

    if (!filters?.includeHidden) {
      where.isHidden = false;
    }

    // Filtros específicos para moderación
    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    }

    if (filters?.isHidden !== undefined) {
      where.isHidden = filters.isHidden;
    }

    return where;
  }

  private buildOrderByClause(pagination?: CommentPaginationOptions) {
    if (!pagination?.sortBy) {
      // Por defecto: ordenar por fecha de creación ascendente (comentarios más antiguos primero)
      return { createdAt: 'asc' as const };
    }

    const sortOrder = pagination.sortOrder || 'desc';

    switch (pagination.sortBy) {
      case 'voteScore':
        // Para ordenar por score, por ahora usar fecha
        return { createdAt: sortOrder };
      case 'replies':
        return { createdAt: sortOrder };
      default:
        return { [pagination.sortBy]: sortOrder };
    }
  }
}