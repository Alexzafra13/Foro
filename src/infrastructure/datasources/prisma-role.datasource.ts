import { PrismaClient } from '@prisma/client';
import { RoleDatasource } from '@/domain/datasources/role.datasource';
import { RoleEntity } from '@/domain/entities/role.entity';

export class PrismaRoleDatasource implements RoleDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(): Promise<RoleEntity[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' }
    });
    
    return roles.map(role => RoleEntity.fromObject(role));
  }

  async findById(id: number): Promise<RoleEntity | null> {
    const role = await this.prisma.role.findUnique({
      where: { id }
    });

    return role ? RoleEntity.fromObject(role) : null;
  }
}