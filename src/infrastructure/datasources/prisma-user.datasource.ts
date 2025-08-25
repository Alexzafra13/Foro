// src/infrastructure/datasources/prisma-user.datasource.ts - IMPLEMENTACIÓN COMPLETA

import { PrismaClient } from '@prisma/client';
import { UserDatasource } from '../../domain/datasources/user.datasource';
import { UserEntity } from '../../domain/entities/user.entity';
import { 
  CreateUserDto, 
  UserFilters, 
  UpdateUserModerationDto, 
  ModerationStatsDto 
} from '../../domain/datasources/user.datasource';
import { PaginatedUsersResult } from '../../domain/repositories/user.repository';

export class PrismaUserDatasource extends UserDatasource {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  // ===== MÉTODOS EXISTENTES (MANTENER TODOS) =====

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: createUserDto,
      include: { role: true }
    });

    return UserEntity.fromObject(user);
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { 
        role: true,
        bannedByUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { 
        role: true,
        bannedByUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { 
        role: true,
        bannedByUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    const updateData: any = {};

    // Mapear solo los campos que existen en el schema
    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.reputation !== undefined) updateData.reputation = data.reputation;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.isEmailVerified !== undefined) updateData.isEmailVerified = data.isEmailVerified;
    if (data.emailVerifiedAt !== undefined) updateData.emailVerifiedAt = data.emailVerifiedAt;
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;
    if (data.updatedAt !== undefined) updateData.updatedAt = data.updatedAt;
    if (data.isBanned !== undefined) updateData.isBanned = data.isBanned;
    if (data.bannedAt !== undefined) updateData.bannedAt = data.bannedAt;
    if (data.bannedBy !== undefined) updateData.bannedBy = data.bannedBy;
    if (data.banReason !== undefined) updateData.banReason = data.banReason;
    // ✅ NUEVOS CAMPOS
    if (data.isSilenced !== undefined) updateData.isSilenced = data.isSilenced;
    if (data.silencedUntil !== undefined) updateData.silencedUntil = data.silencedUntil;
    if (data.warningsCount !== undefined) updateData.warningsCount = data.warningsCount;
    if (data.lastWarningAt !== undefined) updateData.lastWarningAt = data.lastWarningAt;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { 
        role: true,
        bannedByUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
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
      include: { 
        role: true,
        bannedByUser: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return users.map(user => UserEntity.fromObject(user));
  }

  async countBannedUsers(): Promise<number> {
    return await this.prisma.user.count({
      where: { isBanned: true }
    });
  }

  // ✅ NUEVOS MÉTODOS IMPLEMENTADOS

  async updateModerationStatus(id: number, data: UpdateUserModerationDto): Promise<UserEntity> {
    const updateData: any = {};
    
    if (data.isSilenced !== undefined) updateData.isSilenced = data.isSilenced;
    if (data.silencedUntil !== undefined) updateData.silencedUntil = data.silencedUntil;
    if (data.warningsCount !== undefined) updateData.warningsCount = data.warningsCount;
    if (data.lastWarningAt !== undefined) updateData.lastWarningAt = data.lastWarningAt;
    if (data.isBanned !== undefined) updateData.isBanned = data.isBanned;
    if (data.bannedAt !== undefined) updateData.bannedAt = data.bannedAt;
    if (data.bannedBy !== undefined) updateData.bannedBy = data.bannedBy;
    if (data.banReason !== undefined) updateData.banReason = data.banReason;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { 
        role: true, 
        bannedByUser: { 
          select: { id: true, username: true } 
        } 
      }
    });

    return UserEntity.fromObject(user);
  }

  async findSilencedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { 
          isSilenced: true,
          OR: [
            { silencedUntil: null }, // Permanente
            { silencedUntil: { gt: new Date() } } // No expirado
          ]
        },
        include: { 
          role: true, 
          bannedByUser: { 
            select: { id: true, username: true } 
          } 
        },
        orderBy: { silencedUntil: 'asc' },
        skip,
        take: limit
      }),
      this.prisma.user.count({ 
        where: { 
          isSilenced: true,
          OR: [
            { silencedUntil: null },
            { silencedUntil: { gt: new Date() } }
          ]
        } 
      })
    ]);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
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

  async findUsersByModerationLevel(
    level: 'clean' | 'warned' | 'restricted' | 'suspended' | 'banned', 
    pagination: { page: number; limit: number }
  ): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    let whereCondition: any = {};

    switch (level) {
      case 'banned':
        whereCondition = { isBanned: true };
        break;
      case 'restricted':
        whereCondition = {
          isSilenced: true,
          OR: [
            { silencedUntil: null },
            { silencedUntil: { gt: new Date() } }
          ]
        };
        break;
      case 'suspended':
        whereCondition = { warningsCount: { gte: 3 }, isBanned: false };
        break;
      case 'warned':
        whereCondition = { 
          warningsCount: { gt: 0, lt: 3 }, 
          isBanned: false,
          isSilenced: false 
        };
        break;
      case 'clean':
        whereCondition = { 
          warningsCount: 0, 
          isBanned: false,
          isSilenced: false 
        };
        break;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        include: { 
          role: true, 
          bannedByUser: { 
            select: { id: true, username: true } 
          } 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.user.count({ where: whereCondition })
    ]);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
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

  async countUsersByModerationStatus(): Promise<ModerationStatsDto> {
    const [total, banned, silenced, warned, clean] = await Promise.all([
      // Total de usuarios
      this.prisma.user.count(),
      
      // Usuarios baneados
      this.prisma.user.count({
        where: { isBanned: true }
      }),
      
      // Usuarios silenciados actualmente
      this.prisma.user.count({
        where: { 
          isSilenced: true,
          OR: [
            { silencedUntil: null },
            { silencedUntil: { gt: new Date() } }
          ]
        }
      }),
      
      // Usuarios con advertencias (1-2 advertencias, no baneados ni silenciados)
      this.prisma.user.count({
        where: { 
          warningsCount: { gt: 0 }, 
          isBanned: false,
          OR: [
            { isSilenced: false },
            { 
              isSilenced: true,
              silencedUntil: { lt: new Date() } 
            }
          ]
        }
      }),
      
      // Usuarios limpios (sin advertencias, ban ni silenciamiento)
      this.prisma.user.count({
        where: { 
          warningsCount: 0, 
          isBanned: false,
          OR: [
            { isSilenced: false },
            { 
              isSilenced: true,
              silencedUntil: { lt: new Date() } 
            }
          ]
        }
      })
    ]);

    return {
      total,
      banned,
      silenced,
      warned,
      clean
    };
  }

  async findUsersWithActiveWarnings(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { 
          warningsCount: { gt: 0 },
          isBanned: false
        },
        include: { 
          role: true, 
          bannedByUser: { 
            select: { id: true, username: true } 
          } 
        },
        orderBy: [
          { warningsCount: 'desc' },
          { lastWarningAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      this.prisma.user.count({ 
        where: { 
          warningsCount: { gt: 0 },
          isBanned: false
        } 
      })
    ]);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
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

  async cleanExpiredSilences(): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        isSilenced: true,
        silencedUntil: {
          not: null,
          lt: new Date()
        }
      },
      data: {
        isSilenced: false,
        silencedUntil: null
      }
    });

    return result.count;
  }
}