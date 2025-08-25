import { UserRepository } from '../../repositories/user.repository';
import { SanctionRepository } from '../../repositories/sanction.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { UserErrors } from '../../../shared/errors';

export interface RevokeSanctionRequestDto {
  sanctionId: number;
  moderatorId: number; // Del JWT
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokeSanctionResponseDto {
  sanctionId: number;
  userId: number;
  username: string;
  originalSanction: string;
  revokedBy: {
    id: number;
    username: string;
    role: string;
  };
  revokeReason: string;
  revokedAt: Date;
  message: string;
}

export class RevokeSanction {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sanctionRepository: SanctionRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly notificationRepository?: NotificationRepository
  ) {}

  async execute(dto: RevokeSanctionRequestDto): Promise<RevokeSanctionResponseDto> {
    const { sanctionId, moderatorId, reason, ipAddress, userAgent } = dto;

    // 1. Verificar permisos (solo admins pueden revocar)
    const moderator = await this.userRepository.findById(moderatorId);
    if (!moderator) {
      throw UserErrors.userNotFound(moderatorId);
    }

    if (moderator.role!.name !== 'admin') {
      throw new Error('Only administrators can revoke sanctions');
    }

    // 2. Obtener la sanción
    const sanction = await this.sanctionRepository.findById(sanctionId);
    if (!sanction) {
      throw new Error('Sanction not found');
    }

    if (!sanction.isActive) {
      throw new Error('Sanction is already inactive');
    }

    // 3. Obtener usuario afectado
    const targetUser = await this.userRepository.findById(sanction.userId);
    if (!targetUser) {
      throw UserErrors.userNotFound(sanction.userId);
    }

    // 4. Revocar la sanción
    const revokedSanction = await this.sanctionRepository.revoke(sanctionId, moderatorId, reason);

    // 5. Revertir efectos en el usuario
    await this.revertUserEffects(targetUser, revokedSanction);

    // 6. Registrar actividad
    await this.activityLogRepository.create({
      userId: moderatorId,
      action: 'sanction_revoked',
      details: {
        sanctionId,
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        originalSanctionType: revokedSanction.sanctionType,
        revokeReason: reason
      },
      ipAddress,
      userAgent
    });

    // 7. Notificar al usuario
    if (this.notificationRepository) {
      await this.notificationRepository.create({
        userId: targetUser.id,
        type: 'moderation',
        content: `Your ${revokedSanction.sanctionType} sanction has been revoked. Reason: ${reason}`,
        relatedData: {
          sanctionId,
          revokeReason: reason
        }
      }).catch(err => console.error('Failed to notify user:', err));
    }

    return {
      sanctionId,
      userId: targetUser.id,
      username: targetUser.username,
      originalSanction: revokedSanction.sanctionType,
      revokedBy: {
        id: moderator.id,
        username: moderator.username,
        role: moderator.role!.name
      },
      revokeReason: reason,
      revokedAt: revokedSanction.revokedAt!,
      message: 'Sanction revoked successfully'
    };
  }

  private async revertUserEffects(user: any, sanction: any): Promise<void> {
    const updates: any = {};

    switch (sanction.sanctionType) {
      case 'silence':
        updates.isSilenced = false;
        updates.silencedUntil = null;
        break;
      case 'temp_suspend':
      case 'permanent_ban':
        updates.isBanned = false;
        updates.bannedAt = null;
        updates.bannedBy = null;
        updates.banReason = null;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepository.updateById(user.id, updates);
    }
  }
}