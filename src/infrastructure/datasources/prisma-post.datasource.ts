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
        }
      }
    });

    // Calcular voteScore si hay votos
    const voteScore = await this.calculateVoteScore(post.id);

    return PostEntity.fromObject({ ...post, voteScore });
  }

  async findById(id: number): Promise<PostEntity | null> {
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
        }
      }
    });

    if (!post) return null;

    // Calcular voteScore
    const voteScore = await this.calculateVoteScore(post.id);

    return PostEntity.fromObject({ ...post, voteScore });
  }

  async findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions
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
          }
        }
      }),
      this.prisma.post.count({ where })
    ]);

    // Calcular voteScore para cada post
    const postsWithScores = await Promise.all(
      posts.map(async (post) => {
        const voteScore = await this.calculateVoteScore(post.id);
        return PostEntity.fromObject({ ...post, voteScore });
      })
    );

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
        }
      }
    });

    const voteScore = await this.calculateVoteScore(post.id);
    return PostEntity.fromObject({ ...post, voteScore });
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

    return PostEntity.fromObject({ ...post, voteScore: 0 });
  }

  async incrementViews(id: number): Promise<void> {
    // Por ahora no implementamos views, pero aquí se incrementaría
    // Podrías agregar un campo `views` a la tabla Post en el futuro
    console.log(`Incrementing views for post ${id}`);
  }

  // Métodos privados auxiliares
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

  private async calculateVoteScore(postId: number): Promise<number> {
    const result = await this.prisma.vote.aggregate({
      where: { postId },
      _sum: { voteType: true }
    });

    return result._sum.voteType || 0;
  }
}