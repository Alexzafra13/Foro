// src/infrastructure/datasources/prisma-comment.datasource.ts - CORREGIDO COMPLETO
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
            replies: true,
            votes: true
          }
        },
        votes: true // ✅ INCLUIR VOTOS
      }
    });

    // ✅ CALCULAR voteScore Y userVote
    const voteScore = this.calculateVoteScore(comment.votes);
    
    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
      userVote: null, // Para comentarios recién creados
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
            replies: true,
            votes: true
          }
        },
        votes: true // ✅ INCLUIR VOTOS
      }
    });

    if (!comment) return null;

    // ✅ CALCULAR voteScore Y userVote
    const voteScore = this.calculateVoteScore(comment.votes);
    const userVote = userId ? this.getUserVote(comment.votes, userId) : null;

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
      userVote,
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

      // ✅ CONSTRUIR WHERE CLAUSE CORREGIDA
      const where = this.buildWhereClause(filters);

      // Construir orderBy clause
      const orderBy = this.buildOrderByClause(pagination);

      console.log('🔍 PrismaCommentDatasource.findMany with:', { 
        where, 
        orderBy, 
        skip, 
        limit, 
        userId,
        filters 
      });

      // ✅ QUERY DIRECTA PARA DEBUG
      const directCount = await this.prisma.comment.count({ where });
      console.log(`📊 Direct count query result: ${directCount} comments match the where clause`);

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
                replies: true,
                votes: true
              }
            },
            votes: true // ✅ INCLUIR VOTOS
          }
        }),
        this.prisma.comment.count({ where })
      ]);

      console.log(`✅ Raw query results: Found ${comments.length} comments out of ${total} total`);

      // ✅ PROCESAR COMENTARIOS CON VOTOS
      const processedComments = comments.map((comment) => {
        const voteScore = this.calculateVoteScore(comment.votes);
        const userVote = userId ? this.getUserVote(comment.votes, userId) : null;
        
        console.log(`📝 Processing comment ${comment.id}: voteScore=${voteScore}, userVote=${userVote}`);
        
        return CommentEntity.fromObject({ 
          ...comment, 
          voteScore,
          userVote,
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

      const result = {
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

      console.log(`✅ Final result: ${result.data.length} comments with pagination:`, result.pagination);

      return result;
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
            replies: true,
            votes: true
          }
        },
        votes: true // ✅ INCLUIR VOTOS
      }
    });

    const voteScore = this.calculateVoteScore(comment.votes);
    
    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
      userVote: null, // No necesitamos userVote en updates
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
            replies: true,
            votes: true
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
    console.log(`🔍 PrismaCommentDatasource.findByPostId called with:`, { 
      postId, 
      userId, 
      pagination 
    });

    const filters = { 
      postId, 
      parentCommentId: null, // ✅ SOLO comentarios raíz (no respuestas)
      isDeleted: false,      // ✅ SOLO comentarios no eliminados
      isHidden: false        // ✅ SOLO comentarios no ocultos
    };

    console.log(`🔍 Using filters:`, filters);

    const result = await this.findMany(filters, pagination, userId);
    
    console.log(`✅ PrismaCommentDatasource.findByPostId returning ${result.data.length} comments`);
    
    return result;
  }

  async findReplies(
    parentCommentId: number,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    return this.findMany(
      { 
        parentCommentId,
        isDeleted: false,
        isHidden: false
      },
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
      // ✅ OBTENER ESTADÍSTICAS REALES
      const [voteStats, repliesCount] = await Promise.all([
        this.prisma.commentVote.groupBy({
          by: ['voteType'],
          where: { commentId },
          _count: { voteType: true }
        }),
        this.prisma.comment.count({
          where: { 
            parentCommentId: commentId, 
            isDeleted: false,
            isHidden: false
          }
        })
      ]);

      let upvotes = 0;
      let downvotes = 0;

      voteStats.forEach(stat => {
        if (stat.voteType === 1) {
          upvotes = stat._count.voteType;
        } else if (stat.voteType === -1) {
          downvotes = stat._count.voteType;
        }
      });

      const voteScore = upvotes - downvotes;

      return {
        voteScore,
        upvotes,
        downvotes,
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

  // ✅ MÉTODOS AUXILIARES PARA VOTOS
  private calculateVoteScore(votes: any[]): number {
    if (!votes || votes.length === 0) return 0;
    return votes.reduce((sum, vote) => sum + vote.voteType, 0);
  }

  private getUserVote(votes: any[], userId: number): 1 | -1 | null {
    if (!votes || votes.length === 0) return null;
    const userVote = votes.find(vote => vote.userId === userId);
    return userVote ? userVote.voteType : null;
  }

  // ✅ WHERE CLAUSE CORREGIDA
  private buildWhereClause(filters?: CommentFilters) {
    const where: any = {};

    if (filters?.postId) {
      where.postId = filters.postId;
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    // ✅ MANEJAR parentCommentId CORRECTAMENTE
    if (filters?.parentCommentId !== undefined) {
      where.parentCommentId = filters.parentCommentId;
    }

    // ✅ FILTROS DE VISIBILIDAD MEJORADOS
    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    } else if (!filters?.includeDeleted) {
      where.isDeleted = false; // Por defecto, no mostrar eliminados
    }

    if (filters?.isHidden !== undefined) {
      where.isHidden = filters.isHidden;
    } else if (!filters?.includeHidden) {
      where.isHidden = false; // Por defecto, no mostrar ocultos
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