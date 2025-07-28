export class PostEntity {
  constructor(
    public id: number,
    public channelId: number,
    public authorId: number | null,
    public title: string,
    public content: string,
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
      role: {
        id: number;
        name: string;
      };
    },
    public _count?: {
      comments: number;
      votes: number;
    },
    public voteScore?: number
  ) {}

  static fromObject(object: { [key: string]: any }): PostEntity {
    const {
      id, channelId, authorId, title, content, isLocked, isPinned,
      createdAt, updatedAt, channel, author, _count, voteScore
    } = object;

    if (!id) throw new Error('Post id is required');
    if (!channelId) throw new Error('Post channelId is required');
    if (!title) throw new Error('Post title is required');
    if (!content) throw new Error('Post content is required');

    return new PostEntity(
      id, channelId, authorId, title, content,
      isLocked || false, isPinned || false,
      createdAt, updatedAt, channel, author, _count, voteScore
    );
  }

  // Métodos de dominio
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
}