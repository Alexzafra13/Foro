// src/domain/use-cases/notifications/create-notification.use-case.ts

import { NotificationRepository } from '@/domain/repositories/notification.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { NotificationType } from '@/domain/entities/notification.entity';
import { UserErrors } from '@/shared';

// ✅ MANTENER TUS INTERFACES ORIGINALES
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
      type: type as string, // ✅ CONVERTIR ENUM A STRING
      content,
      relatedData
    });

    // ✅ 3. SSE CON MANEJO CORRECTO DE ERRORES
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { SSEController } = await import('../../../presentation/controllers/sse.controller');
      
      // Formatear para SSE
      const sseData = {
        id: notification.id,
        type: notification.type,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        message: notification.getFormattedMessage(),
        relatedData: relatedData || null
      };

      // Enviar en tiempo real
      const sent = SSEController.sendNotificationToUser(userId, sseData);
      
      if (sent) {
        console.log(`📬 Notification sent via SSE to user ${userId}`);
        
        // También enviar contador actualizado
        const unreadCount = await this.notificationRepository.countUnreadByUser(userId);
        SSEController.sendUnreadCountToUser(userId, unreadCount);
      }
    } catch (error: unknown) { // ✅ TIPO EXPLÍCITO
      // Si falla SSE, no es crítico - la notificación ya está en BD
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('SSE not available or failed:', errorMessage);
    }

    // 4. Retornar respuesta original
    return {
      id: notification.id,
      type: notification.type,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      message: notification.getFormattedMessage()
    };
  }

  // ✅ MÉTODOS HELPER OPCIONALES PARA CASOS COMUNES
  
  // Crear notificación de respuesta a post
  static forPostReply(postAuthorId: number, postId: number, commentId: number, replierName?: string): CreateNotificationRequestDto {
    return {
      userId: postAuthorId,
      type: NotificationType.POST_REPLY, // ✅ USAR ENUM CORRECTAMENTE
      content: replierName ? `${replierName} respondió a tu post` : 'Alguien respondió a tu post',
      relatedData: { postId, commentId }
    };
  }

  // Crear notificación de voto
  static forVote(targetUserId: number, postId?: number, commentId?: number, voterName?: string): CreateNotificationRequestDto {
    const target = postId ? 'post' : 'comentario';
    return {
      userId: targetUserId,
      type: NotificationType.VOTE, // ✅ USAR ENUM CORRECTAMENTE
      content: voterName ? `${voterName} votó tu ${target}` : `Alguien votó tu ${target}`,
      relatedData: { postId, commentId }
    };
  }

  // Crear notificación de mención
  static forMention(mentionedUserId: number, postId?: number, commentId?: number, mentionerName?: string): CreateNotificationRequestDto {
    return {
      userId: mentionedUserId,
      type: NotificationType.MENTION, // ✅ USAR ENUM CORRECTAMENTE
      content: mentionerName ? `${mentionerName} te mencionó` : 'Alguien te mencionó',
      relatedData: { postId, commentId }
    };
  }
}