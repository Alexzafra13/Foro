import { UserEntity } from '../entities/user.entity';

export interface CreateUserDto {
  username: string;
  email: string;
  passwordHash: string;
  roleId: number;
}

export abstract class UserDatasource {
  abstract create(createUserDto: CreateUserDto): Promise<UserEntity>;
  abstract findById(id: number): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByUsername(username: string): Promise<UserEntity | null>;
  abstract updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  abstract deleteById(id: number): Promise<UserEntity>;
}