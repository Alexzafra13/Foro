// src/domain/entities/notification.entity.ts
export type NotificationType = 
  | 'post_reply'
  | 'comment_reply'
  | 'post_vote'
  | 'comment_vote'
  | 'mention'
  | 'new_follower'
  | 'post_deleted'
  | 'comment_deleted'
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
        return 'Someone replied to your post';
      case 'comment_reply':
        return 'Someone replied to your comment';
      case 'post_vote':
        return 'Your post received a vote';
      case 'comment_vote':
        return 'Your comment received a vote';
      case 'mention':
        return 'You were mentioned in a post';
      case 'new_follower':
        return 'You have a new follower';
      case 'post_deleted':
        return 'Your post was deleted by a moderator';
      case 'comment_deleted':
        return 'Your comment was deleted by a moderator';
      case 'welcome':
        return 'Welcome to the forum!';
      case 'email_verified':
        return 'Your email has been verified';
      case 'password_changed':
        return 'Your password was changed successfully';
      case 'system':
        return this.content || 'System notification';
      default:
        return 'New notification';
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
      'welcome': '👋',
      'email_verified': '✅',
      'password_changed': '🔒',
      'system': 'ℹ️'
    };
    return iconMap[this.type] || '📬';
  }

  // Prioridad de la notificación
  getPriority(): 'high' | 'medium' | 'low' {
    const highPriority: NotificationType[] = ['mention', 'post_deleted', 'comment_deleted', 'password_changed'];
    const mediumPriority: NotificationType[] = ['post_reply', 'comment_reply', 'new_follower'];
    
    if (highPriority.includes(this.type)) return 'high';
    if (mediumPriority.includes(this.type)) return 'medium';
    return 'low';
  }
}