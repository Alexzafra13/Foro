import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '../datasources/user.datasource';

export interface UserFilters {
  isBanned?: boolean;
  roleId?: number;
  isEmailVerified?: boolean;
}

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
  // Métodos existentes
  abstract create(createUserDto: CreateUserDto): Promise<UserEntity>;
  abstract findById(id: number): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByUsername(username: string): Promise<UserEntity | null>;
  abstract updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  abstract deleteById(id: number): Promise<UserEntity>;
  
  // ✅ NUEVOS MÉTODOS PARA SISTEMA DE BAN
  abstract findBannedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult>;
  abstract findByRole(roleName: string): Promise<UserEntity[]>;
  abstract countBannedUsers(): Promise<number>;
}