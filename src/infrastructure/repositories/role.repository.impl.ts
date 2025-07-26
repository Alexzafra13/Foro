import { RoleEntity } from '@/domain/entities/role.entity';
import { RoleRepository } from '@/domain/repositories/role.repository';
import { RoleDatasource } from '@/domain/datasources/role.datasource';
export class RoleRepositoryImpl implements RoleRepository {
  constructor(private readonly roleDatasource: RoleDatasource) {}

  async getAll(): Promise<RoleEntity[]> {
    return await this.roleDatasource.getAll();
  }

  async findById(id: number): Promise<RoleEntity | null> {
    return await this.roleDatasource.findById(id);
  }
}