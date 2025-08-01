// src/infrastructure/datasources/prisma-post-view.datasource.ts
import { PrismaClient } from '@prisma/client';
import { PostViewDatasource, CreatePostViewDto, PostViewFilters, PostViewStats } from '../../domain/datasources/post-view.datasource';
import { PostViewEntity } from '../../domain/entities/post-view.entity';

export class PrismaPostViewDatasource implements PostViewDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreatePostViewDto): Promise<PostViewEntity> {
    // Usar upsert para evitar duplicados por día
    const view = await this.prisma.postView.upsert({
      where: {
        userId_postId: {
          userId: createDto.userId,
          postId: createDto.postId
        }
      },
      update: {
        viewedAt: new Date(),
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent
      },
      create: {
        userId: createDto.userId,
        postId: createDto.postId,
        ipAddress: createDto.ipAddress,
        userAgent: createDto.userAgent,
        viewedAt: new Date()
      }
    });

    return PostViewEntity.fromObject(view);
  }

  async findByUserAndPost(userId: number, postId: number): Promise<PostViewEntity | null> {
    const view = await this.prisma.postView.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    return view ? PostViewEntity.fromObject(view) : null;
  }

  async hasViewedToday(userId: number, postId: number): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const view = await this.prisma.postView.findFirst({
      where: {
        userId,
        postId,
        viewedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    return !!view;
  }

  async findMany(filters?: PostViewFilters): Promise<PostViewEntity[]> {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.postId) {
      where.postId = filters.postId;
    }

    if (filters?.viewedAfter || filters?.viewedBefore) {
      where.viewedAt = {};
      if (filters.viewedAfter) {
        where.viewedAt.gte = filters.viewedAfter;
      }
      if (filters.viewedBefore) {
        where.viewedAt.lte = filters.viewedBefore;
      }
    }

    const views = await this.prisma.postView.findMany({
      where,
      orderBy: { viewedAt: 'desc' }
    });

    return views.map(view => PostViewEntity.fromObject(view));
  }

  async countUniqueViewsForPost(postId: number): Promise<number> {
    const uniqueUsers = await this.prisma.postView.findMany({
      where: { postId },
      select: { userId: true },
      distinct: ['userId']
    });

    return uniqueUsers.length;
  }

  async countTotalViewsForPost(postId: number): Promise<number> {
    const count = await this.prisma.postView.count({
      where: { postId }
    });

    return count;
  }

  async getPostViewStats(postId: number): Promise<PostViewStats> {
    const now = new Date();
    
    // Fechas para filtros
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Consultas paralelas para optimizar
    const [uniqueViews, totalViews, todayViews, thisWeekViews, thisMonthViews] = await Promise.all([
      this.countUniqueViewsForPost(postId),
      this.countTotalViewsForPost(postId),
      this.prisma.postView.count({
        where: {
          postId,
          viewedAt: { gte: today }
        }
      }),
      this.prisma.postView.findMany({
        where: {
          postId,
          viewedAt: { gte: weekAgo }
        },
        select: { userId: true },
        distinct: ['userId']
      }).then(users => users.length),
      this.prisma.postView.findMany({
        where: {
          postId,
          viewedAt: { gte: monthAgo }
        },
        select: { userId: true },
        distinct: ['userId']
      }).then(users => users.length)
    ]);

    return {
      postId,
      uniqueViews,
      totalViews,
      todayViews,
      thisWeekViews,
      thisMonthViews
    };
  }

  async findByUserId(userId: number, limit = 50): Promise<PostViewEntity[]> {
    const views = await this.prisma.postView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit
    });

    return views.map(view => PostViewEntity.fromObject(view));
  }

  async deleteOldViews(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.postView.deleteMany({
      where: {
        viewedAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}