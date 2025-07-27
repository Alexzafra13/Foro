import { UserEntity } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserDatasource, CreateUserDto } from '../../domain/datasources/user.datasource';

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly userDatasource: UserDatasource) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return await this.userDatasource.create(createUserDto);
  }

  async findById(id: number): Promise<UserEntity | null> {
    return await this.userDatasource.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userDatasource.findByEmail(email);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.userDatasource.findByUsername(username);
  }

  async updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    return await this.userDatasource.updateById(id, data);
  }

  async deleteById(id: number): Promise<UserEntity> {
    return await this.userDatasource.deleteById(id);
  }
}