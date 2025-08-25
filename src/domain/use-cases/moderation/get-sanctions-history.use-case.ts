import { UserRepository } from '../../repositories/user.repository';
import { SanctionRepository } from '../../repositories/sanction.repository';
import { SanctionFilters, SanctionPaginationOptions } from '../../datasources/sanction.datasource';
import { UserErrors } from '../../../shared/errors';

export interface GetSanctionsHistoryRequestDto {
  requesterId: number; // Del JWT
  page?: number;
  limit?: number;
  sanctionType?: string;
  severity?: string;
  status?: 'active' | 'inactive' | 'all';
  userId?: number; // Para filtrar por usuario específico
  moderatorId?: number; // Para filtrar por moderador específico
  sortBy?: 'createdAt' | 'updatedAt' | 'sanctionType' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface SanctionHistoryDto {
  id: number;
  sanctionType: string;
  reason: string;
  severity: string;
  duration: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  user: {
    id: number;
    username: string;
    role: string;
  };
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
}

export interface GetSanctionsHistoryResponseDto {
  sanctions: SanctionHistoryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    totalSanctions: number;
    activeSanctions: number;
    sanctionsByType: Record<string, number>;
    sanctionsBySeverity: Record<string, number>;
  };
}

export class GetSanctionsHistory {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sanctionRepository: SanctionRepository
  ) {}

  async execute(dto: GetSanctionsHistoryRequestDto): Promise<GetSanctionsHistoryResponseDto> {
    const { 
      requesterId, 
      page = 1, 
      limit = 20, 
      sanctionType, 
      severity, 
      status = 'all', 
      userId, 
      moderatorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = dto;

    // 1. Verificar permisos
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Construir filtros
    const filters: SanctionFilters = {};
    if (userId) filters.userId = userId;
    if (moderatorId) filters.moderatorId = moderatorId;
    if (sanctionType) filters.sanctionType = sanctionType;
    if (severity) filters.severity = severity as any;
    if (status === 'active') filters.isActive = true;
    else if (status === 'inactive') filters.isActive = false;

    // 3. Opciones de paginación
    const paginationOptions: SanctionPaginationOptions = {
      page,
      limit: Math.min(limit, 100),
      sortBy: sortBy as any,
      sortOrder
    };

    // 4. Obtener sanciones
    const result = await this.sanctionRepository.findMany(filters, paginationOptions);

    // 5. Formatear respuesta
    const formattedSanctions: SanctionHistoryDto[] = result.data.map(sanction => ({
      id: sanction.id,
      sanctionType: sanction.sanctionType,
      reason: sanction.reason,
      severity: sanction.severity,
      duration: sanction.getFormattedDuration(),
      isActive: sanction.isActive,
      createdAt: sanction.createdAt,
      expiresAt: sanction.expiresAt,
      revokedAt: sanction.revokedAt,
      user: {
        id: sanction.user?.id || 0,
        username: sanction.user?.username || 'Unknown',
        role: sanction.user?.role?.name || 'unknown'
      },
      appliedBy: {
        id: sanction.moderator?.id || 0,
        username: sanction.moderator?.username || 'Unknown',
        role: sanction.moderator?.role?.name || 'unknown'
      },
      revokedBy: sanction.revoker ? {
        id: sanction.revoker.id,
        username: sanction.revoker.username,
        role: sanction.revoker.role.name
      } : null
    }));

    // 6. Obtener estadísticas
    const stats = await this.sanctionRepository.getModerationStats();

    return {
      sanctions: formattedSanctions,
      pagination: result.pagination,
      stats
    };
  }
}