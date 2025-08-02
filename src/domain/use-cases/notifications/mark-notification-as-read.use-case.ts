import { NotificationRepository } from '../../repositories/notification.repository';
import { NotificationErrors } from '../../../shared/errors';

export interface MarkNotificationAsReadRequestDto {
  notificationId: number;
  userId: number; // Del JWT
}

export interface MarkNotificationAsReadResponseDto {
  id: number;
  isRead: boolean;
  message: string;
}

export class MarkNotificationAsRead {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async execute(dto: MarkNotificationAsReadRequestDto): Promise<MarkNotificationAsReadResponseDto> {
    const { notificationId, userId } = dto;

    // 1. Obtener notificación
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw NotificationErrors.notificationNotFound(notificationId);
    }

    // 2. Verificar que pertenece al usuario
    if (notification.userId !== userId) {
      throw NotificationErrors.cannotAccessNotification();
    }

    // 3. Si ya está leída, retornar sin cambios
    if (notification.isRead) {
      return {
        id: notification.id,
        isRead: true,
        message: 'Notification already marked as read'
      };
    }

    // 4. Marcar como leída
    const updatedNotification = await this.notificationRepository.markAsRead(notificationId);

    return {
      id: updatedNotification.id,
      isRead: updatedNotification.isRead,
      message: 'Notification marked as read successfully'
    };
  }
}