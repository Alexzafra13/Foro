import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';
import { PasswordResetTokenRepository, CreatePasswordResetTokenDto } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetTokenDatasource } from '../datasources/prisma-password-reset-token.datasource';

export class PasswordResetTokenRepositoryImpl implements PasswordResetTokenRepository {
  constructor(private readonly datasource: PasswordResetTokenDatasource) {}

  async create(createDto: CreatePasswordResetTokenDto): Promise<PasswordResetTokenEntity> {
    return await this.datasource.create(createDto);
  }

  async findByToken(token: string): Promise<PasswordResetTokenEntity | null> {
    return await this.datasource.findByToken(token);
  }

  async findByUserId(userId: number): Promise<PasswordResetTokenEntity[]> {
    return await this.datasource.findByUserId(userId);
  }

  async markAsUsed(token: string): Promise<PasswordResetTokenEntity> {
    return await this.datasource.markAsUsed(token);
  }

  async deleteExpired(): Promise<number> {
    return await this.datasource.deleteExpired();
  }

  async deleteByUserId(userId: number): Promise<number> {
    return await this.datasource.deleteByUserId(userId);
  }
}