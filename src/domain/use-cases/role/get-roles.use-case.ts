import { RoleEntity, RoleRepository } from '../../';

interface GetRolesUseCase {
  execute(): Promise<RoleEntity[]>;
}

export class GetRoles implements GetRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<RoleEntity[]> {
    return await this.roleRepository.getAll();
  }
}