export class InviteCodeEntity {
  constructor(
    public code: string,
    public createdBy: number | null,
    public usedBy: number | null,
    public usedAt: Date | null,
    public createdAt: Date,
    public creator?: {
      id: number;
      username: string;
      role: string;
    },
    public user?: {
      id: number;
      username: string;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): InviteCodeEntity {
    const {
      code, createdBy, usedBy, usedAt, createdAt, creator, user
    } = object;

    if (!code) throw new Error('Invite code is required');
    if (!createdAt) throw new Error('Invite code createdAt is required');

    return new InviteCodeEntity(
      code, createdBy, usedBy, usedAt, createdAt, creator, user
    );
  }

  // Métodos de dominio
  isUsed(): boolean {
    return this.usedBy !== null && this.usedAt !== null;
  }

  canBeUsed(): boolean {
    return !this.isUsed();
  }

  isExpired(expirationHours: number = 168): boolean { // 7 días por defecto
    const now = new Date();
    const expirationTime = new Date(this.createdAt);
    expirationTime.setHours(expirationTime.getHours() + expirationHours);
    
    return now > expirationTime;
  }

  markAsUsed(userId: number): void {
    if (this.isUsed()) {
      throw new Error('Invite code is already used');
    }
    
    this.usedBy = userId;
    this.usedAt = new Date();
  }
}