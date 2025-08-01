import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserErrors } from '../../../shared/errors';
import { InviteCodeFilters } from '../../datasources/invite-code.datasource';

export interface GetInviteCodesRequestDto {
  requesterId: number;
  filters: {
    page?: number;
    limit?: number;
    status?: string; // 'all', 'active', 'used', 'expired'
    createdBy?: number;
  };
}

export interface GetInviteCodesResponseDto {
  codes: Array<{
    code: string;
    createdAt: Date;
    usedAt: Date | null;
    isExpired: boolean;
    creator: {
      id: number;
      username: string;
      role: string;
    } | undefined;
    user: {
      id: number;
      username: string;
    } | undefined;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class GetInviteCodes {
  constructor(
    private readonly inviteCodeRepository: InviteCodeRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetInviteCodesRequestDto): Promise<GetInviteCodesResponseDto> {
    const { requesterId, filters } = dto;

    // 1. Verificar permisos
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (!['admin', 'moderator'].includes(requester.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Construir filtros para el repository
    const repositoryFilters: InviteCodeFilters = {
      createdBy: filters.createdBy
    };

    // Manejar filtro de status
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'used':
          repositoryFilters.isUsed = true;
          break;
        case 'active':
          repositoryFilters.isUsed = false;
          // TODO: También filtrar no expirados cuando se implemente
          break;
      }
    }

    // 3. Obtener códigos
    const allCodes = await this.inviteCodeRepository.findMany(repositoryFilters);

    // 4. Aplicar filtros adicionales (como expiración) y paginación
    let filteredCodes = allCodes;

    // Filtrar por expiración si es necesario
    if (filters.status === 'expired') {
      filteredCodes = allCodes.filter(code => 
        !code.isUsed() && code.isExpired()
      );
    } else if (filters.status === 'active') {
      filteredCodes = allCodes.filter(code => 
        !code.isUsed() && !code.isExpired()
      );
    }

    // 5. Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const total = filteredCodes.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedCodes = filteredCodes.slice(startIndex, endIndex);

    // 6. Formatear respuesta
    return {
      codes: paginatedCodes.map(code => ({
        code: code.code,
        createdAt: code.createdAt,
        usedAt: code.usedAt,
        isExpired: code.isExpired(),
        creator: code.creator,
        user: code.user
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}
