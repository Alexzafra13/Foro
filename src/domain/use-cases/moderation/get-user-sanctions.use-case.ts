import { UserRepository } from '../../repositories/user.repository';
import { SanctionRepository } from '../../repositories/sanction.repository';
import { UserErrors } from '../../../shared/errors';

export interface GetUserSanctionsRequestDto {
  targetUserId: number;
  requesterId: number; // Del JWT
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface SanctionDto {
  id: number;
  sanctionType: string;
  reason: string;
  severity: string;
  duration: string;
  isActive: boolean;
  isExpired: boolean;
  startsAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  appliedBy: {
    id: number;
    username: string;
    role: string;
  };
  revokedBy?: {
    id: number;
    username: string;
    role: string;
  } | null;
  remainingTime?: {
    days: number;
    hours: number;
    minutes: number;
  } | null;
}

export interface GetUserSanctionsResponseDto {
  user: {
    id: number;
    username: string;
    role: string;
    isBanned: boolean;
    isSilenced: boolean;
    warningsCount: number;
  };
  sanctions: SanctionDto[];
  summary: {
    total: number;
    active: number;
    warnings: number;
    suspensions: number;
    bans: number;
  };
}

export class GetUserSanctions {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sanctionRepository: SanctionRepository
  ) {}

  async execute(dto: GetUserSanctionsRequestDto): Promise<GetUserSanctionsResponseDto> {
    const { targetUserId, requesterId, includeInactive = true } = dto;

    // 1. Verificar permisos
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Obtener usuario objetivo
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw UserErrors.userNotFound(targetUserId);
    }

    // 3. Obtener sanciones
    const sanctions = await this.sanctionRepository.findByUserId(targetUserId, includeInactive);

    // 4. Formatear sanciones
    const formattedSanctions: SanctionDto[] = sanctions.map(sanction => ({
      id: sanction.id,
      sanctionType: sanction.sanctionType,
      reason: sanction.reason,
      severity: sanction.severity,
      duration: sanction.getFormattedDuration(),
      isActive: sanction.isActive,
      isExpired: sanction.isExpired(),
      startsAt: sanction.startsAt,
      expiresAt: sanction.expiresAt,
      createdAt: sanction.createdAt,
      revokedAt: sanction.revokedAt,
      revokeReason: sanction.revokeReason,
      appliedBy: {
        id: sanction.moderator?.id || 0,
        username: sanction.moderator?.username || 'Unknown',
        role: sanction.moderator?.role?.name || 'unknown'
      },
      revokedBy: sanction.revoker ? {
        id: sanction.revoker.id,
        username: sanction.revoker.username,
        role: sanction.revoker.role.name
      } : null,
      remainingTime: sanction.getRemainingTime()
    }));

    // 5. Calcular resumen
    const summary = {
      total: sanctions.length,
      active: sanctions.filter(s => s.isActive).length,
      warnings: sanctions.filter(s => s.sanctionType === 'warning').length,
      suspensions: sanctions.filter(s => s.sanctionType === 'temp_suspend').length,
      bans: sanctions.filter(s => s.sanctionType === 'permanent_ban').length
    };

    return {
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role!.name,
        isBanned: targetUser.isBanned || false,
        isSilenced: targetUser.isSilenced || false,
        warningsCount: targetUser.warningsCount || 0
      },
      sanctions: formattedSanctions,
      summary
    };
  }
}