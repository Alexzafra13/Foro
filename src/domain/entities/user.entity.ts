export class UserEntity {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public passwordHash: string,
    public reputation: number,
    public roleId: number,
    public createdAt: Date,
    public role?: { id: number; name: string },
    public avatarUrl?: string | null
  ) {}

  static fromObject(object: { [key: string]: any }): UserEntity {
    const { 
      id, username, email, passwordHash, reputation, 
      roleId, createdAt, role, avatarUrl 
    } = object;
    
    if (!id) throw new Error('User id is required');
    if (!username) throw new Error('User username is required');
    if (!email) throw new Error('User email is required');
    if (!passwordHash) throw new Error('User passwordHash is required');
    
    return new UserEntity(
      id, username, email, passwordHash, 
      reputation || 0, roleId, createdAt, 
      role, avatarUrl
    );
  }
}