import { PrismaClient } from '@prisma/client';
import { CommentVoteDatasource, CreateCommentVoteDto, UpdateCommentVoteDto, CommentVoteStats } from '../../domain/datasources/comment-vote.datasource';
import { CommentVoteEntity } from '../../domain/entities/comment-vote.entity';

export class PrismaCommentVoteDatasource implements CommentVoteDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateCommentVoteDto): Promise<CommentVoteEntity> {
    const vote = await this.prisma.commentVote.create({
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

    return CommentVoteEntity.fromObject(vote);
  }

  async findById(id: number): Promise<CommentVoteEntity | null> {
    const vote = await this.prisma.commentVote.findUnique({
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

    return vote ? CommentVoteEntity.fromObject(vote) : null;
  }

  async findByUserAndComment(userId: number, commentId: number): Promise<CommentVoteEntity | null> {
    const vote = await this.prisma.commentVote.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
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

    return vote ? CommentVoteEntity.fromObject(vote) : null;
  }

  async updateById(id: number, updateDto: UpdateCommentVoteDto): Promise<CommentVoteEntity> {
    const vote = await this.prisma.commentVote.update({
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

    return CommentVoteEntity.fromObject(vote);
  }

  async deleteById(id: number): Promise<CommentVoteEntity> {
    const vote = await this.prisma.commentVote.delete({
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

    return CommentVoteEntity.fromObject(vote);
  }

  async getCommentVoteScore(commentId: number): Promise<number> {
    try {
      const votes = await this.prisma.commentVote.findMany({
        where: { commentId },
        select: { voteType: true }
      });

      return votes.reduce((sum, vote) => sum + vote.voteType, 0);
    } catch (error) {
      console.error(`Error calculating vote score for comment ${commentId}:`, error);
      return 0;
    }
  }

  async getCommentVoteStats(commentId: number): Promise<CommentVoteStats> {
    try {
      const voteStats = await this.prisma.commentVote.groupBy({
        by: ['voteType'],
        where: { commentId },
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
      console.error(`Error getting vote stats for comment ${commentId}:`, error);
      return {
        upvotes: 0,
        downvotes: 0,
        voteScore: 0
      };
    }
  }
}