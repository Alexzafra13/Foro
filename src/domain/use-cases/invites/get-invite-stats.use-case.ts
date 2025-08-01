import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserErrors } from '../../../shared/errors';

export interface GetInviteStatsRequestDto {
  requesterId: number;
  createdBy?: number; // Filtrar por creador específico
}

export interface GetInviteStatsResponseDto {
  total: number;
  used: number;
  available: number;
  expired: number;
  recentCodes: Array<{
    code: string;
    createdAt: Date;
    creator: {
      username: string;
      role: string;
    };
  }>;
  topCreators: Array<{
    creator: {
      username: string;
      role: string;
    };
    count: number;
  }>;
}

export class GetInviteStats {
  constructor(
    private readonly inviteCodeRepository: InviteCodeRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetInviteStatsRequestDto): Promise<GetInviteStatsResponseDto> {
    const { requesterId, createdBy } = dto;

    // 1. Verificar permisos
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Obtener estadísticas básicas
    const stats = await this.inviteCodeRepository.getStats(createdBy);

    // 3. Obtener códigos recientes (últimos 5)
    const allCodes = await this.inviteCodeRepository.findMany({ createdBy });
    const recentCodes = allCodes
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(code => ({
        code: code.code,
        createdAt: code.createdAt,
        creator: {
          username: code.creator?.username || 'Unknown',
          role: code.creator?.role || 'Unknown'
        }
      }));

    // 4. Obtener top creadores (si no se filtró por creador específico)
    let topCreators: any[] = [];
    if (!createdBy) {
      const creatorStats = new Map<string, { creator: any; count: number }>();
      
      allCodes.forEach(code => {
        if (code.creator) {
          const key = code.creator.username;
          if (creatorStats.has(key)) {
            creatorStats.get(key)!.count++;
          } else {
            creatorStats.set(key, {
              creator: {
                username: code.creator.username,
                role: code.creator.role
              },
              count: 1
            });
          }
        }
      });

      topCreators = Array.from(creatorStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }

    return {
      ...stats,
      recentCodes,
      topCreators
    };
  }
}