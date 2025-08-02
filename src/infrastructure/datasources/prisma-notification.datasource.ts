// src/infrastructure/datasources/prisma-notification.datasource.ts
import { PrismaClient } from '@prisma/client';
import {
  NotificationDatasource,
  CreateNotificationDto,
  NotificationFilters,
  NotificationPaginationOptions,
  PaginatedNotificationsResult
} from '../../domain/datasources/notification.datasource';
import { NotificationEntity } from '../../domain/entities/notification.entity';

export class PrismaNotificationDatasource implements NotificationDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateNotificationDto): Promise<NotificationEntity> {
    // Si tenemos relatedData, lo convertimos a JSON string
    const content = createDto.relatedData 
      ? JSON.stringify(createDto.relatedData)
      : createDto.content;

    const notification = await this.prisma.notification.create({
      data: {
        userId: createDto.userId,
        type: createDto.type,
        content,
        isRead: false
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

    return NotificationEntity.fromObject(notification);
  }

  async findById(id: number): Promise<NotificationEntity | null> {
    const notification = await this.prisma.notification.findUnique({
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

    return notification ? NotificationEntity.fromObject(notification) : null;
  }

  async findByUserId(
    userId: number,
    pagination?: NotificationPaginationOptions,
    filters?: NotificationFilters
  ): Promise<PaginatedNotificationsResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(userId, filters);
    const orderBy = this.buildOrderBy(pagination);

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
    ]);

    const notificationEntities = notifications.map(n => NotificationEntity.fromObject(n));

    return {
      data: notificationEntities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats: {
        unreadCount,
        totalCount: total
      }
    };
  }

  async markAsRead(id: number): Promise<NotificationEntity> {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return NotificationEntity.fromObject(notification);
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return result.count;
  }

  async deleteById(id: number): Promise<NotificationEntity> {
    const notification = await this.prisma.notification.delete({
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

    return NotificationEntity.fromObject(notification);
  }

  async deleteOldNotifications(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true // Solo eliminar notificaciones leídas
      }
    });

    return result.count;
  }

  async countUnread(userId: number): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  async findUnreadByUserId(userId: number, limit = 10): Promise<NotificationEntity[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return notifications.map(n => NotificationEntity.fromObject(n));
  }

  // Métodos auxiliares privados
  private buildWhereClause(userId: number, filters?: NotificationFilters): any {
    const where: any = { userId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters?.createdAfter || filters?.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    return where;
  }

  private buildOrderBy(pagination?: NotificationPaginationOptions): any {
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }
}