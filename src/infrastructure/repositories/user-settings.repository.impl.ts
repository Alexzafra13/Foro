// src/infrastructure/repositories/user-settings.repository.impl.ts - SIGUIENDO PATRÓN ORIGINAL
import { UserSettingsEntity } from '../../domain/entities/user-settings.entity';
import { UserSettingsRepository, CreateUserSettingsDto } from '../../domain/repositories/user-settings.repository';
import { UserSettingsDatasource } from '../../domain/datasources/user-settings.datasource';

export class UserSettingsRepositoryImpl implements UserSettingsRepository {
  constructor(private readonly datasource: UserSettingsDatasource) {}

  async create(createDto: CreateUserSettingsDto): Promise<UserSettingsEntity> {
    // Pasamos directamente el DTO, ya que ambas interfaces son idénticas
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