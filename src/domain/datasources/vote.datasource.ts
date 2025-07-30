import { VoteEntity } from '../entities/vote.entity';

export interface CreateVoteDto {
  userId: number;
  postId: number;
  voteType: 1 | -1;
}

export interface UpdateVoteDto {
  voteType: 1 | -1;
}

export interface VoteStats {
  upvotes: number;
  downvotes: number;
  voteScore: number;
}

export abstract class VoteDatasource {
  abstract create(createDto: CreateVoteDto): Promise<VoteEntity>;
  abstract findById(id: number): Promise<VoteEntity | null>;
  abstract findByUserAndPost(userId: number, postId: number): Promise<VoteEntity | null>;
  abstract updateById(id: number, updateDto: UpdateVoteDto): Promise<VoteEntity>;
  abstract deleteById(id: number): Promise<VoteEntity>;
  abstract getPostVoteScore(postId: number): Promise<number>;
  abstract getPostVoteStats(postId: number): Promise<VoteStats>;
}