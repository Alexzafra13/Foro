// src/infrastructure/datasources/prisma-comment.datasource.ts - VERSIÓN CORREGIDA CON DEBUGGING
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

    // ✅ LOGGING PARA DEBUGGING
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 PrismaCommentDatasource.findById - Comment ${id}:`, {
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        type_isHidden: typeof comment.isHidden,
        rawComment: { isHidden: comment.isHidden, isDeleted: comment.isDeleted }
      });
    }

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

      // ✅ LOGGING PARA DEBUGGING
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 PrismaCommentDatasource.findMany - WHERE clause:', where);
        console.log('🔍 PrismaCommentDatasource.findMany - Filters:', filters);
      }

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

      // ✅ LOGGING DETALLADO DE RESULTADOS
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 PrismaCommentDatasource.findMany - Found ${comments.length} comments`);
        comments.forEach(comment => {
          console.log(`📝 Raw Comment ${comment.id}: isHidden=${comment.isHidden} (${typeof comment.isHidden}), isDeleted=${comment.isDeleted} (${typeof comment.isDeleted})`);
        });
      }

      const processedComments = comments.map((comment) => {
        const voteScore = this.calculateVoteScore(comment.votes);
        const userVote = userId ? this.getUserVote(comment.votes, userId) : null;
        
        // ✅ MAPEO EXPLÍCITO PARA ASEGURAR TIPOS CORRECTOS
        const commentData = {
          ...comment,
          isHidden: Boolean(comment.isHidden), // ✅ CONVERSIÓN EXPLÍCITA
          isDeleted: Boolean(comment.isDeleted), // ✅ CONVERSIÓN EXPLÍCITA
          voteScore,
          userVote,
          parentComment: comment.parentComment ? {
            id: comment.parentComment.id,
            content: comment.parentComment.content.substring(0, 50) + '...',
            authorUsername: comment.parentComment.author?.username || 'Usuario eliminado'
          } : undefined
        };

        // ✅ LOGGING ANTES DE CREAR LA ENTIDAD
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Processing Comment ${comment.id}:`, {
            originalIsHidden: comment.isHidden,
            mappedIsHidden: commentData.isHidden,
            originalIsDeleted: comment.isDeleted,
            mappedIsDeleted: commentData.isDeleted
          });
        }
        
        return CommentEntity.fromObject(commentData);
      });

      // ✅ LOGGING FINAL
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ PrismaCommentDatasource.findMany - Processed ${processedComments.length} comments`);
        processedComments.forEach(comment => {
          console.log(`📤 Final Comment ${comment.id}: isHidden=${comment.isHidden}, isDeleted=${comment.isDeleted}`);
        });
      }

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
    // ✅ LOGGING DE ACTUALIZACIÓN
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 PrismaCommentDatasource.updateById - Comment ${id}:`, updateDto);
    }

    const comment = await this.prisma.comment.update({
      where: { id },
      data: updateDto,
      include: this.getCommentInclude()
    });

    const voteScore = this.calculateVoteScore(comment.votes);
    
    // ✅ LOGGING DESPUÉS DE ACTUALIZACIÓN
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ PrismaCommentDatasource.updateById - Updated Comment ${id}:`, {
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        type_isHidden: typeof comment.isHidden
      });
    }
    
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
      isDeleted: false
      // ✅ REMOVIDO: isHidden: false - Ahora mostramos comentarios moderados
    };

    // ✅ LOGGING
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 PrismaCommentDatasource.findByPostId - Post ${postId} with filters:`, filters);
    }

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
        isDeleted: false
        // ✅ REMOVIDO: isHidden: false - Ahora mostramos comentarios moderados
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
            isDeleted: false
            // ✅ REMOVIDO: isHidden: false - Incluir respuestas moderadas en el conteo
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
        isDeleted: false
        // ✅ REMOVIDO: isHidden: false - Incluir comentarios moderados en estadísticas de usuario
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

  // ✅ FUNCIÓN BUILDWHERECLAUSE ACTUALIZADA PARA MODERACIÓN
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

    // ✅ SOLO OCULTAR COMENTARIOS ELIMINADOS, NO LOS MODERADOS
    if (filters?.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted;
    } else if (!filters?.includeDeleted) {
      where.isDeleted = false; // Solo excluir eliminados
    }

    // ✅ COMENTARIO: Ya no ocultamos los comentarios moderados por defecto
    // Los comentarios con isHidden=true ahora se muestran con mensaje de moderación
    if (filters?.isHidden !== undefined) {
      where.isHidden = filters.isHidden;
    }
    
    // ✅ REMOVIDO: Ya no excluimos isHidden por defecto
    // else if (!filters?.includeHidden) {
    //   where.isHidden = false;
    // }

    // ✅ LOGGING DEL WHERE CLAUSE
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 buildWhereClause result:', where);
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