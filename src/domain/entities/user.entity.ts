// src/domain/entities/user.entity.ts (ACTUALIZADO)
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
    public avatarUrl?: string | null,
    public isEmailVerified?: boolean,
    public emailVerifiedAt?: Date | null
  ) {}

  static fromObject(object: { [key: string]: any }): UserEntity {
    const { 
      id, username, email, passwordHash, reputation, 
      roleId, createdAt, role, avatarUrl,
      isEmailVerified, emailVerifiedAt  
    } = object;
    
    if (!id) throw new Error('User id is required');
    if (!username) throw new Error('User username is required');
    if (!email) throw new Error('User email is required');
    if (!passwordHash) throw new Error('User passwordHash is required');
    
    return new UserEntity(
      id, username, email, passwordHash, 
      reputation || 0, roleId, createdAt, 
      role, avatarUrl,
      isEmailVerified || false,
      emailVerifiedAt || null    
    );
  }

  isVerified(): boolean {
    return this.isEmailVerified === true;
  }

  canCreateContent(): boolean {
    return this.isVerified();
  }

  markAsVerified(): void {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }

  needsEmailVerification(): boolean {
    return !this.isEmailVerified;
  }
}