import { NotificationRepository } from '../../repositories/notification.repository';

export interface GetUserNotificationsRequestDto {
  userId: number;
  page?: number;
  limit?: number;
  filterUnread?: boolean;
  filterType?: string;
}

export interface NotificationDto {
  id: number;
  type: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  icon: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  relatedData?: any;
}

export interface GetUserNotificationsResponseDto {
  notifications: NotificationDto[];
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

export class GetUserNotifications {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async execute(dto: GetUserNotificationsRequestDto): Promise<GetUserNotificationsResponseDto> {
    const { userId, page = 1, limit = 20, filterUnread, filterType } = dto;

    // Construir filtros
    const filters = {
      isRead: filterUnread === true ? false : undefined,
      type: filterType
    };

    // Obtener notificaciones paginadas
    const result = await this.notificationRepository.findByUserId(
      userId,
      { page, limit, sortBy: 'createdAt', sortOrder: 'desc' },
      filters
    );

    // Formatear notificaciones
    const notifications = result.data.map(notification => ({
      id: notification.id,
      type: notification.type,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      icon: notification.getIcon(),
      message: notification.getFormattedMessage(),
      priority: notification.getPriority(),
      relatedData: notification.relatedData
    }));

    return {
      notifications,
      pagination: result.pagination,
      stats: result.stats
    };
  }
}