import { UserSettingsEntity, CreateUserSettingsData } from '../../domain/entities/user-settings.entity';
import { UserSettingsRepository } from '../../domain/repositories/user-settings.repository';
import { UserSettingsDatasource } from '../datasources/prisma-user-settings.datasource';

export class UserSettingsRepositoryImpl implements UserSettingsRepository {
  constructor(private readonly datasource: UserSettingsDatasource) {}

  async create(createDto: CreateUserSettingsData): Promise<UserSettingsEntity> {
    return await this.datasource.create(createDto);
  }

  async findByUserId(userId: number): Promise<UserSettingsEntity | null> {
    return await this.datasource.findByUserId(userId);
  }

  async updateByUserId(userId: number, updateData: Partial<UserSettingsEntity>): Promise<UserSettingsEntity> {
    return await this.datasource.updateByUserId(userId, updateData);
  }

  async deleteByUserId(userId: number): Promise<UserSettingsEntity> {
    return await this.datasource.deleteByUserId(userId);
  }
}