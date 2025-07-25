import { RoleEntity } from '../entities/role.entity';

export abstract class RoleDatasource {
  abstract getAll(): Promise<RoleEntity[]>;
  abstract findById(id: number): Promise<RoleEntity | null>;
}