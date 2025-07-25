export class RoleEntity {
  constructor(
    public id: number,
    public name: string
  ) {}

  static fromObject(object: { [key: string]: any }): RoleEntity {
    const { id, name } = object;
    
    if (!id) throw new Error('Role id is required');
    if (!name) throw new Error('Role name is required');
    
    return new RoleEntity(id, name);
  }
}