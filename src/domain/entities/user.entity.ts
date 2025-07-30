
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
    public banReason?: string | null
  ) {}

  static fromObject(object: { [key: string]: any }): UserEntity {
    const { 
      id, username, email, passwordHash, reputation, 
      roleId, createdAt, role, avatarUrl, bio,
      isEmailVerified, emailVerifiedAt, updatedAt,
      lastLoginAt, isBanned, bannedAt, bannedBy, banReason
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
      banReason || null
    );
  }

  // ===== MÉTODOS DE DOMINIO EXISTENTES =====

  isVerified(): boolean {
    return this.isEmailVerified === true;
  }

  canCreateContent(): boolean {
    return this.isVerified() && !this.isBannedUser();
  }

  markAsVerified(): void {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }

  needsEmailVerification(): boolean {
    return !this.isEmailVerified;
  }

  // ===== NUEVOS MÉTODOS DE ADMINISTRACIÓN =====

  isBannedUser(): boolean {
    return this.isBanned === true;
  }

  canPerformActions(): boolean {
    return !this.isBannedUser();
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

  banUser(bannedBy: number, reason: string): void {
    this.isBanned = true;
    this.bannedAt = new Date();
    this.bannedBy = bannedBy;
    this.banReason = reason;
  }

  unbanUser(): void {
    this.isBanned = false;
    this.bannedAt = null;
    this.bannedBy = null;
    this.banReason = null;
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  getBanInfo(): { isBanned: boolean; bannedAt: Date | null; reason: string | null } {
    return {
      isBanned: this.isBanned || false,
      bannedAt: this.bannedAt || null,
      reason: this.banReason || null
    };
  }

  // ===== MÉTODOS DE ROLES Y PERMISOS =====

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

  // ===== MÉTODOS DE INFORMACIÓN =====

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
      lastLoginAt: this.lastLoginAt || null
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
      banInfo: this.getBanInfo()
    };
  }

  // ===== MÉTODOS DE VALIDACIÓN =====

  canAccessPrivateChannel(channelId: number): boolean {
    // Por ahora simple, se puede expandir con lógica de membresía
    return !this.isBannedUser() && this.isVerified();
  }

  canVoteOnContent(): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  canPostComments(): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  canReportContent(): boolean {
    return !this.isBannedUser() && this.isVerified();
  }

  // ===== MÉTODOS DE ESTADÍSTICAS =====

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

  isActiveUser(): boolean {
    const daysSinceLastLogin = this.getDaysSinceLastLogin();
    return daysSinceLastLogin === null || daysSinceLastLogin <= 30; // Activo si entró en últimos 30 días
  }
}