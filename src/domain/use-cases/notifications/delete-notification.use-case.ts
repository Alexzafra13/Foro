import { NotificationRepository } from '../../repositories/notification.repository';
import { NotificationErrors, UserErrors } from '../../../shared/errors';

export interface DeleteNotificationRequestDto {
  notificationId: number;
  userId: number; // Del JWT
}

export interface DeleteNotificationResponseDto {
  id: number;
  message: string;
}

export class DeleteNotification {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async execute(dto: DeleteNotificationRequestDto): Promise<DeleteNotificationResponseDto> {
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

    // 3. Eliminar la notificación
    await this.notificationRepository.deleteById(notificationId);

    return {
      id: notificationId,
      message: 'Notification deleted successfully'
    };
  }
}