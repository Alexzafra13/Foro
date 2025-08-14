// src/domain/use-cases/notifications/create-notification.use-case.ts

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
    parentCommentId?: number;
    authorId?: number;
    authorUsername?: string;
    postTitle?: string;
    voteType?: number;
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

    // 2. Crear notificación usando el repository (que usa datasource)
    const notification = await this.notificationRepository.create({
      userId,
      type: type as string, // Convertir type a string
      content,
      relatedData
    });

    // ✅ 3. SSE CON MANEJO CORRECTO DE ERRORES
    try {
      // Import dinámico para evitar dependencias circulares
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
    } catch (error: unknown) {
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

  // ✅ MÉTODOS HELPER ACTUALIZADOS EN ESPAÑOL CON MÁS DATOS
  
  // Crear notificación de respuesta a post
  static forPostReply(postAuthorId: number, postId: number, commentId: number, replierName?: string, postTitle?: string): CreateNotificationRequestDto {
    return {
      userId: postAuthorId,
      type: 'post_reply' as NotificationType,
      content: replierName ? `${replierName} respondió a tu post` : 'Alguien respondió a tu post',
      relatedData: { 
        postId, 
        commentId,
        authorUsername: replierName,
        postTitle: postTitle || `Post #${postId}`
      }
    };
  }

  // Crear notificación de voto en post
  static forPostVote(targetUserId: number, postId: number, voterName?: string, voteType?: number, postTitle?: string): CreateNotificationRequestDto {
    const voteText = voteType === 1 ? 'votó positivamente' : voteType === -1 ? 'votó negativamente' : 'votó';
    return {
      userId: targetUserId,
      type: 'post_vote' as NotificationType,
      content: voterName ? `${voterName} ${voteText} tu post` : `Alguien ${voteText} tu post`,
      relatedData: { 
        postId,
        voteType,
        authorUsername: voterName,
        postTitle: postTitle || `Post #${postId}`
      }
    };
  }

  // Crear notificación de voto en comentario
  static forCommentVote(targetUserId: number, commentId: number, voterName?: string, voteType?: number, postId?: number): CreateNotificationRequestDto {
    const voteText = voteType === 1 ? 'votó positivamente' : voteType === -1 ? 'votó negativamente' : 'votó';
    return {
      userId: targetUserId,
      type: 'comment_vote' as NotificationType,
      content: voterName ? `${voterName} ${voteText} tu comentario` : `Alguien ${voteText} tu comentario`,
      relatedData: { 
        commentId,
        postId,
        voteType,
        authorUsername: voterName
      }
    };
  }

  // Crear notificación de mención
  static forMention(mentionedUserId: number, postId?: number, commentId?: number, mentionerName?: string): CreateNotificationRequestDto {
    return {
      userId: mentionedUserId,
      type: 'mention' as NotificationType,
      content: mentionerName ? `${mentionerName} te mencionó` : 'Alguien te mencionó',
      relatedData: { 
        postId, 
        commentId,
        authorUsername: mentionerName
      }
    };
  }

  // Crear notificación de respuesta a comentario
  static forCommentReply(parentCommentAuthorId: number, postId: number, commentId: number, parentCommentId: number, replierName?: string, postTitle?: string): CreateNotificationRequestDto {
    return {
      userId: parentCommentAuthorId,
      type: 'comment_reply' as NotificationType,
      content: replierName ? `${replierName} respondió a tu comentario` : 'Alguien respondió a tu comentario',
      relatedData: {
        postId,
        commentId,
        parentCommentId,
        authorUsername: replierName,
        postTitle: postTitle || `Post #${postId}`
      }
    };
  }

  // Crear notificación de bienvenida
  static forWelcome(userId: number, username?: string): CreateNotificationRequestDto {
    return {
      userId,
      type: 'welcome' as NotificationType,
      content: username ? `¡Bienvenido/a al foro, ${username}!` : '¡Bienvenido/a al foro!',
      relatedData: {}
    };
  }

  // Crear notificación de sistema
  static forSystem(userId: number, message: string): CreateNotificationRequestDto {
    return {
      userId,
      type: 'system' as NotificationType,
      content: message,
      relatedData: {}
    };
  }
}