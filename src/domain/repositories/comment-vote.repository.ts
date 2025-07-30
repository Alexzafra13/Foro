import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CreateCommentVoteDto, UpdateCommentVoteDto, CommentVoteStats } from '../datasources/comment-vote.datasource';

export abstract class CommentVoteRepository {
  abstract create(createDto: CreateCommentVoteDto): Promise<CommentVoteEntity>;
  abstract findById(id: number): Promise<CommentVoteEntity | null>;
  abstract findByUserAndComment(userId: number, commentId: number): Promise<CommentVoteEntity | null>;
  abstract updateById(id: number, updateDto: UpdateCommentVoteDto): Promise<CommentVoteEntity>;
  abstract deleteById(id: number): Promise<CommentVoteEntity>;
  abstract getCommentVoteScore(commentId: number): Promise<number>;
  abstract getCommentVoteStats(commentId: number): Promise<CommentVoteStats>;
}