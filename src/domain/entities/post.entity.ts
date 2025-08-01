// src/domain/entities/post.entity.ts - VERSIÓN FINAL COMPLETA
export class PostEntity {
  constructor(
    public id: number,
    public channelId: number,
    public authorId: number | null,
    public title: string,
    public content: string,
    public views: number, // ✅ AGREGAR VIEWS
    public isLocked: boolean,
    public isPinned: boolean,
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
      avatarUrl: string | null; // ✅ INCLUIR avatarUrl
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
      createdAt, updatedAt, channel, author, _count, voteScore, userVote
    } = object;

    if (!id) throw new Error('Post id is required');
    if (!channelId) throw new Error('Post channelId is required');
    if (!title) throw new Error('Post title is required');
    if (!content) throw new Error('Post content is required');

    return new PostEntity(
      id, channelId, authorId, title, content,
      views || 0, // ✅ INCLUIR VIEWS CON DEFAULT 0
      isLocked || false, isPinned || false,
      createdAt, updatedAt, channel, author, _count, 
      voteScore || 0, userVote || null
    );
  }

  // Métodos existentes...
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

  hasUserVoted(userId: number): boolean {
    return this.userVote !== null && this.userVote !== undefined;
  }

  getUserVoteType(userId: number): 1 | -1 | null {
    return this.userVote || null;
  }

  getVoteScore(): number {
    return this.voteScore || 0;
  }

  // ✅ MÉTODOS PARA VIEWS
  getViews(): number {
    return this.views || 0;
  }

  // Método para obtener estadísticas completas
  getStats(): {
    views: number;
    voteScore: number;
    totalVotes: number;
    totalComments: number;
    userVote: 1 | -1 | null;
  } {
    return {
      views: this.views || 0,
      voteScore: this.voteScore || 0,
      totalVotes: this._count?.votes || 0,
      totalComments: this._count?.comments || 0,
      userVote: this.userVote || null
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

  getAuthorAvatarUrl(): string | null {
    return this.author?.avatarUrl || null;
  }
}