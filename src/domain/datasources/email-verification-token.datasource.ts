import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity'; 


export interface CreateEmailVerificationTokenDto {
  userId: number;
  token: string;
  expiresAt: Date;
}

export abstract class EmailVerificationTokenDatasource {
  abstract create(createDto: CreateEmailVerificationTokenDto): Promise<EmailVerificationTokenEntity>;
  abstract findByToken(token: string): Promise<EmailVerificationTokenEntity | null>;
  abstract findByUserId(userId: number): Promise<EmailVerificationTokenEntity[]>;
  abstract markAsUsed(token: string): Promise<EmailVerificationTokenEntity>;
  abstract deleteExpired(): Promise<number>;
  abstract deleteByUserId(userId: number): Promise<number>;
}