import { PrismaClient } from "@prisma/client";
import { PrismaRoleDatasource, RoleRepositoryImpl } from "./";
import { GetRoles } from "../domain";
import { RoleController } from "../presentation";

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
