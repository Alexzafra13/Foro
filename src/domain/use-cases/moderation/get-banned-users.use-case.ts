import { UserRepository } from '../../repositories/user.repository';
import { UserErrors } from '../../../shared/errors';

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