export type SanctionType = 
  | 'warning' 
  | 'temp_suspend' 
  | 'permanent_ban' 
  | 'silence' 
  | 'restriction'
  | 'ip_ban';

export type SanctionSeverity = 'low' | 'medium' | 'high' | 'critical';

export class SanctionEntity {
  constructor(
    public id: number,
    public userId: number,
    public moderatorId: number,
    public sanctionType: SanctionType,
    public reason: string,
    public durationHours: number | null,
    public startsAt: Date,
    public expiresAt: Date | null,
    public isActive: boolean,
    public severity: SanctionSeverity,
    public isAutomatic: boolean,
    public evidence: any | null,
    public createdAt: Date,
    public updatedAt: Date,
    public revokedAt: Date | null = null,
    public revokedBy: number | null = null,
    public revokeReason: string | null = null,
    
    // Relaciones opcionales
    public user?: any,
    public moderator?: any,
    public revoker?: any
  ) {}

  static fromObject(obj: any): SanctionEntity {
    return new SanctionEntity(
      obj.id,
      obj.userId,
      obj.moderatorId,
      obj.sanctionType,
      obj.reason,
      obj.durationHours,
      obj.startsAt,
      obj.expiresAt,
      obj.isActive,
      obj.severity || 'medium',
      obj.isAutomatic || false,
      obj.evidence,
      obj.createdAt,
      obj.updatedAt,
      obj.revokedAt,
      obj.revokedBy,
      obj.revokeReason,
      obj.user,
      obj.moderator,
      obj.revoker
    );
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isTemporary(): boolean {
    return this.expiresAt !== null;
  }

  isPermanent(): boolean {
    return this.expiresAt === null && this.sanctionType !== 'warning';
  }

  canBeRevokedBy(userRole: string): boolean {
    return userRole === 'admin';
  }

  getRemainingTime(): { days: number; hours: number; minutes: number } | null {
    if (!this.expiresAt || this.isExpired()) return null;
    
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  }

  getFormattedDuration(): string {
    if (this.isPermanent()) return 'Permanente';
    if (!this.durationHours) return 'No especificado';
    
    if (this.durationHours < 24) {
      return `${this.durationHours} hora${this.durationHours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(this.durationHours / 24);
      return `${days} día${days > 1 ? 's' : ''}`;
    }
  }
}