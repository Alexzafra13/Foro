import { PrismaClient } from '@prisma/client';
import { VoteDatasource, CreateVoteDto, UpdateVoteDto, VoteStats } from '../../domain/datasources/vote.datasource';
import { VoteEntity } from '../../domain/entities/vote.entity';

export class PrismaVoteDatasource implements VoteDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateVoteDto): Promise<VoteEntity> {
    const vote = await this.prisma.vote.create({
      data: createDto,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return VoteEntity.fromObject(vote);
  }

  async findById(id: number): Promise<VoteEntity | null> {
    const vote = await this.prisma.vote.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return vote ? VoteEntity.fromObject(vote) : null;
  }

  async findByUserAndPost(userId: number, postId: number): Promise<VoteEntity | null> {
    const vote = await this.prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return vote ? VoteEntity.fromObject(vote) : null;
  }

  async updateById(id: number, updateDto: UpdateVoteDto): Promise<VoteEntity> {
    const vote = await this.prisma.vote.update({
      where: { id },
      data: updateDto,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return VoteEntity.fromObject(vote);
  }

  async deleteById(id: number): Promise<VoteEntity> {
    const vote = await this.prisma.vote.delete({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return VoteEntity.fromObject(vote);
  }

  async getPostVoteScore(postId: number): Promise<number> {
    try {
      const votes = await this.prisma.vote.findMany({
        where: { postId },
        select: { voteType: true }
      });

      return votes.reduce((sum, vote) => sum + vote.voteType, 0);
    } catch (error) {
      console.error(`Error calculating vote score for post ${postId}:`, error);
      return 0;
    }
  }

  async getPostVoteStats(postId: number): Promise<VoteStats> {
    try {
      const voteStats = await this.prisma.vote.groupBy({
        by: ['voteType'],
        where: { postId },
        _count: { voteType: true }
      });

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
        upvotes,
        downvotes,
        voteScore
      };
    } catch (error) {
      console.error(`Error getting vote stats for post ${postId}:`, error);
      return {
        upvotes: 0,
        downvotes: 0,
        voteScore: 0
      };
    }
  }
}
