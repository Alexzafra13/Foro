// src/infrastructure/repositories/user-settings.repository.impl.ts - ACTUALIZADO
import { UserSettingsEntity, CreateUserSettingsData } from '../../domain/entities/user-settings.entity';
import { UserSettingsRepository } from '../../domain/repositories/user-settings.repository';
import { UserSettingsDatasource, CreateUserSettingsDto } from '../datasources/prisma-user-settings.datasource';

export class UserSettingsRepositoryImpl implements UserSettingsRepository {
  constructor(private readonly datasource: UserSettingsDatasource) {}

  async create(createDto: CreateUserSettingsData): Promise<UserSettingsEntity> {
    // Mapear CreateUserSettingsData a CreateUserSettingsDto
    const datasourceDto: CreateUserSettingsDto = {
      userId: createDto.userId,
      theme: createDto.theme,
      language: createDto.language,
      timezone: createDto.timezone,
      emailNotifications: createDto.emailNotifications,
      postNotifications: createDto.postNotifications,
      commentNotifications: createDto.commentNotifications,
      privateProfile: createDto.privateProfile,
      showEmail: createDto.showEmail,
      showLastSeen: createDto.showLastSeen,
      // Nuevos campos
      showStats: createDto.showStats,
      showJoinDate: createDto.showJoinDate,
      restrictToModerators: createDto.restrictToModerators
    };

    return await this.datasource.create(datasourceDto);
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