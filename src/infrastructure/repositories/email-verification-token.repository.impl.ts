import { EmailVerificationTokenEntity } from '@/domain/entities/email-verification-token.entity'; 
import { EmailVerificationTokenRepository, CreateEmailVerificationTokenDto } from '../../domain/repositories/email-verification-token.repository';
import { EmailVerificationTokenDatasource } from '@/domain/datasources/email-verification-token.datasource';

export class EmailVerificationTokenRepositoryImpl implements EmailVerificationTokenRepository {
  constructor(private readonly datasource: EmailVerificationTokenDatasource) {}

  async create(createDto: CreateEmailVerificationTokenDto): Promise<EmailVerificationTokenEntity> {
    return await this.datasource.create(createDto);
  }

  async findByToken(token: string): Promise<EmailVerificationTokenEntity | null> {
    return await this.datasource.findByToken(token);
  }

  async findByUserId(userId: number): Promise<EmailVerificationTokenEntity[]> {
    return await this.datasource.findByUserId(userId);
  }

  async markAsUsed(token: string): Promise<EmailVerificationTokenEntity> {
    return await this.datasource.markAsUsed(token);
  }

  async deleteExpired(): Promise<number> {
    return await this.datasource.deleteExpired();
  }

  async deleteByUserId(userId: number): Promise<number> {
    return await this.datasource.deleteByUserId(userId);
  }
}