// src/domain/repositories/notification.repository.ts
import { NotificationEntity } from '../entities/notification.entity';
import {
  CreateNotificationDto,
  NotificationFilters,
  NotificationPaginationOptions,
  PaginatedNotificationsResult
} from '../datasources/notification.datasource';

export abstract class NotificationRepository {
  abstract create(createDto: CreateNotificationDto): Promise<NotificationEntity>;
  abstract findById(id: number): Promise<NotificationEntity | null>;
  abstract findByUserId(
    userId: number,
    pagination?: NotificationPaginationOptions,
    filters?: NotificationFilters
  ): Promise<PaginatedNotificationsResult>;
  abstract markAsRead(id: number): Promise<NotificationEntity>;
  abstract markAllAsRead(userId: number): Promise<number>;
  abstract deleteById(id: number): Promise<NotificationEntity>;
  abstract deleteOldNotifications(olderThanDays: number): Promise<number>;
  abstract countUnread(userId: number): Promise<number>;
  abstract findUnreadByUserId(userId: number, limit?: number): Promise<NotificationEntity[]>;

  // ✅ MÉTODOS ADICIONALES PARA SSE
  abstract countUnreadByUser(userId: number): Promise<number>;
  abstract countRecentByUser(userId: number, type: string, minutesAgo: number): Promise<number>;
}