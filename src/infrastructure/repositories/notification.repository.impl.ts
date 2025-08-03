// src/infrastructure/repositories/notification.repository.impl.ts
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import {
  NotificationDatasource,
  CreateNotificationDto,
  NotificationFilters,
  NotificationPaginationOptions,
  PaginatedNotificationsResult
} from '../../domain/datasources/notification.datasource';

export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(private readonly datasource: NotificationDatasource) {}

  async create(createDto: CreateNotificationDto): Promise<NotificationEntity> {
    return await this.datasource.create(createDto);
  }

  async findById(id: number): Promise<NotificationEntity | null> {
    return await this.datasource.findById(id);
  }

  async findByUserId(
    userId: number,
    pagination?: NotificationPaginationOptions,
    filters?: NotificationFilters
  ): Promise<PaginatedNotificationsResult> {
    return await this.datasource.findByUserId(userId, pagination, filters);
  }

  async markAsRead(id: number): Promise<NotificationEntity> {
    return await this.datasource.markAsRead(id);
  }

  async markAllAsRead(userId: number): Promise<number> {
    return await this.datasource.markAllAsRead(userId);
  }

  async deleteById(id: number): Promise<NotificationEntity> {
    return await this.datasource.deleteById(id);
  }

  async deleteOldNotifications(olderThanDays: number): Promise<number> {
    return await this.datasource.deleteOldNotifications(olderThanDays);
  }

  async countUnread(userId: number): Promise<number> {
    return await this.datasource.countUnread(userId);
  }

  async findUnreadByUserId(userId: number, limit?: number): Promise<NotificationEntity[]> {
    return await this.datasource.findUnreadByUserId(userId, limit);
  }

  // ✅ MÉTODOS ADICIONALES PARA SSE
  async countUnreadByUser(userId: number): Promise<number> {
    return await this.datasource.countUnreadByUser(userId);
  }

  async countRecentByUser(userId: number, type: string, minutesAgo: number): Promise<number> {
    return await this.datasource.countRecentByUser(userId, type, minutesAgo);
  }
}