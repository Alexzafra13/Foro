// src/domain/entities/notification.entity.ts - CON TIPO 'moderation'
export type NotificationType = 
  | 'post_reply'
  | 'comment_reply'
  | 'post_vote'
  | 'comment_vote'
  | 'mention'
  | 'new_follower'
  | 'post_deleted'
  | 'comment_deleted'
  | 'moderation'  // ✅ NUEVO TIPO PARA MODERACIÓN
  | 'welcome'
  | 'email_verified'
  | 'password_changed'
  | 'system';

export class NotificationEntity {
  constructor(
    public id: number,
    public userId: number,
    public type: NotificationType,
    public content: string | null,
    public isRead: boolean,
    public createdAt: Date,
    public relatedData?: {
      postId?: number;
      commentId?: number;
      mentionedBy?: number;
      votedBy?: number;
      // ✅ NUEVOS CAMPOS PARA MODERACIÓN
      moderatorId?: number;
      moderatorUsername?: string;
      action?: 'comment_hidden' | 'comment_restored' | 'post_hidden' | 'post_restored';
    },
    public user?: {
      id: number;
      username: string;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): NotificationEntity {
    const { id, userId, type, content, isRead, createdAt, user } = object;

    if (!id) throw new Error('Notification id is required');
    if (!userId) throw new Error('Notification userId is required');
    if (!type) throw new Error('Notification type is required');

    // Parsear content si es JSON
    let relatedData = undefined;
    if (content) {
      try {
        relatedData = JSON.parse(content);
      } catch {
        // Si no es JSON válido, content es solo texto
      }
    }

    return new NotificationEntity(
      id,
      userId,
      type as NotificationType,
      content,
      isRead || false,
      createdAt,
      relatedData,
      user
    );
  }

  // Métodos de dominio
  markAsRead(): void {
    this.isRead = true;
  }

  isUnread(): boolean {
    return !this.isRead;
  }

  isOlderThan(days: number): boolean {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.createdAt < cutoffDate;
  }

  // Formatear mensaje según el tipo
  getFormattedMessage(): string {
    switch (this.type) {
      case 'post_reply':
        return 'Alguien respondió a tu post';
      case 'comment_reply':
        return 'Alguien respondió a tu comentario';
      case 'post_vote':
        return 'Alguien votó tu post';
      case 'comment_vote':
        return 'Alguien votó tu comentario';
      case 'mention':
        return 'Te mencionaron en una publicación';
      case 'new_follower':
        return 'Tienes un nuevo seguidor';
      case 'post_deleted':
        return 'Tu post fue eliminado';
      case 'comment_deleted':
        return 'Tu comentario fue eliminado';
      // ✅ NUEVO CASO PARA MODERACIÓN
      case 'moderation':
        return this.content || 'Acción de moderación realizada';
      case 'welcome':
        return '¡Bienvenido/a al foro!';
      case 'email_verified':
        return 'Tu email ha sido verificado';
      case 'password_changed':
        return 'Tu contraseña fue cambiada exitosamente';
      case 'system':
        return this.content || 'Notificación del sistema';
      default:
        return 'Nueva notificación';
    }
  }

  // Obtener icono según el tipo
  getIcon(): string {
    const iconMap: Record<NotificationType, string> = {
      'post_reply': '💬',
      'comment_reply': '💬',
      'post_vote': '👍',
      'comment_vote': '👍',
      'mention': '@',
      'new_follower': '👤',
      'post_deleted': '🗑️',
      'comment_deleted': '🗑️',
      'moderation': '🛡️',  // ✅ NUEVO ICONO PARA MODERACIÓN
      'welcome': '👋',
      'email_verified': '✅',
      'password_changed': '🔒',
      'system': 'ℹ️'
    };
    return iconMap[this.type] || '📬';
  }

  // Prioridad de la notificación
  getPriority(): 'high' | 'medium' | 'low' {
    const highPriority: NotificationType[] = ['mention', 'post_deleted', 'comment_deleted', 'moderation', 'password_changed'];
    const mediumPriority: NotificationType[] = ['post_reply', 'comment_reply', 'new_follower'];
    
    if (highPriority.includes(this.type)) return 'high';
    if (mediumPriority.includes(this.type)) return 'medium';
    return 'low';
  }
}