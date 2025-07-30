export class PasswordResetTokenEntity {
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

  static fromObject(object: { [key: string]: any }): PasswordResetTokenEntity {
    const {
      id, userId, token, expiresAt, createdAt, usedAt, user
    } = object;

    if (!id) throw new Error('PasswordResetToken id is required');
    if (!userId) throw new Error('PasswordResetToken userId is required');
    if (!token) throw new Error('PasswordResetToken token is required');
    if (!expiresAt) throw new Error('PasswordResetToken expiresAt is required');

    return new PasswordResetTokenEntity(
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
      throw new Error('Password reset token is already used');
    }
    
    if (this.isExpired()) {
      throw new Error('Password reset token has expired');
    }
    
    this.usedAt = new Date();
  }

  // Métodos estáticos para generar tokens
  static generateToken(): string {
    // Genera un token único de 64 caracteres (32 bytes en hex)
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  static calculateExpirationDate(hoursFromNow: number = 1): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hoursFromNow);
    return expiration;
  }
}