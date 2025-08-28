// src/domain/datasources/user-settings.datasource.ts
import { UserSettingsEntity } from '../entities/user-settings.entity';

// Definimos la misma interfaz que en repository (patrón consistente)
export interface CreateUserSettingsDto {
  userId: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  privateProfile: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
  // Nuevos campos agregados
  showStats: boolean;
  showJoinDate: boolean;
  restrictToModerators: boolean;
}

export abstract class UserSettingsDatasource {
  abstract create(createDto: CreateUserSettingsDto): Promise<UserSettingsEntity>;
  abstract findByUserId(userId: number): Promise<UserSettingsEntity | null>;
  abstract updateByUserId(userId: number, updateData: any): Promise<UserSettingsEntity>;
  abstract deleteByUserId(userId: number): Promise<UserSettingsEntity>;
}