// src/infrastructure/datasources/prisma-comment.datasource.ts
import { PrismaClient } from '@prisma/client';
import { 
  CommentDatasource, 
  CreateCommentDto, 
  UpdateCommentDto, 
  CommentFilters, 
  CommentPaginationOptions, 
  PaginatedCommentsResult 
} from '../../domain/datasources/comment.datasource';
import { CommentEntity } from '@/domain/entities/comment.entity'

export class PrismaCommentDatasource implements CommentDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  // Configuración común de include para todas las consultas
  private getCommentInclude() {
    return {
      author: {
        select: {
          id: true,
          username: true,
          reputation: true,
          avatarUrl: true, // ✅ INCLUIR avatarUrl
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      parentComment: {
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true // ✅ INCLUIR avatarUrl también en comentario padre
            }
          }
        }
      },
      _count: {
        select: {
          replies: true,
          votes: true
        }
      },
      votes: true
    };
  }

  async create(createCommentDto: CreateCommentDto): Promise<CommentEntity> {
    const comment = await this.prisma.comment.create({
      data: createCommentDto,
      include: this.getCommentInclude()
    });

    const voteScore = this.calculateVoteScore(comment.votes);
    
    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
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
      include: this.getCommentInclude()
    });

    if (!comment) return null;

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

      const where = this.buildWhereClause(filters);
      const orderBy = this.buildOrderByClause(pagination);

      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: this.getCommentInclude() // ✅ USAR INCLUDE COMÚN
        }),
        this.prisma.comment.count({ where })
      ]);

      const processedComments = comments.map((comment) => {
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
      });

      return {
        data: processedComments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in findMany comments:', error);
      throw new Error(`Failed to fetch comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateById(id: number, updateDto: UpdateCommentDto): Promise<CommentEntity> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: updateDto,
      include: this.getCommentInclude()
    });

    const voteScore = this.calculateVoteScore(comment.votes);
    
    return CommentEntity.fromObject({ 
      ...comment, 
      voteScore,
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
      include: this.getCommentInclude()
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
    const filters = { 
      postId, 
      parentCommentId: null,
      isDeleted: false,
      isHidden: false
    };

    return this.findMany(filters, pagination, userId);
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

  async countByUserId(userId: number): Promise<number> {
    return await this.prisma.comment.count({
      where: { 
        authorId: userId,
        isDeleted: false,
        isHidden: false
      }
    });
  }

  // Métodos auxiliares privados
  private calculateVoteScore(votes: any[]): number {
    if (!votes || votes.length === 0) return 0;
    return votes.reduce((sum, vote) => sum + vote.voteType, 0);
  }

  private getUserVote(votes: any[], userId: number): 1 | -1 | null {
    if (!votes || votes.length === 0) return null;
    const userVote = votes.find(vote => vote.userId === userId);
    return userVote ? userVote.voteType : null;
  }

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

    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    } else if (!filters?.includeDeleted) {
      where.isDeleted = false;
    }

    if (filters?.isHidden !== undefined) {
      where.isHidden = filters.isHidden;
    } else if (!filters?.includeHidden) {
      where.isHidden = false;
    }

    return where;
  }

  private buildOrderByClause(pagination?: CommentPaginationOptions) {
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'asc';

    const orderByMap: { [key: string]: any } = {
      'createdAt': { createdAt: sortOrder },
      'voteScore': { 
        votes: {
          _count: sortOrder
        }
      },
      'replies': {
        replies: {
          _count: sortOrder
        }
      }
    };

    return orderByMap[sortBy] || orderByMap['createdAt'];
  }
}
