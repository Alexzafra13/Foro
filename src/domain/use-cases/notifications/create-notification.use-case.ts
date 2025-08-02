import { NotificationRepository } from '@/domain/repositories/notification.repository'; 
import { UserRepository } from '@/domain/repositories/user.repository'; 
import { NotificationType } from '@/domain/entities/notification.entity'; 
import { UserErrors } from '@/shared';

export interface CreateNotificationRequestDto {
  userId: number;
  type: NotificationType;
  content?: string;
  relatedData?: {
    postId?: number;
    commentId?: number;
    mentionedBy?: number;
    votedBy?: number;
  };
}

export interface CreateNotificationResponseDto {
  id: number;
  type: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  message: string;
}

export class CreateNotification {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: CreateNotificationRequestDto): Promise<CreateNotificationResponseDto> {
    const { userId, type, content, relatedData } = dto;

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Crear notificación
    const notification = await this.notificationRepository.create({
      userId,
      type,
      content,
      relatedData
    });

    return {
      id: notification.id,
      type: notification.type,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      message: notification.getFormattedMessage()
    };
  }
}