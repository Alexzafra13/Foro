// src/domain/use-cases/settings/update-user-settings.use-case.ts
import { UserSettingsRepository } from '../../repositories/user-settings.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { ActivityLogEntity } from '../../entities/activity-log.entity';

export interface UpdateUserSettingsRequestDto {
  userId: number; // Del JWT
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  postNotifications?: boolean;
  commentNotifications?: boolean;
  privateProfile?: boolean;
  showEmail?: boolean;
  showLastSeen?: boolean;
  ipAddress?: string;
}

export interface UpdateUserSettingsResponseDto {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  privateProfile: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
  updatedAt: Date;
  changes: string[];
}

interface UpdateUserSettingsUseCase {
  execute(dto: UpdateUserSettingsRequestDto): Promise<UpdateUserSettingsResponseDto>;
}

export class UpdateUserSettings implements UpdateUserSettingsUseCase {
  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(dto: UpdateUserSettingsRequestDto): Promise<UpdateUserSettingsResponseDto> {
    const { userId, ipAddress, ...settingsData } = dto;

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Obtener configuraciones actuales o crear por defecto
    let currentSettings = await this.userSettingsRepository.findByUserId(userId);
    
    if (!currentSettings) {
      // Crear configuraciones por defecto
      currentSettings = await this.userSettingsRepository.create({
        userId,
        theme: 'system',
        language: 'es',
        timezone: 'UTC',
        emailNotifications: true,
        postNotifications: true,
        commentNotifications: true,
        privateProfile: false,
        showEmail: false,
        showLastSeen: true
      });
    }

    // 3. Validar y preparar actualizaciones
    const updateData: any = {};
    const changes: string[] = [];

    // Validar y actualizar cada campo
    if (settingsData.theme !== undefined) {
      this.validateTheme(settingsData.theme);
      if (settingsData.theme !== currentSettings.theme) {
        updateData.theme = settingsData.theme;
        changes.push('theme');
      }
    }

    if (settingsData.language !== undefined) {
      this.validateLanguage(settingsData.language);
      if (settingsData.language !== currentSettings.language) {
        updateData.language = settingsData.language;
        changes.push('language');
      }
    }

    if (settingsData.timezone !== undefined) {
      this.validateTimezone(settingsData.timezone);
      if (settingsData.timezone !== currentSettings.timezone) {
        updateData.timezone = settingsData.timezone;
        changes.push('timezone');
      }
    }

    // Configuraciones booleanas
    const booleanSettings: (keyof typeof settingsData)[] = [
      'emailNotifications', 'postNotifications', 'commentNotifications',
      'privateProfile', 'showEmail', 'showLastSeen'
    ];

    booleanSettings.forEach(setting => {
      if (settingsData[setting] !== undefined) {
        if (settingsData[setting] !== (currentSettings as any)[setting]) {
          updateData[setting] = settingsData[setting];
          changes.push(setting);
        }
      }
    });

    // 4. Si no hay cambios, retornar configuraciones actuales
    if (changes.length === 0) {
      return this.formatSettingsResponse(currentSettings, changes);
    }

    // 5. Actualizar configuraciones
    const updatedSettings = await this.userSettingsRepository.updateByUserId(userId, updateData);

    // 6. Registrar actividad
    try {
      const activityLog = ActivityLogEntity.createSettingsUpdatedLog(userId, changes, ipAddress);
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging settings update:', error);
    }

    // 7. Retornar configuraciones actualizadas
    return this.formatSettingsResponse(updatedSettings, changes);
  }

  private validateTheme(theme: string): void {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(theme)) {
      throw ValidationErrors.invalidFormat('Theme', 'light, dark, or system');
    }
  }

  private validateLanguage(language: string): void {
    const validLanguages = ['es', 'en', 'fr'];
    if (!validLanguages.includes(language)) {
      throw ValidationErrors.invalidFormat('Language', 'es, en, or fr');
    }
  }

  private validateTimezone(timezone: string): void {
    // Validación básica de timezone
    if (!timezone || timezone.length < 3 || timezone.length > 50) {
      throw ValidationErrors.invalidFormat('Timezone', 'valid timezone identifier');
    }

    // Lista de timezones comunes válidos
    const commonTimezones = [
      'UTC', 'Europe/Madrid', 'America/New_York', 'America/Los_Angeles',
      'America/Mexico_City', 'America/Argentina/Buenos_Aires', 'America/Sao_Paulo',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
      'Asia/Shanghai', 'Australia/Sydney'
    ];

    if (!commonTimezones.includes(timezone)) {
      throw ValidationErrors.invalidFormat('Timezone', 'supported timezone');
    }
  }

  private formatSettingsResponse(settings: any, changes: string[]): UpdateUserSettingsResponseDto {
    return {
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone,
      emailNotifications: settings.emailNotifications,
      postNotifications: settings.postNotifications,
      commentNotifications: settings.commentNotifications,
      privateProfile: settings.privateProfile,
      showEmail: settings.showEmail,
      showLastSeen: settings.showLastSeen,
      updatedAt: settings.updatedAt || new Date(),
      changes
    };
  }
}

// ========================================
// GET USER SETTINGS USE CASE
// ========================================

export interface GetUserSettingsRequestDto {
  userId: number; // Del JWT
}

export interface GetUserSettingsResponseDto {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  privateProfile: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GetUserSettingsUseCase {
  execute(dto: GetUserSettingsRequestDto): Promise<GetUserSettingsResponseDto>;
}

export class GetUserSettings implements GetUserSettingsUseCase {
  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetUserSettingsRequestDto): Promise<GetUserSettingsResponseDto> {
    const { userId } = dto;

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Obtener configuraciones del usuario
    let settings = await this.userSettingsRepository.findByUserId(userId);

    // 3. Si no tiene configuraciones, crear por defecto
    if (!settings) {
      settings = await this.userSettingsRepository.create({
        userId,
        theme: 'system',
        language: 'es',
        timezone: 'UTC',
        emailNotifications: true,
        postNotifications: true,
        commentNotifications: true,
        privateProfile: false,
        showEmail: false,
        showLastSeen: true
      });
    }

    // 4. Retornar configuraciones
    return {
      theme: settings.theme as 'light' | 'dark' | 'system',
      language: settings.language,
      timezone: settings.timezone,
      emailNotifications: settings.emailNotifications,
      postNotifications: settings.postNotifications,
      commentNotifications: settings.commentNotifications,
      privateProfile: settings.privateProfile,
      showEmail: settings.showEmail,
      showLastSeen: settings.showLastSeen,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }
}