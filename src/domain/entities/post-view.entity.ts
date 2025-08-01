// src/domain/entities/post-view.entity.ts
export class PostViewEntity {
  constructor(
    public id: number,
    public userId: number,
    public postId: number,
    public ipAddress: string | null,
    public userAgent: string | null,
    public viewedAt: Date
  ) {}

  static fromObject(object: { [key: string]: any }): PostViewEntity {
    const { id, userId, postId, ipAddress, userAgent, viewedAt } = object;

    if (!id) throw new Error('PostView id is required');
    if (!userId) throw new Error('PostView userId is required');
    if (!postId) throw new Error('PostView postId is required');
    if (!viewedAt) throw new Error('PostView viewedAt is required');

    return new PostViewEntity(
      id,
      userId,
      postId,
      ipAddress || null,
      userAgent || null,
      viewedAt
    );
  }

  // Verificar si la vista es del mismo día
  isSameDay(date: Date): boolean {
    const viewDate = new Date(this.viewedAt);
    const compareDate = new Date(date);
    
    return viewDate.getFullYear() === compareDate.getFullYear() &&
           viewDate.getMonth() === compareDate.getMonth() &&
           viewDate.getDate() === compareDate.getDate();
  }

  // Verificar si la vista es de hoy
  isToday(): boolean {
    return this.isSameDay(new Date());
  }

  // Obtener información de la vista para logs
  getViewInfo(): {
    userId: number;
    postId: number;
    viewedAt: Date;
    isToday: boolean;
  } {
    return {
      userId: this.userId,
      postId: this.postId,
      viewedAt: this.viewedAt,
      isToday: this.isToday()
    };
  }
}