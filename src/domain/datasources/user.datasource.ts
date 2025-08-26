// src/domain/datasources/user.datasource.ts - INTERFACE ACTUALIZADA CON BÚSQUEDA

import { UserEntity } from '../entities/user.entity';
import { PaginatedUsersResult } from '../repositories/user.repository';

export interface CreateUserDto {
  username: string;
  email: string;
  passwordHash: string;
  roleId: number;
}

export interface UserFilters {
  isBanned?: boolean;
  isSilenced?: boolean;
  roleId?: number;
  isEmailVerified?: boolean;
  moderationLevel?: 'clean' | 'warned' | 'restricted' | 'suspended' | 'banned';
}

// ✅ NUEVO: FILTROS PARA BÚSQUEDA
export interface UserSearchFilters {
  query: string;
  limit?: number;
  excludeUserId?: number;
  includeRoleInfo?: boolean;
  onlyModeratable?: boolean; // Solo usuarios que pueden ser moderados
}

// ✅ NUEVO DTO PARA ACTUALIZACIONES DE MODERACIÓN
export interface UpdateUserModerationDto {
  isSilenced?: boolean;
  silencedUntil?: Date | null;
  warningsCount?: number;
  lastWarningAt?: Date | null;
  isBanned?: boolean;
  bannedAt?: Date | null;
  bannedBy?: number | null;
  banReason?: string | null;
}

// ✅ NUEVO DTO PARA ESTADÍSTICAS DE MODERACIÓN
export interface ModerationStatsDto {
  total: number;
  banned: number;
  silenced: number;
  warned: number;
  clean: number;
}

export abstract class UserDatasource {
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
  abstract cleanExpiredSilences(): Promise<number>; // Para limpiar silenciamientos expirados
}