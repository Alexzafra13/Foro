import { CommentEntity } from '../../domain/entities/comment.entity';
import { CommentRepository } from '../../domain/repositories/comment.repository';
import { 
  CommentDatasource, 
  CreateCommentDto, 
  UpdateCommentDto, 
  CommentFilters, 
  CommentPaginationOptions, 
  PaginatedCommentsResult 
} from '../../domain/datasources/comment.datasource';

export class CommentRepositoryImpl implements CommentRepository {
  constructor(private readonly commentDatasource: CommentDatasource) {}

  async create(createCommentDto: CreateCommentDto): Promise<CommentEntity> {
    return await this.commentDatasource.create(createCommentDto);
  }

  async findById(id: number, userId?: number): Promise<CommentEntity | null> {
    return await this.commentDatasource.findById(id, userId);
  }

  async findMany(
    filters?: CommentFilters,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    return await this.commentDatasource.findMany(filters, pagination, userId);
  }

  async updateById(id: number, updateDto: UpdateCommentDto): Promise<CommentEntity> {
    return await this.commentDatasource.updateById(id, updateDto);
  }

  async deleteById(id: number): Promise<CommentEntity> {
    return await this.commentDatasource.deleteById(id);
  }

  async findByPostId(
    postId: number, 
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    return await this.commentDatasource.findByPostId(postId, pagination, userId);
  }

  async findReplies(
    parentCommentId: number,
    pagination?: CommentPaginationOptions,
    userId?: number
  ): Promise<PaginatedCommentsResult<CommentEntity>> {
    return await this.commentDatasource.findReplies(parentCommentId, pagination, userId);
  }

  async getCommentStats(commentId: number): Promise<{
    voteScore: number;
    upvotes: number;
    downvotes: number;
    repliesCount: number;
  }> {
    return await this.commentDatasource.getCommentStats(commentId);
  }
}