// src/domain/repositories/user-settings.repository.ts - CORREGIDO SIN DUPLICACIÓN
import { UserSettingsEntity } from '../entities/user-settings.entity';

// Interface movida desde datasource para evitar duplicación
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
  // Nuevos campos
  showStats: boolean;
  showJoinDate: boolean;
  restrictToModerators: boolean;
}

export abstract class UserSettingsRepository {
  abstract create(createDto: CreateUserSettingsDto): Promise<UserSettingsEntity>;
  abstract findByUserId(userId: number): Promise<UserSettingsEntity | null>;
  abstract updateByUserId(userId: number, updateData: Partial<UserSettingsEntity>): Promise<UserSettingsEntity>;
  abstract deleteByUserId(userId: number): Promise<UserSettingsEntity>;
}