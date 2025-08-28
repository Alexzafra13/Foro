// src/domain/entities/user-settings.entity.ts - CON NUEVOS CAMPOS DE PRIVACIDAD

export interface CreateUserSettingsData {
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

export class UserSettingsEntity {
  constructor(
    public id: number,
    public userId: number,
    public theme: 'light' | 'dark' | 'system',
    public language: string,
    public timezone: string,
    public emailNotifications: boolean,
    public postNotifications: boolean,
    public commentNotifications: boolean,
    public privateProfile: boolean,
    public showEmail: boolean,
    public showLastSeen: boolean,
    // Nuevos campos
    public showStats: boolean,
    public showJoinDate: boolean,
    public restrictToModerators: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public user?: {
      id: number;
      username: string;
      email: string;
    }
  ) {}

  static fromObject(object: { [key: string]: any }): UserSettingsEntity {
    const {
      id, userId, theme, language, timezone,
      emailNotifications, postNotifications, commentNotifications,
      privateProfile, showEmail, showLastSeen,
      showStats, showJoinDate, restrictToModerators,
      createdAt, updatedAt, user
    } = object;

    if (!id) throw new Error('UserSettings id is required');
    if (!userId) throw new Error('UserSettings userId is required');

    return new UserSettingsEntity(
      id, userId, theme || 'system', language || 'es', timezone || 'UTC',
      emailNotifications ?? true, postNotifications ?? true, commentNotifications ?? true,
      privateProfile ?? false, showEmail ?? false, showLastSeen ?? true,
      // Valores por defecto para nuevos campos
      showStats ?? true, showJoinDate ?? true, restrictToModerators ?? false,
      createdAt, updatedAt, user
    );
  }

  // Métodos de dominio existentes
  isPrivate(): boolean {
    return this.privateProfile;
  }

  canReceiveEmailNotifications(): boolean {
    return this.emailNotifications;
  }

  canReceivePostNotifications(): boolean {
    return this.postNotifications;
  }

  canReceiveCommentNotifications(): boolean {
    return this.commentNotifications;
  }

  shouldShowEmail(): boolean {
    return this.showEmail;
  }

  shouldShowLastSeen(): boolean {
    return this.showLastSeen;
  }

  // Nuevos métodos de dominio para privacidad
  shouldShowStats(): boolean {
    return this.showStats;
  }

  shouldShowJoinDate(): boolean {
    return this.showJoinDate;
  }

  isRestrictedToModerators(): boolean {
    return this.restrictToModerators;
  }

  // Método para determinar el nivel de acceso requerido
  getRequiredAccessLevel(): 'public' | 'registered' | 'moderator' {
    if (this.restrictToModerators) return 'moderator';
    if (this.privateProfile) return 'registered';
    return 'public';
  }

  updateTheme(newTheme: 'light' | 'dark' | 'system'): void {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(newTheme)) {
      throw new Error('Invalid theme');
    }
    this.theme = newTheme;
    this.updatedAt = new Date();
  }

  updateLanguage(newLanguage: string): void {
    const validLanguages = ['es', 'en', 'fr'];
    if (!validLanguages.includes(newLanguage)) {
      throw new Error('Invalid language');
    }
    this.language = newLanguage;
    this.updatedAt = new Date();
  }

  updateNotificationSettings(settings: {
    emailNotifications?: boolean;
    postNotifications?: boolean;
    commentNotifications?: boolean;
  }): void {
    if (settings.emailNotifications !== undefined) {
      this.emailNotifications = settings.emailNotifications;
    }
    if (settings.postNotifications !== undefined) {
      this.postNotifications = settings.postNotifications;
    }
    if (settings.commentNotifications !== undefined) {
      this.commentNotifications = settings.commentNotifications;
    }
    this.updatedAt = new Date();
  }

  updatePrivacySettings(settings: {
    privateProfile?: boolean;
    showEmail?: boolean;
    showLastSeen?: boolean;
    showStats?: boolean;
    showJoinDate?: boolean;
    restrictToModerators?: boolean;
  }): void {
    if (settings.privateProfile !== undefined) {
      this.privateProfile = settings.privateProfile;
    }
    if (settings.showEmail !== undefined) {
      this.showEmail = settings.showEmail;
    }
    if (settings.showLastSeen !== undefined) {
      this.showLastSeen = settings.showLastSeen;
    }
    if (settings.showStats !== undefined) {
      this.showStats = settings.showStats;
    }
    if (settings.showJoinDate !== undefined) {
      this.showJoinDate = settings.showJoinDate;
    }
    if (settings.restrictToModerators !== undefined) {
      this.restrictToModerators = settings.restrictToModerators;
    }
    this.updatedAt = new Date();
  }

  // Configuraciones por defecto para nuevos usuarios
  static createDefault(userId: number): CreateUserSettingsData {
    return {
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
    };
  }
}