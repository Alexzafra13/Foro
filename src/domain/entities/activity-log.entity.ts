// src/domain/entities/activity-log.entity.ts - VERSIÓN CORREGIDA
export type ActivityAction = 
  | 'login' | 'logout' | 'register'
  | 'post_created' | 'post_updated' | 'post_deleted'
  | 'comment_created' | 'comment_updated' | 'comment_deleted'
  | 'profile_updated' | 'avatar_updated' | 'password_changed'
  | 'password_reset_requested' | 'password_reset_completed'
  | 'settings_updated' | 'email_verified'
  | 'invite_created' | 'invite_used'
  | 'user_banned' | 'user_unbanned'
  | 'role_changed';

export interface ActivityDetails {
  [key: string]: any;
  // Ejemplos específicos:
  postId?: number;
  commentId?: number;
  targetUserId?: number;
  oldRole?: string;
  newRole?: string;
  changes?: string[];
  method?: string;
}

// ✅ INTERFACE ESPECÍFICA PARA CREAR LOGS
export interface CreateActivityLogData {
  userId: number | null;
  action: ActivityAction;
  details: ActivityDetails | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export class ActivityLogEntity {
  constructor(
    public id: number,
    public userId: number | null,
    public action: ActivityAction,
    public details: ActivityDetails | null,
    public ipAddress: string | null,
    public userAgent: string | null,
    public createdAt: Date,
    public user?: {
      id: number;
      username: string;
      role: string;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): ActivityLogEntity {
    const {
      id, userId, action, details, ipAddress, userAgent, createdAt, user
    } = object;

    if (!id) throw new Error('ActivityLog id is required');
    if (!action) throw new Error('ActivityLog action is required');

    return new ActivityLogEntity(
      id, userId, action, details, ipAddress, userAgent, createdAt, user
    );
  }

  // ===== MÉTODOS DE DOMINIO =====

  isUserAction(): boolean {
    return this.userId !== null;
  }

  isSystemAction(): boolean {
    return this.userId === null;
  }

  isSecurityRelevant(): boolean {
    const securityActions: ActivityAction[] = [
      'login', 'logout', 'register', 'password_changed', 
      'password_reset_requested', 'password_reset_completed',
      'user_banned', 'user_unbanned', 'role_changed'
    ];
    return securityActions.includes(this.action);
  }

  isContentAction(): boolean {
    const contentActions: ActivityAction[] = [
      'post_created', 'post_updated', 'post_deleted',
      'comment_created', 'comment_updated', 'comment_deleted'
    ];
    return contentActions.includes(this.action);
  }

  isAdminAction(): boolean {
    const adminActions: ActivityAction[] = [
      'user_banned', 'user_unbanned', 'role_changed', 'invite_created'
    ];
    return adminActions.includes(this.action);
  }

  getFormattedMessage(): string {
    switch (this.action) {
      case 'login':
        return 'Inició sesión';
      case 'logout':
        return 'Cerró sesión';
      case 'register':
        return 'Se registró en el foro';
      case 'post_created':
        return `Creó un nuevo post${this.details?.postId ? ` (ID: ${this.details.postId})` : ''}`;
      case 'post_updated':
        return `Actualizó un post${this.details?.postId ? ` (ID: ${this.details.postId})` : ''}`;
      case 'post_deleted':
        return `Eliminó un post${this.details?.postId ? ` (ID: ${this.details.postId})` : ''}`;
      case 'comment_created':
        return `Creó un comentario${this.details?.commentId ? ` (ID: ${this.details.commentId})` : ''}`;
      case 'profile_updated':
        return `Actualizó su perfil${this.details?.changes ? `: ${this.details.changes.join(', ')}` : ''}`;
      case 'avatar_updated':
        return 'Cambió su avatar';
      case 'password_changed':
        return 'Cambió su contraseña';
      case 'password_reset_requested':
        return 'Solicitó recuperar contraseña';
      case 'password_reset_completed':
        return 'Completó recuperación de contraseña';
      case 'settings_updated':
        return 'Actualizó sus configuraciones';
      case 'email_verified':
        return 'Verificó su email';
      case 'invite_created':
        return 'Generó un código de invitación';
      case 'invite_used':
        return 'Usó un código de invitación';
      case 'user_banned':
        return `Baneó a un usuario${this.details?.targetUserId ? ` (ID: ${this.details.targetUserId})` : ''}`;
      case 'user_unbanned':
        return `Desbaneó a un usuario${this.details?.targetUserId ? ` (ID: ${this.details.targetUserId})` : ''}`;
      case 'role_changed':
        return `Cambió rol de ${this.details?.oldRole || 'desconocido'} a ${this.details?.newRole || 'desconocido'}`;
      default:
        return `Realizó la acción: ${this.action}`;
    }
  }

  // ===== MÉTODOS ESTÁTICOS PARA CREAR LOGS =====

  static createLoginLog(userId: number, ipAddress: string, userAgent: string): CreateActivityLogData {
    return {
      userId,
      action: 'login',
      details: null,
      ipAddress,
      userAgent
    };
  }

  static createPostCreatedLog(userId: number, postId: number, ipAddress?: string): CreateActivityLogData {
    return {
      userId,
      action: 'post_created',
      details: { postId },
      ipAddress: ipAddress || null,
      userAgent: null
    };
  }

  static createProfileUpdatedLog(userId: number, changes: string[], ipAddress?: string): CreateActivityLogData {
    return {
      userId,
      action: 'profile_updated',
      details: { changes },
      ipAddress: ipAddress || null,
      userAgent: null
    };
  }

  static createPasswordChangedLog(userId: number, ipAddress?: string): CreateActivityLogData {
    return {
      userId,
      action: 'password_changed',
      details: { method: 'authenticated_change' },
      ipAddress: ipAddress || null,
      userAgent: null
    };
  }

  static createPasswordResetRequestLog(userId: number, ipAddress?: string, userAgent?: string): CreateActivityLogData {
    return {
      userId,
      action: 'password_reset_requested',
      details: { method: 'email_reset' },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    };
  }

  static createPasswordResetCompletedLog(userId: number, ipAddress?: string, userAgent?: string): CreateActivityLogData {
    return {
      userId,
      action: 'password_reset_completed',
      details: { method: 'email_reset' },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    };
  }

  static createSettingsUpdatedLog(userId: number, changes: string[], ipAddress?: string): CreateActivityLogData {
    return {
      userId,
      action: 'settings_updated',
      details: { changes },
      ipAddress: ipAddress || null,
      userAgent: null
    };
  }

  static createAdminActionLog(adminId: number, action: ActivityAction, details: ActivityDetails, ipAddress?: string): CreateActivityLogData {
    return {
      userId: adminId,
      action,
      details,
      ipAddress: ipAddress || null,
      userAgent: null
    };
  }
}