import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { UserErrors, ModerationErrors } from '../../../shared/errors';

export interface BanUserRequestDto {
  targetUserId: number;
  bannedBy: number; // Admin/Moderator ID del JWT
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface BanUserResponseDto {
  userId: number;
  username: string;
  isBanned: boolean;
  bannedAt: Date;
  bannedBy: {
    id: number;
    username: string;
    role: string;
  };
  reason: string;
  message: string;
}

export class BanUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly notificationRepository?: NotificationRepository
  ) {}

  async execute(dto: BanUserRequestDto): Promise<BanUserResponseDto> {
    const { targetUserId, bannedBy, reason, ipAddress, userAgent } = dto;

    // 1. Verificar que el admin/moderador existe
    const admin = await this.userRepository.findById(bannedBy);
    if (!admin) {
      throw UserErrors.userNotFound(bannedBy);
    }

    // 2. Verificar permisos (solo admin y moderator pueden banear)
    if (!['admin', 'moderator'].includes(admin.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 3. Obtener usuario objetivo
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw UserErrors.userNotFound(targetUserId);
    }

    // 4. Verificar que no se está baneando a un admin
    if (targetUser.role!.name === 'admin') {
      throw ModerationErrors.cannotBanAdmin();
    }

    // 5. Verificar si ya está baneado
    if (targetUser.isBanned) {
      throw ModerationErrors.userAlreadyBanned();
    }

    // 6. Aplicar ban
    const bannedAt = new Date();
    await this.userRepository.updateById(targetUserId, {
      isBanned: true,
      bannedAt,
      bannedBy,
      banReason: reason
    });

    // 7. Registrar en activity log
    await this.activityLogRepository.create({
      userId: bannedBy,
      action: 'user_banned',
      details: {
        targetUserId,
        targetUsername: targetUser.username,
        reason,
        targetRole: targetUser.role!.name
      },
      ipAddress,
      userAgent
    });

    // 8. Crear notificación (opcional, para otros admins)
    if (this.notificationRepository) {
      // Notificar a todos los admins
      const admins = await this.userRepository.findByRole('admin');
      for (const adminUser of admins) {
        if (adminUser.id !== bannedBy) {
          await this.notificationRepository.create({
            userId: adminUser.id,
            type: 'system',
            content: `User ${targetUser.username} was banned by ${admin.username}`,
            relatedData: {
              bannedUserId: targetUserId,
              bannedByUserId: bannedBy,
              reason
            }
          }).catch(err => console.error('Failed to notify admin:', err));
        }
      }
    }

    return {
      userId: targetUser.id,
      username: targetUser.username,
      isBanned: true,
      bannedAt,
      bannedBy: {
        id: admin.id,
        username: admin.username,
        role: admin.role!.name
      },
      reason,
      message: `User ${targetUser.username} has been banned successfully`
    };
  }
}