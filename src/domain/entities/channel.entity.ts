export class ChannelEntity {
  constructor(
    public id: number,
    public categoryId: number | null,
    public name: string,
    public description: string | null,
    public icon: string | null,
    public position: number,
    public isPrivate: boolean,
    public isVisible: boolean,
    public createdAt: Date,
    public category?: {
      id: number;
      name: string;
    },
    public _count?: {
      posts: number;
      members: number;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): ChannelEntity {
    const {
      id, categoryId, name, description, icon, position, 
      isPrivate, isVisible, createdAt, category, _count
    } = object;

    if (!id) throw new Error('Channel id is required');
    if (!name) throw new Error('Channel name is required');

    return new ChannelEntity(
      id, categoryId, name, description, icon, position || 0,
      isPrivate || false, isVisible !== false, createdAt, 
      category, _count
    );
  }

  canBeAccessedBy(userId?: number): boolean {
    if (!this.isPrivate) return true;
    return !!userId; // Solo usuarios autenticados pueden ver canales privados
  }
}