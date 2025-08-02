import { NotificationRepository } from "@/domain/repositories/notification.repository";

export interface MarkAllAsReadRequestDto {
  userId: number; // Del JWT
}

export interface MarkAllAsReadResponseDto {
  count: number;
  message: string;
}

export class MarkAllAsRead {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async execute(dto: MarkAllAsReadRequestDto): Promise<MarkAllAsReadResponseDto> {
    const { userId } = dto;

    const count = await this.notificationRepository.markAllAsRead(userId);

    return {
      count,
      message: count > 0 
        ? `${count} notifications marked as read`
        : 'No unread notifications to mark'
    };
  }
}