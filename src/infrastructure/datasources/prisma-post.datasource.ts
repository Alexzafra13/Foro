// src/infrastructure/datasources/prisma-post.datasource.ts - REEMPLAZAR COMPLETO
import { PrismaClient } from '@prisma/client';
import { 
  PostDatasource, 
  CreatePostDto, 
  UpdatePostDto, 
  PostFilters, 
  PaginationOptions, 
  PaginatedResult 
} from '../../domain/datasources/post.datasource';
import { PostEntity } from '../../domain/entities/post.entity';

export class PrismaPostDatasource implements PostDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createPostDto: CreatePostDto): Promise<PostEntity> {
    const post = await this.prisma.post.create({
      data: createPostDto,
      include: {
        author: {
          include: { role: true }
        },
        channel: true,
        _count: {
          select: {
            comments: true,
            votes: true
          }
        },
        votes: true
      }
    });

    const voteScore = this.calculateVoteScore(post.votes);
    
    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote: null
    });
  }

  async findById(id: number, userId?: number): Promise<PostEntity | null> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          include: { role: true }
        },
        channel: true,
        _count: {
          select: {
            comments: true,
            votes: true
          }
        },
        votes: true
      }
    });

    if (!post) return null;

    const voteScore = this.calculateVoteScore(post.votes);
    const userVote = userId ? this.getUserVote(post.votes, userId) : null;

    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote
    });
  }

  async findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions,
    userId?: number
  ): Promise<PaginatedResult<PostEntity>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(pagination);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            include: { role: true }
          },
          channel: true,
          _count: {
            select: {
              comments: true,
              votes: true
            }
          },
          votes: true
        },
        orderBy,
        skip,
        take: limit
      }),
      this.prisma.post.count({ where: whereClause })
    ]);

    const postsWithScores = posts.map(post => {
      const voteScore = this.calculateVoteScore(post.votes);
      const userVote = userId ? this.getUserVote(post.votes, userId) : null;
      
      return PostEntity.fromObject({ 
        ...post, 
        voteScore,
        userVote
      });
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: postsWithScores,
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

  async updateById(id: number, updateDto: UpdatePostDto): Promise<PostEntity> {
    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...updateDto,
        updatedAt: new Date()
      },
      include: {
        author: {
          include: { role: true }
        },
        channel: true,
        _count: {
          select: {
            comments: true,
            votes: true
          }
        },
        votes: true
      }
    });

    const voteScore = this.calculateVoteScore(post.votes);
    
    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote: null
    });
  }

  async deleteById(id: number): Promise<PostEntity> {
    const post = await this.prisma.post.delete({
      where: { id },
      include: {
        author: {
          include: { role: true }
        },
        channel: true,
        _count: {
          select: {
            comments: true,
            votes: true
          }
        }
      }
    });

    return PostEntity.fromObject({ ...post, voteScore: 0, userVote: null });
  }

  async incrementViews(id: number): Promise<void> {
    console.log(`Incrementing views for post ${id}`);
  }

  // ✅ NUEVOS MÉTODOS PARA ESTADÍSTICAS
  async countByUserId(userId: number): Promise<number> {
    try {
      return await this.prisma.post.count({
        where: { 
          authorId: userId
          // ❌ SIN isDeleted: false - No existe en el schema
        }
      });
    } catch (error) {
      console.error('Error counting posts by user:', error);
      throw new Error('Failed to count user posts');
    }
  }

  async findByUserId(userId: number): Promise<PostEntity[]> {
    try {
      const posts = await this.prisma.post.findMany({
        where: { 
          authorId: userId
          // ❌ SIN isDeleted: false - No existe en el schema
        },
        include: {
          author: {
            include: {
              role: true
            }
          },
          channel: true,
          _count: {
            select: {
              comments: true,
              votes: true
            }
          },
          votes: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return posts.map(post => {
        const voteScore = this.calculateVoteScore(post.votes);
        return PostEntity.fromObject({
          ...post,
          voteScore,
          userVote: null
        });
      });

    } catch (error) {
      console.error('Error finding posts by user:', error);
      throw new Error('Failed to find user posts');
    }
  }

  async getTotalVotesForUser(userId: number): Promise<number> {
    try {
      const result = await this.prisma.vote.aggregate({
        where: {
          post: {
            authorId: userId
            // ❌ SIN isDeleted: false - No existe en el schema
          }
        },
        _sum: {
          voteType: true
        }
      });

      if (!result._sum || result._sum.voteType === null) return 0;
      return result._sum.voteType;

    } catch (error) {
      console.error('Error calculating total votes for user:', error);
      return 0;
    }
  }

  // ✅ MÉTODOS AUXILIARES
  private calculateVoteScore(votes: any[]): number {
    if (!votes || votes.length === 0) return 0;
    return votes.reduce((sum, vote) => sum + vote.voteType, 0);
  }

  private getUserVote(votes: any[], userId: number): 1 | -1 | null {
    if (!votes || votes.length === 0) return null;
    const userVote = votes.find(vote => vote.userId === userId);
    return userVote ? userVote.voteType : null;
  }

  private buildWhereClause(filters?: PostFilters) {
    const where: any = {};

    if (filters?.channelId) {
      where.channelId = filters.channelId;
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters?.isLocked !== undefined) {
      where.isLocked = filters.isLocked;
    }

    if (filters?.isPinned !== undefined) {
      where.isPinned = filters.isPinned;
    }

    return where;
  }

  private buildOrderByClause(pagination?: PaginationOptions) {
    if (!pagination?.sortBy) {
      return [
        { isPinned: 'desc' as const },
        { createdAt: 'desc' as const }
      ];
    }

    const orderBy: any = {};
    
    if (pagination.sortBy === 'voteScore') {
      orderBy.createdAt = pagination.sortOrder || 'desc';
    } else {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    }

    return orderBy;
  }
}