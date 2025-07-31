// src/infrastructure/datasources/prisma-post.datasource.ts - CORREGIDO COMPLETO
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
        votes: true // ✅ INCLUIR TODOS LOS VOTOS
      }
    });

    // Calcular voteScore y userVote
    const voteScore = this.calculateVoteScore(post.votes);
    
    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote: null // Para posts recién creados
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
        votes: true // ✅ INCLUIR TODOS LOS VOTOS
      }
    });

    if (!post) return null;

    // ✅ CALCULAR voteScore Y userVote
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
    userId?: number // ✅ RECIBIR userId
  ): Promise<PaginatedResult<PostEntity>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where = this.buildWhereClause(filters);

    // Construir orderBy clause
    const orderBy = this.buildOrderByClause(pagination);

    // Ejecutar queries en paralelo
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          votes: true // ✅ INCLUIR TODOS LOS VOTOS
        }
      }),
      this.prisma.post.count({ where })
    ]);

    // ✅ PROCESAR POSTS CON VOTOS
    const postsWithScores = posts.map((post) => {
      const voteScore = this.calculateVoteScore(post.votes);
      const userVote = userId ? this.getUserVote(post.votes, userId) : null;
      
      return PostEntity.fromObject({ 
        ...post, 
        voteScore,
        userVote
      });
    });

    // Calcular paginación
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
        votes: true // ✅ INCLUIR VOTOS
      }
    });

    const voteScore = this.calculateVoteScore(post.votes);
    
    return PostEntity.fromObject({ 
      ...post, 
      voteScore,
      userVote: null // No necesitamos userVote en updates
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
    // Por ahora no implementamos views
    console.log(`Incrementing views for post ${id}`);
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

  // Métodos privados auxiliares existentes
  private buildWhereClause(filters?: PostFilters) {
    const where: any = {};

    if (filters?.channelId) {
      where.channelId = filters.channelId;
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters?.isLocked !== undefined) {
      where.isLocked = filters.isLocked;
    }

    if (filters?.isPinned !== undefined) {
      where.isPinned = filters.isPinned;
    }

    if (filters?.search) {
      where.OR = [
        {
          title: {
            contains: filters.search,
            mode: 'insensitive'
          }
        },
        {
          content: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    return where;
  }

  private buildOrderByClause(pagination?: PaginationOptions) {
    if (!pagination?.sortBy) {
      // Por defecto: posts pinned primero, luego por fecha
      return [
        { isPinned: 'desc' as const },
        { createdAt: 'desc' as const }
      ];
    }

    const orderBy: any = {};
    
    if (pagination.sortBy === 'voteScore') {
      // Para ordenar por score, necesitamos hacer una query más compleja
      // Por ahora ordenamos por createdAt y calculamos después
      orderBy.createdAt = pagination.sortOrder || 'desc';
    } else {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    }

    return orderBy;
  }
}