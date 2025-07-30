import { PrismaClient } from '@prisma/client';

export class PrismaChannelDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<any | null> {
    return await this.prisma.channel.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            posts: true,
            members: true
          }
        }
      }
    });
  }

  async findByCategory(categoryId: number): Promise<any[]> {
    return await this.prisma.channel.findMany({
      where: {
        categoryId,
        isVisible: true
      },
      include: {
        _count: {
          select: {
            posts: true,
            members: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });
  }

  async getChannelStats(channelId: number): Promise<{ posts: number; members?: number }> {
    const stats = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        _count: {
          select: {
            posts: true,
            members: true
          }
        }
      }
    });

    return {
      posts: stats?._count.posts || 0,
      members: stats?._count.members || 0
    };
  }

  async getLastPost(channelId: number): Promise<any | null> {
    const lastPost = await this.prisma.post.findFirst({
      where: {
        channelId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: {
          select: {
            username: true
          }
        }
      }
    });

    return lastPost;
  }
}