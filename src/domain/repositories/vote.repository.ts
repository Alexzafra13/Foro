import { VoteEntity } from '../entities/vote.entity';
import { CreateVoteDto, UpdateVoteDto, VoteStats } from '../datasources/vote.datasource';

export abstract class VoteRepository {
  abstract create(createDto: CreateVoteDto): Promise<VoteEntity>;
  abstract findById(id: number): Promise<VoteEntity | null>;
  abstract findByUserAndPost(userId: number, postId: number): Promise<VoteEntity | null>;
  abstract updateById(id: number, updateDto: UpdateVoteDto): Promise<VoteEntity>;
  abstract deleteById(id: number): Promise<VoteEntity>;
  abstract getPostVoteScore(postId: number): Promise<number>;
  abstract getPostVoteStats(postId: number): Promise<VoteStats>;
}