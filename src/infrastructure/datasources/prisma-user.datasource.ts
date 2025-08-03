import { PrismaClient } from '@prisma/client';
import { UserDatasource, CreateUserDto } from '../../domain/datasources/user.datasource';
import { UserEntity } from '../../domain/entities/user.entity';
import { PaginatedUsersResult } from '../../domain/repositories/user.repository';

export class PrismaUserDatasource implements UserDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: createUserDto,
      include: {
        role: true
      }
    });

    return UserEntity.fromObject(user);
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    // ✅ SOLO CAMBIO AQUÍ: usar Record<string, any> para evitar problemas de tipos
    const updateData: Record<string, any> = {
      ...(data.username !== undefined && { username: data.username }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
      ...(data.reputation !== undefined && { reputation: data.reputation }),
      ...(data.roleId !== undefined && { roleId: data.roleId }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.bio !== undefined && { bio: data.bio }),
      // ✅ AGREGAR CAMPOS DE VERIFICACIÓN DE EMAIL (LO IMPORTANTE)
      ...(data.isEmailVerified !== undefined && { isEmailVerified: data.isEmailVerified }),
      ...(data.emailVerifiedAt !== undefined && { emailVerifiedAt: data.emailVerifiedAt }),
      // ✅ OTROS CAMPOS
      ...(data.lastLoginAt !== undefined && { lastLoginAt: data.lastLoginAt }),
      ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt }),
      ...(data.isBanned !== undefined && { isBanned: data.isBanned }),
      ...(data.bannedAt !== undefined && { bannedAt: data.bannedAt }),
      ...(data.bannedBy !== undefined && { bannedBy: data.bannedBy }),
      ...(data.banReason !== undefined && { banReason: data.banReason }),
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });

    return UserEntity.fromObject(user);
  }

  async deleteById(id: number): Promise<UserEntity> {
    const user = await this.prisma.user.delete({
      where: { id },
      include: { role: true }
    });

    return UserEntity.fromObject(user);
  }

  async findBannedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { isBanned: true },
        include: {
          role: true,
          bannedByUser: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { bannedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.user.count({ where: { isBanned: true } })
    ]);

    const userEntities = users.map(user => UserEntity.fromObject(user));

    return {
      data: userEntities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  async findByRole(roleName: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          name: roleName
        }
      },
      include: { role: true }
    });

    return users.map(user => UserEntity.fromObject(user));
  }

  async countBannedUsers(): Promise<number> {
    return await this.prisma.user.count({
      where: { isBanned: true }
    });
  }
}