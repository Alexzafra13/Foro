import { CommentVoteEntity } from '../entities/comment-vote.entity';

export interface CreateCommentVoteDto {
  userId: number;
  commentId: number;
  voteType: 1 | -1;
}

export interface UpdateCommentVoteDto {
  voteType: 1 | -1;
}

export interface CommentVoteStats {
  upvotes: number;
  downvotes: number;
  voteScore: number;
}

export abstract class CommentVoteDatasource {
  abstract create(createDto: CreateCommentVoteDto): Promise<CommentVoteEntity>;
  abstract findById(id: number): Promise<CommentVoteEntity | null>;
  abstract findByUserAndComment(userId: number, commentId: number): Promise<CommentVoteEntity | null>;
  abstract updateById(id: number, updateDto: UpdateCommentVoteDto): Promise<CommentVoteEntity>;
  abstract deleteById(id: number): Promise<CommentVoteEntity>;
  abstract getCommentVoteScore(commentId: number): Promise<number>;
  abstract getCommentVoteStats(commentId: number): Promise<CommentVoteStats>;
}