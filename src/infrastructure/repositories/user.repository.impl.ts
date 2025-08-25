// src/infrastructure/repositories/user.repository.impl.ts - IMPLEMENTACIÓN COMPLETA

import { UserEntity } from '../../domain/entities/user.entity';
import { UserRepository, PaginatedUsersResult } from '../../domain/repositories/user.repository';
import { UserDatasource } from '../../domain/datasources/user.datasource';
import { 
  CreateUserDto, 
  UserFilters, 
  UpdateUserModerationDto, 
  ModerationStatsDto 
} from '../../domain/datasources/user.datasource';

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly datasource: UserDatasource) {}

  // ===== MÉTODOS EXISTENTES (MANTENER TODOS) =====

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return await this.datasource.create(createUserDto);
  }

  async findById(id: number): Promise<UserEntity | null> {
    return await this.datasource.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.datasource.findByEmail(email);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.datasource.findByUsername(username);
  }

  async updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    return await this.datasource.updateById(id, data);
  }

  async deleteById(id: number): Promise<UserEntity> {
    return await this.datasource.deleteById(id);
  }

  async findBannedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    return await this.datasource.findBannedUsers(pagination);
  }

  async findByRole(roleName: string): Promise<UserEntity[]> {
    return await this.datasource.findByRole(roleName);
  }

  async countBannedUsers(): Promise<number> {
    return await this.datasource.countBannedUsers();
  }

  // ✅ NUEVOS MÉTODOS IMPLEMENTADOS

  async updateModerationStatus(id: number, data: UpdateUserModerationDto): Promise<UserEntity> {
    return await this.datasource.updateModerationStatus(id, data);
  }

  async findSilencedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    return await this.datasource.findSilencedUsers(pagination);
  }

  async findUsersByModerationLevel(
    level: 'clean' | 'warned' | 'restricted' | 'suspended' | 'banned', 
    pagination: { page: number; limit: number }
  ): Promise<PaginatedUsersResult> {
    return await this.datasource.findUsersByModerationLevel(level, pagination);
  }

  async countUsersByModerationStatus(): Promise<ModerationStatsDto> {
    return await this.datasource.countUsersByModerationStatus();
  }

  async findUsersWithActiveWarnings(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    return await this.datasource.findUsersWithActiveWarnings(pagination);
  }

  async cleanExpiredSilences(): Promise<number> {
    return await this.datasource.cleanExpiredSilences();
  }
}