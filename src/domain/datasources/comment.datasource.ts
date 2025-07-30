import { CommentEntity } from '../entities/comment.entity';

export interface CreateCommentDto {
  postId: number;
  authorId: number;
  parentCommentId?: number;
  content: string;
}

export interface UpdateCommentDto {
  content?: string;
  isEdited?: boolean;
  editedAt?: Date;
  editCount?: number;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  deletionReason?: string;
  isHidden?: boolean;
  updatedAt?: Date;
}

export interface CommentFilters {
  postId?: number;
  authorId?: number;
  parentCommentId?: number | null; // null para comentarios raíz, number para respuestas
  isDeleted?: boolean;
  isHidden?: boolean;
  includeDeleted?: boolean; // Para moderadores
  includeHidden?: boolean;  // Para moderadores
}

export interface CommentPaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'voteScore' | 'replies';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCommentsResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class CommentDatasource {
  abstract create(createCommentDto: CreateCommentDto): Promise<CommentEntity>;
  abstract findById(id: number, userId?: number): Promise<CommentEntity | null>;
  abstract findMany(
    filters?: CommentFilters,
    pagination?: CommentPaginationOptions,
    userId?: number // Para obtener votos del usuario
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  abstract updateById(id: number, updateDto: UpdateCommentDto): Promise<CommentEntity>;
  abstract deleteById(id: number): Promise<CommentEntity>;
  
  // Métodos específicos para comentarios
  abstract findByPostId(
    postId: number, 
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  
  abstract findReplies(
    parentCommentId: number,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  
  abstract getCommentStats(commentId: number): Promise<{
    voteScore: number;
    upvotes: number;
    downvotes: number;
    repliesCount: number;
  }>;
}