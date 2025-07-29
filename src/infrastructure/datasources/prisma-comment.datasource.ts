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
            votes: true,
            replies: true
          }
        }
      }
    });

    // Calcular voteScore
    const voteScore = await this.calculateVoteScore(comment.id);

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
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
            votes: true,
            replies: true
          }
        }
      }
    });

    if (!comment) return null;

    // Calcular voteScore y voto del usuario
    const [voteScore, userVote] = await Promise.all([
      this.calculateVoteScore(comment.id),
      userId ? this.getUserVote(comment.id, userId) : null
    ]);

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
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where = this.buildWhereClause(filters);

    // Construir orderBy clause
    const orderBy = this.buildOrderByClause(pagination);

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
              votes: true,
              replies: true
            }
          }
        }
      }),
      this.prisma.comment.count({ where })
    ]);

    // Procesar comentarios con scores y votos de usuario
    const commentsWithScores = await Promise.all(
      comments.map(async (comment) => {
        const [voteScore, userVote] = await Promise.all([
          this.calculateVoteScore(comment.id),
          userId ? this.getUserVote(comment.id, userId) : null
        ]);

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
      })
    );

    // Calcular paginación
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: commentsWithScores,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
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
            votes: true,
            replies: true
          }
        }
      }
    });

    const voteScore = await this.calculateVoteScore(comment.id);

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
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
            votes: true,
            replies: true
          }
        }
      }
    });

    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore: 0,
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
    const [voteStats, repliesCount] = await Promise.all([
      this.prisma.commentVote.groupBy({
        by: ['voteType'],
        where: { commentId },
        _count: { voteType: true }
      }),
      this.prisma.comment.count({
        where: { parentCommentId: commentId, isDeleted: false }
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
      // Por defecto: ordenar por fecha de creación
      return { createdAt: 'asc' as const };
    }

    const sortOrder = pagination.sortOrder || 'desc';

    switch (pagination.sortBy) {
      case 'voteScore':
        // Para ordenar por score, primero por createdAt y luego calculamos
        return { createdAt: sortOrder };
      case 'replies':
        return { createdAt: sortOrder }; // Los replies se calculan después
      default:
        return { [pagination.sortBy]: sortOrder };
    }
  }

  private async calculateVoteScore(commentId: number): Promise<number> {
    const result = await this.prisma.commentVote.aggregate({
      where: { commentId },
      _sum: { voteType: true }
    });

    return result._sum.voteType || 0;
  }

  private async getUserVote(commentId: number, userId: number): Promise<1 | -1 | null> {
    const vote = await this.prisma.commentVote.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      }
    });

    return vote ? (vote.voteType as 1 | -1) : null;
  }
}