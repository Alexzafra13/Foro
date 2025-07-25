import { RoleEntity, RoleRepository, RoleDatasource } from '../../domain';
export class RoleRepositoryImpl implements RoleRepository {
  constructor(private readonly roleDatasource: RoleDatasource) {}

  async getAll(): Promise<RoleEntity[]> {
    return await this.roleDatasource.getAll();
  }

  async findById(id: number): Promise<RoleEntity | null> {
    return await this.roleDatasource.findById(id);
  }
}