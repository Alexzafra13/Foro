import { VoteRepository } from '../../domain/repositories/vote.repository';
import { VoteEntity } from '../../domain/entities/vote.entity';
import { VoteDatasource, CreateVoteDto, UpdateVoteDto, VoteStats } from '../../domain/datasources/vote.datasource';

export class VoteRepositoryImpl implements VoteRepository {
  constructor(private readonly voteDatasource: VoteDatasource) {}

  async create(createDto: CreateVoteDto): Promise<VoteEntity> {
    return await this.voteDatasource.create(createDto);
  }

  async findById(id: number): Promise<VoteEntity | null> {
    return await this.voteDatasource.findById(id);
  }

  async findByUserAndPost(userId: number, postId: number): Promise<VoteEntity | null> {
    return await this.voteDatasource.findByUserAndPost(userId, postId);
  }

  async updateById(id: number, updateDto: UpdateVoteDto): Promise<VoteEntity> {
    return await this.voteDatasource.updateById(id, updateDto);
  }

  async deleteById(id: number): Promise<VoteEntity> {
    return await this.voteDatasource.deleteById(id);
  }

  async getPostVoteScore(postId: number): Promise<number> {
    return await this.voteDatasource.getPostVoteScore(postId);
  }

  async getPostVoteStats(postId: number): Promise<VoteStats> {
    return await this.voteDatasource.getPostVoteStats(postId);
  }
}