import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { UserErrors } from '../../../shared/errors';

export interface UnbanUserRequestDto {
  targetUserId: number;
  unbannedBy: number; // Admin ID del JWT
  ipAddress?: string;
  userAgent?: string;
}

export interface UnbanUserResponseDto {
  userId: number;
  username: string;
  isBanned: boolean;
  unbannedAt: Date;
  unbannedBy: {
    id: number;
    username: string;
    role: string;
  };
  message: string;
}

export class UnbanUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly notificationRepository?: NotificationRepository
  ) {}

  async execute(dto: UnbanUserRequestDto): Promise<UnbanUserResponseDto> {
    const { targetUserId, unbannedBy, ipAddress, userAgent } = dto;

    // 1. Verificar que el admin existe
    const admin = await this.userRepository.findById(unbannedBy);
    if (!admin) {
      throw UserErrors.userNotFound(unbannedBy);
    }

    // 2. Verificar permisos (solo admin puede desbanear)
    if (admin.role!.name !== 'admin') {
      throw UserErrors.insufficientPermissions();
    }

    // 3. Obtener usuario objetivo
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw UserErrors.userNotFound(targetUserId);
    }

    // 4. Verificar si está baneado
    if (!targetUser.isBanned) {
      throw new Error('User is not banned');
    }

    // 5. Quitar ban
    await this.userRepository.updateById(targetUserId, {
      isBanned: false,
      bannedAt: null,
      bannedBy: null,
      banReason: null
    });

    // 6. Registrar en activity log
    await this.activityLogRepository.create({
      userId: unbannedBy,
      action: 'user_unbanned',
      details: {
        targetUserId,
        targetUsername: targetUser.username,
        previousBanReason: targetUser.banReason
      },
      ipAddress,
      userAgent
    });

    // 7. Notificar al usuario desbaneado
    if (this.notificationRepository) {
      await this.notificationRepository.create({
        userId: targetUserId,
        type: 'system',
        content: 'Your account has been unbanned. You can now access all forum features.',
        relatedData: {
          unbannedBy: unbannedBy
        }
      }).catch(err => console.error('Failed to notify user:', err));
    }

    return {
      userId: targetUser.id,
      username: targetUser.username,
      isBanned: false,
      unbannedAt: new Date(),
      unbannedBy: {
        id: admin.id,
        username: admin.username,
        role: admin.role!.name
      },
      message: `User ${targetUser.username} has been unbanned successfully`
    };
  }
}