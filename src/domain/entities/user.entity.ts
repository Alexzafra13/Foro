// src/domain/entities/user.entity.ts - SOLO LÓGICA DE DOMINIO

export class UserEntity {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public passwordHash: string,
    public reputation: number,
    public roleId: number,
    public createdAt: Date,
    public role?: { id: number; name: string },
    public avatarUrl?: string | null,
    public bio?: string | null,
    public isEmailVerified?: boolean,
    public emailVerifiedAt?: Date | null,
    public updatedAt?: Date | null,
    public lastLoginAt?: Date | null,
    public isBanned?: boolean,
    public bannedAt?: Date | null,
    public bannedBy?: number | null,
    public banReason?: string | null,
    public bannedByUser?: {
      id: number;
      username: string;
    } | null,
    // ✅ NUEVOS CAMPOS PARA MODERACIÓN AVANZADA
    public isSilenced?: boolean,
    public silencedUntil?: Date | null,
    public warningsCount?: number,
    public lastWarningAt?: Date | null
  ) {}

  static fromObject(object: { [key: string]: any }): UserEntity {
    const { 
      id, username, email, passwordHash, reputation, 
      roleId, createdAt, role, avatarUrl, bio,
      isEmailVerified, emailVerifiedAt, updatedAt,
      lastLoginAt, isBanned, bannedAt, bannedBy, banReason, bannedByUser,
      isSilenced, silencedUntil, warningsCount, lastWarningAt
    } = object;
    
    if (!id) throw new Error('User id is required');
    if (!username) throw new Error('User username is required');
    if (!email) throw new Error('User email is required');
    if (!passwordHash) throw new Error('User passwordHash is required');
    
    return new UserEntity(
      id, username, email, passwordHash, 
      reputation || 0, roleId, createdAt, 
      role, avatarUrl, bio,
      isEmailVerified || false,
      emailVerifiedAt || null,
      updatedAt || null,
      lastLoginAt || null,
      isBanned || false,
      bannedAt || null,
      bannedBy || null,
      banReason || null,
      bannedByUser || null,
      isSilenced || false,
      silencedUntil || null,
      warningsCount || 0,
      lastWarningAt || null
    );
  }

  // ===== MÉTODOS DE VALIDACIÓN DE DOMINIO =====

  isVerified(): boolean {
    return this.isEmailVerified === true;
  }

  needsEmailVerification(): boolean {
    return !this.isEmailVerified;
  }

  markAsVerified(): void {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }

  // ===== VERIFICACIÓN DE ESTADO =====

  isBannedUser(): boolean {
    return this.isBanned === true;
  }

  isSilencedCurrently(): boolean {
    if (!this.isSilenced) return false;
    if (!this.silencedUntil) return true; // Silenciado permanentemente
    return new Date() < this.silencedUntil;
  }

  isActiveUser(): boolean {
    const daysSinceLastLogin = this.getDaysSinceLastLogin();
    return daysSinceLastLogin === null || daysSinceLastLogin <= 30;
  }

  // ===== VERIFICACIÓN DE PERMISOS =====

  canPerformAction(action: 'post' | 'comment' | 'vote'): { allowed: boolean; reason?: string } {
    // Usuarios baneados no pueden hacer nada
    if (this.isBannedUser()) {
      return { allowed: false, reason: 'Usuario suspendido' };
    }

    // Usuarios silenciados no pueden postear ni comentar
    if (this.isSilencedCurrently() && (action === 'post' || action === 'comment')) {
      const until = this.silencedUntil ? ` hasta ${this.silencedUntil.toLocaleDateString()}` : '';
      return { allowed: false, reason: `Usuario silenciado${until}` };
    }

    // Verificar si el usuario está verificado para acciones de contenido
    if (!this.isVerified() && (action === 'post' || action === 'comment')) {
      return { allowed: false, reason: 'Email no verificado' };
    }

    return { allowed: true };
  }

  canLogin(): boolean {
    return !this.isBannedUser();
  }

  canChangePassword(): boolean {
    return !this.isBannedUser();
  }

  canUpdateProfile(): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  canCreateContent(): boolean {
    return this.isVerified() && !this.isBannedUser() && !this.isSilencedCurrently();
  }

  canPerformActions(): boolean {
    return !this.isBannedUser();
  }

  canVoteOnContent(): boolean {
    const actionCheck = this.canPerformAction('vote');
    return actionCheck.allowed && this.isVerified();
  }

  canPostComments(): boolean {
    const actionCheck = this.canPerformAction('comment');
    return actionCheck.allowed;
  }

  canReportContent(): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  canAccessPrivateChannel(channelId: number): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  // ===== VERIFICACIÓN DE MODERACIÓN =====

  canBeModeatedBy(moderatorRole: string, moderatorId: number): boolean {
    // Los usuarios no pueden moderarse a sí mismos
    if (this.id === moderatorId) return false;

    // Los admins son intocables
    if (this.role?.name === 'admin') return false;

    // Solo admins pueden moderar a otros moderadores
    if (this.role?.name === 'moderator' && moderatorRole !== 'admin') return false;

    // Admins y moderadores pueden moderar usuarios normales
    return ['admin', 'moderator'].includes(moderatorRole);
  }

  // ===== ROLES Y PERMISOS =====

  isAdmin(): boolean {
    return this.role?.name === 'admin';
  }

  isModerator(): boolean {
    return this.role?.name === 'moderator';
  }

  isRegularUser(): boolean {
    return this.role?.name === 'user';
  }

  hasModeratorPrivileges(): boolean {
    return this.isAdmin() || this.isModerator();
  }

  canBanUsers(): boolean {
    return this.hasModeratorPrivileges() && !this.isBannedUser();
  }

  canDeletePosts(): boolean {
    return this.hasModeratorPrivileges() && !this.isBannedUser();
  }

  canModerateComments(): boolean {
    return this.hasModeratorPrivileges() && !this.isBannedUser();
  }

  canCreateInvites(): boolean {
    return this.hasModeratorPrivileges() && !this.isBannedUser();
  }

  // ===== MÉTODOS DE CÁLCULO Y TRANSFORMACIÓN =====

  getModerationLevel(): 'clean' | 'warned' | 'restricted' | 'suspended' | 'banned' {
    if (this.isBannedUser()) return 'banned';
    if (this.isSilencedCurrently()) return 'restricted';
    if ((this.warningsCount || 0) >= 3) return 'suspended';
    if ((this.warningsCount || 0) > 0) return 'warned';
    return 'clean';
  }

  getActiveSanctions(): { 
    isBanned: boolean; 
    isSilenced: boolean; 
    warningsCount: number;
    banReason?: string;
    silencedUntil?: Date | null;
  } {
    return {
      isBanned: this.isBanned || false,
      isSilenced: this.isSilencedCurrently(),
      warningsCount: this.warningsCount || 0,
      banReason: this.banReason || undefined,
      silencedUntil: this.silencedUntil
    };
  }

  getBanInfo(): { isBanned: boolean; bannedAt: Date | null; reason: string | null } {
    return {
      isBanned: this.isBanned || false,
      bannedAt: this.bannedAt || null,
      reason: this.banReason || null
    };
  }

  getRemainingModerationTime(sanctionType: 'ban' | 'silence'): { 
    days: number; 
    hours: number; 
    minutes: number 
  } | null {
    let targetDate: Date | null = null;

    if (sanctionType === 'silence' && this.silencedUntil) {
      targetDate = this.silencedUntil;
    }
    
    if (!targetDate || new Date() >= targetDate) return null;

    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  }

  getModerationStats(): {
    totalWarnings: number;
    daysSinceLastWarning: number | null;
    currentSanctions: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const daysSinceLastWarning = this.lastWarningAt ? 
      Math.ceil((new Date().getTime() - this.lastWarningAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const currentSanctions: string[] = [];
    if (this.isBannedUser()) currentSanctions.push('banned');
    if (this.isSilencedCurrently()) currentSanctions.push('silenced');

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const warnings = this.warningsCount || 0;
    
    if (this.isBannedUser()) riskLevel = 'critical';
    else if (this.isSilencedCurrently() || warnings >= 3) riskLevel = 'high';
    else if (warnings >= 2) riskLevel = 'medium';

    return {
      totalWarnings: warnings,
      daysSinceLastWarning,
      currentSanctions,
      riskLevel
    };
  }

  // ===== CÁLCULOS DE TIEMPO =====

  getDaysActive(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceLastLogin(): number | null {
    if (!this.lastLoginAt) return null;
    
    const now = new Date();
    const lastLogin = new Date(this.lastLoginAt);
    const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  // ===== MÉTODOS DE INFORMACIÓN PÚBLICA =====

  getPublicProfile(): {
    id: number;
    username: string;
    reputation: number;
    role: string;
    avatarUrl: string | null;
    bio: string | null;
    isEmailVerified: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    moderationLevel: string;
  } {
    return {
      id: this.id,
      username: this.username,
      reputation: this.reputation,
      role: this.role?.name || 'user',
      avatarUrl: this.avatarUrl || null,
      bio: this.bio || null,
      isEmailVerified: this.isEmailVerified || false,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt || null,
      moderationLevel: this.getModerationLevel()
    };
  }

  getFullProfile(): {
    id: number;
    username: string;
    email: string;
    reputation: number;
    role: { id: number; name: string } | undefined;
    avatarUrl: string | null;
    bio: string | null;
    isEmailVerified: boolean;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date | null;
    lastLoginAt: Date | null;
    banInfo: { isBanned: boolean; bannedAt: Date | null; reason: string | null };
    moderationInfo: {
      level: string;
      isSilenced: boolean;
      silencedUntil: Date | null;
      warningsCount: number;
      lastWarningAt: Date | null;
    };
  } {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      reputation: this.reputation,
      role: this.role,
      avatarUrl: this.avatarUrl || null,
      bio: this.bio || null,
      isEmailVerified: this.isEmailVerified || false,
      emailVerifiedAt: this.emailVerifiedAt || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt || null,
      lastLoginAt: this.lastLoginAt || null,
      banInfo: this.getBanInfo(),
      moderationInfo: {
        level: this.getModerationLevel(),
        isSilenced: this.isSilencedCurrently(),
        silencedUntil: this.silencedUntil || null,
        warningsCount: this.warningsCount || 0,
        lastWarningAt: this.lastWarningAt || null
      }
    };
  }
}