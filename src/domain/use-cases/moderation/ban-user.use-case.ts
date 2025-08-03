// src/domain/use-cases/moderation/ban-user.use-case.ts
import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { NotificationRepository } from '../../repositories/notification.repository';
import { UserErrors, ModerationErrors } from '../../../shared/errors';

export interface BanUserRequestDto {
  targetUserId: number;
  bannedBy: number; // Admin/Moderator ID del JWT
  reason: string;
  ipAddress?: string | null;  // ✅ CAMBIADO: ahora acepta null
  userAgent?: string | null;  // ✅ CAMBIADO: ahora acepta null
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

// src/domain/use-cases/moderation/unban-user.use-case.ts
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

// src/domain/use-cases/moderation/get-banned-users.use-case.ts
export interface GetBannedUsersRequestDto {
  requesterId: number; // Del JWT
  page?: number;
  limit?: number;
}

export interface BannedUserDto {
  id: number;
  username: string;
  email: string;
  bannedAt: Date;
  banReason: string;
  bannedBy: {
    id: number;
    username: string;
  };
}

export interface GetBannedUsersResponseDto {
  users: BannedUserDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class GetBannedUsers {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetBannedUsersRequestDto): Promise<GetBannedUsersResponseDto> {
    const { requesterId, page = 1, limit = 20 } = dto;

    // 1. Verificar permisos
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Obtener usuarios baneados
    const result = await this.userRepository.findBannedUsers({
      page,
      limit
    });

    // 3. Formatear respuesta
    const users = result.data.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      bannedAt: user.bannedAt!,
      banReason: user.banReason!,
      bannedBy: {
        id: user.bannedBy!,
        username: user.bannedByUser?.username || 'Unknown'
      }
    }));

    return {
      users,
      pagination: result.pagination
    };
  }
}