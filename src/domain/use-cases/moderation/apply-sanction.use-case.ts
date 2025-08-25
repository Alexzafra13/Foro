import { UserRepository } from '../../repositories/user.repository';
import { SanctionRepository } from '../../repositories/sanction.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { SanctionType, SanctionSeverity } from '../../entities/sanction.entity';
import { UserErrors } from '../../../shared/errors';

export interface ApplySanctionRequestDto {
  targetUserId: number;
  moderatorId: number;
  sanctionType: SanctionType;
  reason: string;
  durationHours?: number;
  severity?: SanctionSeverity;
  evidence?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApplySanctionResponseDto {
  sanctionId: number;
  userId: number;
  username: string;
  sanctionType: SanctionType;
  reason: string;
  severity: SanctionSeverity;
  duration: string;
  expiresAt: Date | null;
  appliedBy: {
    id: number;
    username: string;
    role: string;
  };
  message: string;
}

export class ApplySanction {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sanctionRepository: SanctionRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly notificationRepository?: NotificationRepository
  ) {}

  async execute(dto: ApplySanctionRequestDto): Promise<ApplySanctionResponseDto> {
    const { targetUserId, moderatorId, sanctionType, reason, durationHours, severity, evidence, ipAddress, userAgent } = dto;

    // 1. Verificar que el moderador existe y tiene permisos
    const moderator = await this.userRepository.findById(moderatorId);
    if (!moderator) {
      throw UserErrors.userNotFound(moderatorId);
    }

    if (!['admin', 'moderator'].includes(moderator.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Obtener usuario objetivo
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw UserErrors.userNotFound(targetUserId);
    }

    // 3. PROTECCIÓN: Los admins son intocables frente a moderadores
    if (targetUser.role!.name === 'admin') {
      throw new Error('Administrators cannot be sanctioned');
    }

    // 4. Solo admins pueden sancionar a otros moderadores
    if (targetUser.role!.name === 'moderator' && moderator.role!.name !== 'admin') {
      throw new Error('Only administrators can sanction moderators');
    }

    // 5. Crear la sanción
    const sanction = await this.sanctionRepository.create({
      userId: targetUserId,
      moderatorId,
      sanctionType,
      reason,
      durationHours,
      severity: severity || this.getDefaultSeverity(sanctionType),
      evidence,
      isAutomatic: false
    });

    // 6. Aplicar efectos de la sanción al usuario
    await this.applyUserEffects(targetUser, sanction);

    // 7. Registrar actividad
    await this.activityLogRepository.create({
      userId: moderatorId,
      action: 'sanction_applied',
      details: {
        targetUserId,
        targetUsername: targetUser.username,
        sanctionType,
        reason,
        severity: sanction.severity,
        duration: sanction.getFormattedDuration()
      },
      ipAddress,
      userAgent
    });

    // 8. Notificar al usuario sancionado
    if (this.notificationRepository && sanctionType !== 'warning') {
      await this.notificationRepository.create({
        userId: targetUserId,
        type: 'moderation',
        content: this.getNotificationContent(sanctionType, reason, sanction.expiresAt),
        relatedData: {
          sanctionId: sanction.id,
          sanctionType,
          reason
        }
      }).catch(err => console.error('Failed to notify user:', err));
    }

    return {
      sanctionId: sanction.id,
      userId: targetUser.id,
      username: targetUser.username,
      sanctionType,
      reason,
      severity: sanction.severity,
      duration: sanction.getFormattedDuration(),
      expiresAt: sanction.expiresAt,
      appliedBy: {
        id: moderator.id,
        username: moderator.username,
        role: moderator.role!.name
      },
      message: `${this.getSanctionDisplayName(sanctionType)} applied successfully`
    };
  }

  private async applyUserEffects(user: any, sanction: any): Promise<void> {
    const updates: any = {};

    switch (sanction.sanctionType) {
      case 'warning':
        updates.warningsCount = (user.warningsCount || 0) + 1;
        updates.lastWarningAt = new Date();
        break;
      case 'silence':
        updates.isSilenced = true;
        updates.silencedUntil = sanction.expiresAt;
        break;
      case 'temp_suspend':
      case 'permanent_ban':
        updates.isBanned = true;
        updates.bannedAt = sanction.startsAt;
        updates.bannedBy = sanction.moderatorId;
        updates.banReason = sanction.reason;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepository.updateById(user.id, updates);
    }
  }

  private getDefaultSeverity(sanctionType: SanctionType): SanctionSeverity {
    switch (sanctionType) {
      case 'warning': return 'low';
      case 'silence': return 'medium';
      case 'restriction': return 'medium';
      case 'temp_suspend': return 'high';
      case 'permanent_ban': return 'critical';
      case 'ip_ban': return 'critical';
      default: return 'medium';
    }
  }

  private getSanctionDisplayName(sanctionType: SanctionType): string {
    switch (sanctionType) {
      case 'warning': return 'Warning';
      case 'silence': return 'Silence';
      case 'restriction': return 'Restriction';
      case 'temp_suspend': return 'Temporary suspension';
      case 'permanent_ban': return 'Permanent ban';
      case 'ip_ban': return 'IP ban';
      default: return 'Sanction';
    }
  }

  private getNotificationContent(sanctionType: SanctionType, reason: string, expiresAt: Date | null): string {
    const duration = expiresAt ? ` until ${expiresAt.toLocaleDateString()}` : '';
    return `You have received a ${this.getSanctionDisplayName(sanctionType).toLowerCase()}${duration}. Reason: ${reason}`;
  }
}