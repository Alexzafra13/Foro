// src/domain/use-cases/user/update-user-settings.use-case.ts - CON NUEVOS CAMPOS
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
  // Nuevos campos
  showStats?: boolean;
  showJoinDate?: boolean;
  restrictToModerators?: boolean;
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
  // Nuevos campos en respuesta
  showStats: boolean;
  showJoinDate: boolean;
  restrictToModerators: boolean;
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
        showLastSeen: true,
        // Valores por defecto para nuevos campos
        showStats: true,
        showJoinDate: true,
        restrictToModerators: false
      });
    }

    // 3. Validar y preparar actualizaciones
    const updateData: any = {};
    const changes: string[] = [];

    // Validar y actualizar cada campo (lógica existente)
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

    // Configuraciones booleanas (incluyendo las nuevas)
    const booleanSettings: (keyof typeof settingsData)[] = [
      'emailNotifications', 'postNotifications', 'commentNotifications',
      'privateProfile', 'showEmail', 'showLastSeen',
      // Nuevas configuraciones
      'showStats', 'showJoinDate', 'restrictToModerators'
    ];

    booleanSettings.forEach(setting => {
      if (settingsData[setting] !== undefined) {
        this.validateBooleanSetting(setting, settingsData[setting]);
        if (settingsData[setting] !== (currentSettings as any)[setting]) {
          updateData[setting] = settingsData[setting];
          changes.push(setting);
        }
      }
    });

    // 4. Validaciones especiales para configuraciones de privacidad
    this.validatePrivacySettings(updateData, currentSettings);

    // 5. Si no hay cambios, retornar configuraciones actuales
    if (changes.length === 0) {
      return this.formatSettingsResponse(currentSettings, changes);
    }

    // 6. Actualizar configuraciones
    const updatedSettings = await this.userSettingsRepository.updateByUserId(userId, updateData);

    // 7. Registrar actividad
    try {
      const activityLog = ActivityLogEntity.createSettingsUpdatedLog(userId, changes, ipAddress);
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging settings update:', error);
    }

    // 8. Retornar configuraciones actualizadas
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
    if (!timezone || timezone.length < 3 || timezone.length > 50) {
      throw ValidationErrors.invalidFormat('Timezone', 'valid timezone identifier');
    }

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

  private validateBooleanSetting(settingName: string, value: any): void {
    if (typeof value !== 'boolean') {
      throw ValidationErrors.invalidFormat(settingName, 'boolean value');
    }
  }

  // Nueva validación para configuraciones de privacidad
  private validatePrivacySettings(updateData: any, currentSettings: any): void {
    // Si restrictToModerators se activa, verificar coherencia
    if (updateData.restrictToModerators === true) {
      // Advertir que es el nivel más restrictivo
      console.log(`User ${currentSettings.userId} enabling most restrictive privacy level`);
    }

    // Si se desactiva privateProfile pero restrictToModerators sigue activo
    if (updateData.privateProfile === false && 
        (updateData.restrictToModerators === true || currentSettings.restrictToModerators === true)) {
      console.log(`Privacy settings inconsistency detected for user ${currentSettings.userId}`);
    }

    // Validar que no se contradigan las configuraciones
    if (updateData.showStats === false && updateData.showJoinDate === false && 
        updateData.showEmail === false && updateData.showLastSeen === false) {
      console.log(`User ${currentSettings.userId} hiding all profile information`);
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
      // Nuevos campos en respuesta
      showStats: settings.showStats,
      showJoinDate: settings.showJoinDate,
      restrictToModerators: settings.restrictToModerators,
      updatedAt: settings.updatedAt || new Date(),
      changes
    };
  }
}

// También actualizar el GetUserSettings para incluir los nuevos campos
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
  // Nuevos campos
  showStats: boolean;
  showJoinDate: boolean;
  restrictToModerators: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserSettings {
  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: { userId: number }): Promise<GetUserSettingsResponseDto> {
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
        showLastSeen: true,
        // Nuevos valores por defecto
        showStats: true,
        showJoinDate: true,
        restrictToModerators: false
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
      // Nuevos campos
      showStats: settings.showStats,
      showJoinDate: settings.showJoinDate,
      restrictToModerators: settings.restrictToModerators,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }
}