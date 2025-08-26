// src/domain/use-cases/user/search-users.use-case.ts

import { UserRepository } from '../../repositories/user.repository';
import { AuthErrors, ValidationErrors } from '../../../shared/errors/domain.errors';
import { UserEntity } from '../../entities/user.entity';

export interface SearchUsersRequestDto {
  query: string;
  limit?: number;
  excludeCurrentUser?: boolean;
  currentUserId?: number; // Para excluir al usuario actual
  includeRoleInfo?: boolean;
  onlyModeratable?: boolean; // Solo usuarios que pueden ser moderados
}

export interface SearchUsersResponseDto {
  data: UserSearchResultDto[];
  total: number;
  query: string;
}

export interface UserSearchResultDto {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  reputation: number;
  role: {
    id: number;
    name: string;
  };
  isEmailVerified: boolean;
  isBanned: boolean;
  isSilenced: boolean;
  createdAt: Date;
  // Campos adicionales para moderación
  moderationLevel: string;
  warningsCount: number;
  lastWarningAt: Date | null;
  // Flags calculados
  canBeModerated: boolean;
}

interface SearchUsersUseCase {
  execute(dto: SearchUsersRequestDto): Promise<SearchUsersResponseDto>;
}

export class SearchUsers implements SearchUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: SearchUsersRequestDto): Promise<SearchUsersResponseDto> {
    const {
      query,
      limit = 10,
      excludeCurrentUser = false,
      currentUserId,
      includeRoleInfo = true,
      onlyModeratable = false
    } = dto;

    console.log('🔍 SearchUsers use case called with:', dto);

    // Validar query
    if (!query || query.trim().length < 2) {
      throw ValidationErrors.invalidInput('Query must be at least 2 characters long');
    }

    if (limit > 50) {
      throw ValidationErrors.invalidInput('Limit cannot exceed 50');
    }

    // Configurar filtros para el repositorio
    const searchFilters = {
      query: query.trim(),
      limit: Math.min(limit, 50),
      ...(excludeCurrentUser && currentUserId && { excludeUserId: currentUserId }),
      includeRoleInfo,
      onlyModeratable
    };

    try {
      // Buscar usuarios usando el repositorio
      const users = await this.userRepository.searchUsers(searchFilters);

      console.log(`✅ Found ${users.length} users for query: "${query}"`);

      // Formatear resultados
      const results = users.map(user => this.formatUserSearchResult(user, includeRoleInfo));

      return {
        data: results,
        total: results.length,
        query: query.trim()
      };
    } catch (error) {
      console.error('❌ Error in SearchUsers use case:', error);
      
      // Manejo seguro del error unknown
      if (error instanceof Error) {
        throw new Error(`Failed to search users: ${error.message}`);
      } else {
        throw new Error(`Failed to search users: ${String(error)}`);
      }
    }
  }

  private formatUserSearchResult(user: UserEntity, includeRoleInfo: boolean): UserSearchResultDto {
    const result: UserSearchResultDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
      reputation: user.reputation || 0,
      role: user.role!,
      isEmailVerified: user.isEmailVerified || false,
      isBanned: user.isBanned || false,
      isSilenced: user.isSilenced || false,
      createdAt: user.createdAt,
      moderationLevel: this.getUserModerationLevel(user),
      warningsCount: user.warningsCount || 0,
      lastWarningAt: user.lastWarningAt || null,
      canBeModerated: this.canUserBeModerated(user)
    };

    return result;
  }

  private getUserModerationLevel(user: UserEntity): string {
    if (user.isBanned) return 'banned';
    if (user.isSilenced) return 'silenced';
    if (user.warningsCount && user.warningsCount > 0) return 'warned';
    return 'clean';
  }

  private canUserBeModerated(user: UserEntity): boolean {
    // Los admin no pueden ser moderados
    // Los moderadores solo pueden ser moderados por admin
    const userRole = user.role?.name || 'user';
    
    switch (userRole) {
      case 'admin':
        return false; // Los admin nunca pueden ser moderados
      case 'moderator':
        return true; // Los moderadores pueden ser moderados por admin
      case 'user':
      default:
        return true; // Los usuarios normales siempre pueden ser moderados
    }
  }
}