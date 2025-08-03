// src/infrastructure/datasources/prisma-activity-log.datasource.ts - VERSIÓN CORREGIDA
import { PrismaClient } from '@prisma/client';
import { ActivityLogEntity } from '../../domain/entities/activity-log.entity';

export interface CreateActivityLogDto {
  userId: number | null;
  action: string;
  details: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ActivityLogFilters {
  userId?: number;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ActivityLogPagination {
  page: number;
  limit: number;
}

export abstract class ActivityLogDatasource {
  abstract create(createDto: CreateActivityLogDto): Promise<ActivityLogEntity>;
  abstract findById(id: number): Promise<ActivityLogEntity | null>;
  abstract findMany(
    filters?: ActivityLogFilters,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }>;
  abstract findByUserId(
    userId: number,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }>;
  abstract deleteOlderThan(days: number): Promise<number>;
}

export class PrismaActivityLogDatasource implements ActivityLogDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateActivityLogDto): Promise<ActivityLogEntity> {
    const log = await this.prisma.activityLog.create({
      data: createDto,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return ActivityLogEntity.fromObject({
      ...log,
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        role: log.user.role.name
      } : undefined
    });
  }

  async findById(id: number): Promise<ActivityLogEntity | null> {
    const log = await this.prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return log ? ActivityLogEntity.fromObject({
      ...log,
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        role: log.user.role.name
      } : undefined
    }) : null;
  }

  async findMany(
    filters?: ActivityLogFilters,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 50, 100); // Máximo 100
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      this.prisma.activityLog.count({ where })
    ]);

    const data = logs.map(log => ActivityLogEntity.fromObject({
      ...log,
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        role: log.user.role.name
      } : undefined
    }));

    return { data, total, page, limit };
  }

  async findByUserId(
    userId: number,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findMany({ userId }, pagination);
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  private buildWhereClause(filters?: ActivityLogFilters) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return where;
  }
}