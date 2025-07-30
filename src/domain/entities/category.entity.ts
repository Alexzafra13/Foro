export class CategoryEntity {
  constructor(
    public id: number,
    public name: string,
    public description: string | null,
    public icon: string | null,
    public position: number,
    public isVisible: boolean,
    public createdAt: Date,
    public channels?: any[]
  ) {}

  static fromObject(object: { [key: string]: any }): CategoryEntity {
    const {
      id, name, description, icon, position, isVisible, createdAt, channels
    } = object;

    if (!id) throw new Error('Category id is required');
    if (!name) throw new Error('Category name is required');

    return new CategoryEntity(
      id, name, description, icon, position || 0, 
      isVisible !== false, createdAt, channels
    );
  }
}