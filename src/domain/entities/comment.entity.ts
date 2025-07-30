export class CommentEntity {
  constructor(
    public id: number,
    public postId: number,
    public authorId: number | null,
    public parentCommentId: number | null,
    public content: string,
    public isEdited: boolean,
    public editedAt: Date | null,
    public editCount: number,                 // ✅ AGREGADO ESTE CAMPO
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
      isEdited || false, editedAt, editCount || 0,                    // ✅ CAMPO AGREGADO
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
    
    // Solo el autor puede editar su comentario
    return this.isAuthor(userId);
  }

  // Verificar si puede ser eliminado
  canBeDeletedBy(userId: number, userRole: string): boolean {
    if (this.isDeleted) return false;
    
    // El autor puede eliminar su comentario
    if (this.isAuthor(userId)) return true;
    
    // Admin y moderadores pueden eliminar cualquier comentario
    return ['admin', 'moderator'].includes(userRole);
  }

  // Verificar si puede recibir votos
  canBeVotedBy(userId: number): boolean {
    if (this.isDeleted || this.isHidden) return false;
    
    // No puedes votar tu propio comentario
    return !this.isAuthor(userId);
  }
  
  // Marcar como editado
  markAsEdited(): void {
    this.isEdited = true;
    this.editedAt = new Date();
    this.editCount = (this.editCount || 0) + 1;     // ✅ USANDO EL CAMPO
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
    // Solo verificar que no esté eliminado u oculto
    return !this.isDeleted && !this.isHidden;
  }

  // Obtener información de edición para mostrar
  getEditInfo(): {
    isEdited: boolean;
    editedAt: Date | null;
    editCount: number;
    canStillEdit: boolean;
    minutesSinceCreation: number; // Para mostrar "hace X minutos"
  } {
    const minutesSinceCreation = this.getMinutesSinceCreation();

    return {
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      editCount: this.editCount || 0,                // ✅ USANDO EL CAMPO
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
}