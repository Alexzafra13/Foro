// src/domain/repositories/comment.repository.ts - ACTUALIZADA
import { CommentEntity } from '../entities/comment.entity';
import { 
  CreateCommentDto, 
  UpdateCommentDto, 
  CommentFilters, 
  CommentPaginationOptions, 
  PaginatedCommentsResult 
} from '../datasources/comment.datasource';

export abstract class CommentRepository {
  abstract create(createCommentDto: CreateCommentDto): Promise<CommentEntity>;
  abstract findById(id: number, userId?: number): Promise<CommentEntity | null>; // ✅ AGREGADO userId
  abstract findMany(
    filters?: CommentFilters,
    pagination?: CommentPaginationOptions,
    userId?: number // ✅ AGREGADO userId
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  abstract updateById(id: number, updateDto: UpdateCommentDto): Promise<CommentEntity>;
  abstract deleteById(id: number): Promise<CommentEntity>;
  
  // Métodos específicos
  abstract findByPostId(
    postId: number, 
    pagination?: CommentPaginationOptions,
    userId?: number // ✅ AGREGADO userId
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  
  abstract findReplies(
    parentCommentId: number,
    pagination?: CommentPaginationOptions,
    userId?: number // ✅ AGREGADO userId
  ): Promise<PaginatedCommentsResult<CommentEntity>>;
  
  abstract getCommentStats(commentId: number): Promise<{
    voteScore: number;
    upvotes: number;
    downvotes: number;
    repliesCount: number;
  }>;
}