import { PrismaClient } from '@prisma/client';
import { PrismaRoleDatasource } from '@/infrastructure/datasources/prisma-role.datasource';
import { RoleRepositoryImpl } from '@/infrastructure/repositories/role.repository.impl';
import { GetRoles } from '@/domain/use-cases/role/get-roles.use-case';
import { RoleController } from '@/presentation/controllers/role.controller';

export class Dependencies {
  static async create() {
    // Database
    const prisma = new PrismaClient();

    // Datasources
    const roleDatasource = new PrismaRoleDatasource(prisma);

    // Repositories
    const roleRepository = new RoleRepositoryImpl(roleDatasource);

    // Use Cases
    const getRoles = new GetRoles(roleRepository);

    // Controllers
    const roleController = new RoleController(getRoles);

    return {
      prisma,
      controllers: {
        roleController,
      },
    };
  }
}
