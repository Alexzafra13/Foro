import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

export interface CreatePasswordResetTokenDto {
  userId: number;
  token: string;
  expiresAt: Date;
}

export abstract class PasswordResetTokenRepository {
  abstract create(createDto: CreatePasswordResetTokenDto): Promise<PasswordResetTokenEntity>;
  abstract findByToken(token: string): Promise<PasswordResetTokenEntity | null>;
  abstract findByUserId(userId: number): Promise<PasswordResetTokenEntity[]>;
  abstract markAsUsed(token: string): Promise<PasswordResetTokenEntity>;
  abstract deleteExpired(): Promise<number>; // Cleanup expired tokens
  abstract deleteByUserId(userId: number): Promise<number>; // Cleanup user tokens
}