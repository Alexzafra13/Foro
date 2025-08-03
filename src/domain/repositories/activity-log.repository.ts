// src/domain/repositories/activity-log.repository.ts - ACTUALIZADO
import { ActivityLogEntity } from '../entities/activity-log.entity';

export interface CreateActivityLogDto {
  userId: number | null;
  action: string;
  details: any;
  ipAddress?: string | null;  // ✅ CAMBIADO: ahora acepta undefined
  userAgent?: string | null;  // ✅ CAMBIADO: ahora acepta undefined
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
  sortBy?: 'createdAt' | 'action';
  sortOrder?: 'asc' | 'desc';
}

export abstract class ActivityLogRepository {
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