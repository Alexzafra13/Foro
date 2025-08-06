import crypto from 'crypto';


export class EmailVerificationTokenEntity {
  constructor(
    public id: number,
    public userId: number,
    public token: string,
    public expiresAt: Date,
    public createdAt: Date,
    public usedAt: Date | null,
    public user?: {
      id: number;
      email: string;
      username: string;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): EmailVerificationTokenEntity {
    const {
      id, userId, token, expiresAt, createdAt, usedAt, user
    } = object;

    if (!id) throw new Error('EmailVerificationToken id is required');
    if (!userId) throw new Error('EmailVerificationToken userId is required');
    if (!token) throw new Error('EmailVerificationToken token is required');
    if (!expiresAt) throw new Error('EmailVerificationToken expiresAt is required');

    return new EmailVerificationTokenEntity(
      id, userId, token, expiresAt, createdAt, usedAt, user
    );
  }

  // Métodos de dominio
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }

  canBeUsed(): boolean {
    return !this.isUsed() && !this.isExpired();
  }

  markAsUsed(): void {
    if (this.isUsed()) {
      throw new Error('Verification token is already used');
    }
    
    if (this.isExpired()) {
      throw new Error('Verification token has expired');
    }
    
    this.usedAt = new Date();
  }

  // Métodos estáticos para generar tokens
  static generateToken(): string {
    // Genera un token único de 64 caracteres (32 bytes en hex)
    return crypto.randomBytes(32).toString('hex');
  }

  static calculateExpirationDate(hoursFromNow: number = 24): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hoursFromNow);
    return expiration;
  }
}