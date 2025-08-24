// src/domain/entities/post.entity.ts - REEMPLAZAR COMPLETO

export class PostEntity {
  constructor(
    public id: number,
    public channelId: number,
    public authorId: number | null,
    public title: string,
    public content: string,
    public views: number,
    public isLocked: boolean,
    public isPinned: boolean,
    // ✅ CAMPOS DE MODERACIÓN (igual que CommentEntity)
    public isHidden: boolean,
    public deletedBy: number | null,
    public deletionReason: string | null,
    public createdAt: Date,
    public updatedAt: Date | null,
    public channel?: {
      id: number;
      name: string;
      isPrivate: boolean;
    },
    public author?: {
      id: number;
      username: string;
      reputation: number;
      avatarUrl: string | null;
      role: {
        id: number;
        name: string;
      };
    },
    public _count?: {
      comments: number;
      votes: number;
    },
    public voteScore?: number,
    public userVote?: 1 | -1 | null
  ) {}

  static fromObject(object: { [key: string]: any }): PostEntity {
    const {
      id, channelId, authorId, title, content, views, isLocked, isPinned,
      isHidden, deletedBy, deletionReason, // ✅ CAMPOS DE MODERACIÓN
      createdAt, updatedAt, channel, author, _count, voteScore, userVote
    } = object;

    if (!id) throw new Error('Post id is required');
    if (!channelId) throw new Error('Post channelId is required');
    if (!title) throw new Error('Post title is required');
    if (!content) throw new Error('Post content is required');

    // ✅ MAPEO SEGURO (igual que CommentEntity)
    const isHiddenValue = isHidden === true || isHidden === 1 || isHidden === '1' || isHidden === 'true';
    const isLockedValue = isLocked === true || isLocked === 1 || isLocked === '1' || isLocked === 'true';
    const isPinnedValue = isPinned === true || isPinned === 1 || isPinned === '1' || isPinned === 'true';

    return new PostEntity(
      id, channelId, authorId, title, content,
      views || 0,
      isLockedValue, isPinnedValue,
      isHiddenValue, deletedBy, deletionReason, // ✅ INCLUIR CAMPOS DE MODERACIÓN
      createdAt, updatedAt, channel, author, _count, 
      voteScore || 0, userVote || null
    );
  }

  // ===== MÉTODOS EXISTENTES (SIN CAMBIOS) =====
  isAuthor(userId: number): boolean {
    return this.authorId === userId;
  }

  canBeEditedBy(userId: number, userRole: string): boolean {
    if (this.isLocked && userRole !== 'admin' && userRole !== 'moderator') {
      return false;
    }
    return this.isAuthor(userId) || ['admin', 'moderator'].includes(userRole);
  }

  canBeDeletedBy(userId: number, userRole: string): boolean {
    return this.isAuthor(userId) || ['admin', 'moderator'].includes(userRole);
  }

  canBeVotedBy(userId: number): boolean {
    if (this.isLocked) return false;
    return !this.isAuthor(userId);
  }

  // ===== MÉTODOS DE MODERACIÓN (NUEVOS, igual que CommentEntity) =====
  
  hideByModeration(moderatorId: number, reason: string = 'moderation'): void {
    this.isHidden = true;
    this.deletedBy = moderatorId;
    this.deletionReason = reason;
    this.updatedAt = new Date();
  }

  unhideByModeration(): void {
    this.isHidden = false;
    this.deletedBy = null;
    this.deletionReason = null;
    this.updatedAt = new Date();
  }

  isVisible(): boolean {
    return !this.isHidden;
  }

  getDisplayContent(): string {
    if (this.isHidden) {
      return '[Este post ha sido ocultado por moderación]';
    }
    return this.content;
  }

  getDisplayTitle(): string {
    if (this.isHidden) {
      return '[Post Moderado]';
    }
    return this.title;
  }

  getModerationStatus(): {
    isModerated: boolean;
    canShowOriginalContent: boolean;
    moderationMessage: string;
  } {
    if (!this.isHidden) {
      return {
        isModerated: false,
        canShowOriginalContent: false,
        moderationMessage: ''
      };
    }

    return {
      isModerated: true,
      canShowOriginalContent: true,
      moderationMessage: 'Este post ha sido moderado por violar las normas de la comunidad'
    };
  }

  // ===== MÉTODOS DE ESTADÍSTICAS (SIN CAMBIOS) =====
  
  hasUserVoted(userId: number): boolean {
    return this.userVote !== null && this.userVote !== undefined;
  }

  getUserVoteType(userId: number): 1 | -1 | null {
    return this.userVote || null;
  }

  getVoteScore(): number {
    return this.voteScore || 0;
  }

  getViews(): number {
    return this.views || 0;
  }

  getStats(): {
    views: number;
    voteScore: number;
    totalVotes: number;
    totalComments: number;
    userVote: 1 | -1 | null;
    isModerated: boolean;
  } {
    return {
      views: this.views || 0,
      voteScore: this.voteScore || 0,
      totalVotes: this._count?.votes || 0,
      totalComments: this._count?.comments || 0,
      userVote: this.userVote || null,
      isModerated: this.isHidden
    };
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

  hasAuthorAvatar(): boolean {
    return !!(this.author?.avatarUrl);
  }
}