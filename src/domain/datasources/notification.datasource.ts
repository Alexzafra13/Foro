// src/domain/datasources/notification.datasource.ts
import { NotificationEntity } from '../entities/notification.entity';

export interface CreateNotificationDto {
  userId: number;
  type: string;
  content?: string;
  relatedData?: {
    postId?: number;
    commentId?: number;
    mentionedBy?: number;
    votedBy?: number;
    bannedUserId?: number;      
    bannedByUserId?: number;    
    unbannedBy?: number;        
    reason?: string;            
    [key: string]: any;         
  };
}

export interface NotificationFilters {
  userId?: number;
  type?: string;
  isRead?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface NotificationPaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'type' | 'isRead';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedNotificationsResult {
  data: NotificationEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    unreadCount: number;
    totalCount: number;
  };
}

export abstract class NotificationDatasource {
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