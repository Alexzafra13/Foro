// src/domain/entities/comment.entity.ts - VERSIÓN COMPLETA CON avatarUrl
export class CommentEntity {
  constructor(
    public id: number,
    public postId: number,
    public authorId: number | null,
    public parentCommentId: number | null,
    public content: string,
    public isEdited: boolean,
    public editedAt: Date | null,
    public editCount: number,
    public isDeleted: boolean,
    public deletedAt: Date | null,
    public deletedBy: number | null,
    public deletionReason: string | null,
    public isHidden: boolean,
    public createdAt: Date,
    public updatedAt: Date | null,
    public author?: {
      id: number;
      username: string;
      reputation: number;
      avatarUrl: string | null; // ✅ AGREGAR avatarUrl
      role: {
        id: number;
        name: string;
      };
    },
    public parentComment?: {
      id: number;
      content: string;
      authorUsername: string;
    },
    public replies?: CommentEntity[],
    public _count?: {
      votes: number;
      replies: number;
    },
    public voteScore?: number,
    public userVote?: 1 | -1 | null
  ) {}

  static fromObject(object: { [key: string]: any }): CommentEntity {
    const {
      id, postId, authorId, parentCommentId, content, isEdited, editedAt, editCount,
      isDeleted, deletedAt, deletedBy, deletionReason, isHidden,
      createdAt, updatedAt, author, parentComment, replies, _count, voteScore, userVote
    } = object;

    if (!id) throw new Error('Comment id is required');
    if (!postId) throw new Error('Comment postId is required');
    if (!content) throw new Error('Comment content is required');

    return new CommentEntity(
      id, postId, authorId, parentCommentId, content, 
      isEdited || false, editedAt, editCount || 0,
      isDeleted || false, deletedAt, deletedBy, deletionReason, isHidden || false,
      createdAt, updatedAt, author, parentComment, replies, _count, voteScore, userVote
    );
  }

  // Verificar si es autor del comentario
  isAuthor(userId: number): boolean {
    return this.authorId === userId;
  }

  // Verificar si puede ser editado
  canBeEditedBy(userId: number, userRole: string): boolean {
    if (this.isDeleted || this.isHidden) return false;
    return this.isAuthor(userId);
  }

  // Verificar si puede ser eliminado
  canBeDeletedBy(userId: number, userRole: string): boolean {
    if (this.isDeleted) return false;
    
    if (this.isAuthor(userId)) return true;
    
    return ['admin', 'moderator'].includes(userRole);
  }

  // Verificar si puede recibir votos
  canBeVotedBy(userId: number): boolean {
    if (this.isDeleted || this.isHidden) return false;
    return !this.isAuthor(userId);
  }
  
  // Marcar como editado
  markAsEdited(): void {
    this.isEdited = true;
    this.editedAt = new Date();
    this.editCount = (this.editCount || 0) + 1;
    this.updatedAt = new Date();
  }

  // Obtener tiempo desde creación (para rate limiting)
  getMinutesSinceCreation(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  // Verificar si puede ser editado (sin límite de tiempo)
  canStillBeEdited(): boolean {
    return !this.isDeleted && !this.isHidden;
  }

  // Obtener información de edición para mostrar
  getEditInfo(): {
    isEdited: boolean;
    editedAt: Date | null;
    editCount: number;
    canStillEdit: boolean;
    minutesSinceCreation: number;
  } {
    const minutesSinceCreation = this.getMinutesSinceCreation();

    return {
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      editCount: this.editCount || 0,
      canStillEdit: this.canStillBeEdited(),
      minutesSinceCreation
    };
  }

  // Marcar como eliminado (soft delete)
  markAsDeleted(deletedBy: number, reason: string): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.deletionReason = reason;
  }

  // Ocultar por moderación
  hideByModeration(moderatorId: number): void {
    this.isHidden = true;
    this.deletedBy = moderatorId;
    this.deletionReason = 'moderation';
  }

  // Verificar si está disponible para mostrar
  isVisible(): boolean {
    return !this.isDeleted && !this.isHidden;
  }

  // Obtener contenido a mostrar
  getDisplayContent(): string {
    if (this.isDeleted) {
      if (this.deletionReason === 'moderation') {
        return '[Este comentario ha sido eliminado por moderación]';
      }
      return '[Comentario eliminado]';
    }
    
    if (this.isHidden) {
      return '[Este comentario ha sido ocultado por moderación]';
    }
    
    return this.content;
  }

  // Verificar si es una respuesta
  isReply(): boolean {
    return this.parentCommentId !== null;
  }

  // Verificar si tiene respuestas
  hasReplies(): boolean {
    return (this._count?.replies || 0) > 0;
  }

  // ✅ NUEVOS MÉTODOS PARA AVATAR
  hasAuthorAvatar(): boolean {
    return !!(this.author?.avatarUrl);
  }

  getAuthorAvatarUrl(): string | null {
    return this.author?.avatarUrl || null;
  }

  getAuthorInfo(): {
    id: number;
    username: string;
    reputation: number;
    avatarUrl: string | null;
    role: { id: number; name: string };
  } | null {
    if (!this.author) return null;
    
    return {
      id: this.author.id,
      username: this.author.username,
      reputation: this.author.reputation,
      avatarUrl: this.author.avatarUrl,
      role: this.author.role
    };
  }
}