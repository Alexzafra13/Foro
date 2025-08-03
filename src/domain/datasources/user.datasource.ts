import { UserEntity } from '../entities/user.entity';
import { PaginatedUsersResult } from '../repositories/user.repository'; // ✅ IMPORTAR

export interface CreateUserDto {
  username: string;
  email: string;
  passwordHash: string;
  roleId: number;
}

export interface UserFilters {
  isBanned?: boolean;
  roleId?: number;
  isEmailVerified?: boolean;
}

export abstract class UserDatasource {
  // Métodos existentes
  abstract create(createUserDto: CreateUserDto): Promise<UserEntity>;
  abstract findById(id: number): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByUsername(username: string): Promise<UserEntity | null>;
  abstract updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  abstract deleteById(id: number): Promise<UserEntity>;
  
  // ✅ NUEVOS MÉTODOS
  abstract findBannedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult>;
  abstract findByRole(roleName: string): Promise<UserEntity[]>;
  abstract countBannedUsers(): Promise<number>;
}