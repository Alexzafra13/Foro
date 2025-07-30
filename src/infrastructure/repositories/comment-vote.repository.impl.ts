import { CommentVoteRepository } from '../../domain/repositories/comment-vote.repository';
import { CommentVoteEntity } from '../../domain/entities/comment-vote.entity';
import { CommentVoteDatasource, CreateCommentVoteDto, UpdateCommentVoteDto, CommentVoteStats } from '../../domain/datasources/comment-vote.datasource';

export class CommentVoteRepositoryImpl implements CommentVoteRepository {
  constructor(private readonly commentVoteDatasource: CommentVoteDatasource) {}

  async create(createDto: CreateCommentVoteDto): Promise<CommentVoteEntity> {
    return await this.commentVoteDatasource.create(createDto);
  }

  async findById(id: number): Promise<CommentVoteEntity | null> {
    return await this.commentVoteDatasource.findById(id);
  }

  async findByUserAndComment(userId: number, commentId: number): Promise<CommentVoteEntity | null> {
    return await this.commentVoteDatasource.findByUserAndComment(userId, commentId);
  }

  async updateById(id: number, updateDto: UpdateCommentVoteDto): Promise<CommentVoteEntity> {
    return await this.commentVoteDatasource.updateById(id, updateDto);
  }

  async deleteById(id: number): Promise<CommentVoteEntity> {
    return await this.commentVoteDatasource.deleteById(id);
  }

  async getCommentVoteScore(commentId: number): Promise<number> {
    return await this.commentVoteDatasource.getCommentVoteScore(commentId);
  }

  async getCommentVoteStats(commentId: number): Promise<CommentVoteStats> {
    return await this.commentVoteDatasource.getCommentVoteStats(commentId);
  }
}