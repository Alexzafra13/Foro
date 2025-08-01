// src/infrastructure/datasources/prisma-post.datasource.ts - ACTUALIZACIÓN
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
        channel: {
          select: {
            id: true,
            name: true,
            isPrivate: true
          }
        },
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
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(pagination);
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
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
          channel: {
            select: {
              id: true,
              name: true,
              isPrivate: true
            }
          },
          _count: {
            select: {
              comments: true,
              votes: true
            }
          },
          votes: true
        }
      }),
      this.prisma.post.count({ where })
    ]);

    const postsWithVotes = posts.map(post => {
      const voteScore = this.calculateVoteScore(post.votes);
      const userVote = userId ? this.getUserVote(post.votes, userId) : null;
      
      return PostEntity.fromObject({ 
        ...post, 
        voteScore,
        userVote
      });
    });

    return {
      data: postsWithVotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
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
      }
    });

    const voteScore = this.calculateVoteScore(post.votes);
    
    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote: null
    });
  }

  async incrementViews(id: number): Promise<void> {
    try {
      await this.prisma.post.update({
        where: { id },
        data: {
          views: {
            increment: 1
          }
        }
      });
    } catch (error) {
      console.error(`Error incrementing views for post ${id}:`, error);
      // No lanzar error para que no afecte la carga del post
    }
  }

  // ✅ NUEVOS MÉTODOS PARA ESTADÍSTICAS
  async countByUserId(userId: number): Promise<number> {
    return await this.prisma.post.count({
      where: { authorId: userId }
    });
  }

  async findByUserId(userId: number): Promise<PostEntity[]> {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
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
  }

  async getTotalVotesForUser(userId: number): Promise<number> {
    const result = await this.prisma.vote.count({
      where: {
        post: {
          authorId: userId
        }
      }
    });
    return result;
  }

  // Métodos auxiliares privados
  private buildWhereClause(filters?: PostFilters): any {
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

    return where;
  }

   private buildOrderBy(pagination?: PaginationOptions): any {
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';

    // Mapear campos de ordenamiento
    const orderByMap: { [key: string]: any } = {
      'createdAt': { createdAt: sortOrder },
      'updatedAt': { updatedAt: sortOrder },
      'title': { title: sortOrder },
      'views': { views: sortOrder }, // ✅ AGREGAR ORDENAMIENTO POR VIEWS
      'voteScore': { 
        votes: {
          _count: sortOrder
        }
      }
    };

    return orderByMap[sortBy] || orderByMap['createdAt'];
  }

  private calculateVoteScore(votes: any[]): number {
    if (!votes || votes.length === 0) return 0;
    
    return votes.reduce((score, vote) => {
      return score + (vote.voteType === 1 ? 1 : -1);
    }, 0);
  }

  private getUserVote(votes: any[], userId: number): 1 | -1 | null {
    if (!votes || votes.length === 0 || !userId) return null;
    
    const userVote = votes.find(vote => vote.userId === userId);
    return userVote ? userVote.voteType : null;
  }
}