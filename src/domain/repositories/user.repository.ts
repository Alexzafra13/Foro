// src/domain/repositories/user.repository.ts - INTERFACE ACTUALIZADA CON BÚSQUEDA

import { UserEntity } from '../entities/user.entity';
import { CreateUserDto, UserFilters, UpdateUserModerationDto, ModerationStatsDto, UserSearchFilters } from '../datasources/user.datasource';

export interface PaginatedUsersResult {
  data: UserEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class UserRepository {
  // ===== MÉTODOS EXISTENTES =====
  abstract create(createUserDto: CreateUserDto): Promise<UserEntity>;
  abstract findById(id: number): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByUsername(username: string): Promise<UserEntity | null>;
  abstract updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  abstract deleteById(id: number): Promise<UserEntity>;
  abstract findBannedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult>;
  abstract findByRole(roleName: string): Promise<UserEntity[]>;
  abstract countBannedUsers(): Promise<number>;

  // ✅ NUEVO MÉTODO: BÚSQUEDA DE USUARIOS
  abstract searchUsers(filters: UserSearchFilters): Promise<UserEntity[]>;

  // ✅ MÉTODOS PARA MODERACIÓN AVANZADA (EXISTENTES)
  abstract updateModerationStatus(id: number, data: UpdateUserModerationDto): Promise<UserEntity>;
  abstract findSilencedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult>;
  abstract findUsersByModerationLevel(
    level: 'clean' | 'warned' | 'restricted' | 'suspended' | 'banned', 
    pagination: { page: number; limit: number }
  ): Promise<PaginatedUsersResult>;
  abstract countUsersByModerationStatus(): Promise<ModerationStatsDto>;
  abstract findUsersWithActiveWarnings(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult>;
  abstract cleanExpiredSilences(): Promise<number>;
}