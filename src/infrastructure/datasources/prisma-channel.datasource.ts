import { PrismaClient } from '@prisma/client';
import { ChannelDatasource, ChannelStats, LastPost } from '../../domain/datasources/channel.datasource';
import { ChannelEntity } from '../../domain/entities/channel.entity';

export class PrismaChannelDatasource implements ChannelDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<ChannelEntity | null> {
    const channel = await this.prisma.channel.findUnique({
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

    return channel ? ChannelEntity.fromObject(channel) : null;
  }

  async findByCategory(categoryId: number): Promise<ChannelEntity[]> {
    const channels = await this.prisma.channel.findMany({
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

    return channels.map(channel => ChannelEntity.fromObject(channel));
  }

  async getChannelStats(channelId: number): Promise<ChannelStats> {
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

  async getLastPost(channelId: number): Promise<LastPost | null> {
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

    // ✅ MANEJAR EL CASO DONDE author PUEDE SER NULL
    if (!lastPost) return null;

    return {
      id: lastPost.id,
      title: lastPost.title,
      createdAt: lastPost.createdAt,
      author: lastPost.author ? {
        username: lastPost.author.username
      } : null // ✅ RETORNAR NULL SI NO HAY AUTOR
    };
  }
}