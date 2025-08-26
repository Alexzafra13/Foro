// src/infrastructure/datasources/prisma-user.datasource.ts - IMPLEMENTACIÓN COMPLETA CON BÚSQUEDA

import { PrismaClient } from '@prisma/client';
import { UserDatasource } from '../../domain/datasources/user.datasource';
import { UserEntity } from '../../domain/entities/user.entity';
import { 
  CreateUserDto, 
  UserFilters, 
  UpdateUserModerationDto, 
  ModerationStatsDto,
  UserSearchFilters
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
        skip,
        take: limit,
        orderBy: { bannedAt: 'desc' }
      }),
      this.prisma.user.count({
        where: { isBanned: true }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
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
      },
      orderBy: { createdAt: 'asc' }
    });

    return users.map(user => UserEntity.fromObject(user));
  }

  async countBannedUsers(): Promise<number> {
    return await this.prisma.user.count({
      where: { isBanned: true }
    });
  }

  // ✅ NUEVO MÉTODO: BÚSQUEDA DE USUARIOS
  async searchUsers(filters: UserSearchFilters): Promise<UserEntity[]> {
    const {
      query,
      limit = 10,
      excludeUserId,
      includeRoleInfo = true,
      onlyModeratable = false
    } = filters;

    console.log('🔍 PrismaUserDatasource.searchUsers called with:', filters);

    // Construir condiciones de búsqueda
    const searchConditions: any = {
      OR: [
        {
          username: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    };

    // Excluir usuario específico (para no auto-sancionarse)
    if (excludeUserId) {
      searchConditions.id = {
        not: excludeUserId
      };
    }

    // Solo usuarios moderables (no admin)
    if (onlyModeratable) {
      searchConditions.role = {
        name: {
          not: 'admin'
        }
      };
    }

    try {
      const users = await this.prisma.user.findMany({
        where: searchConditions,
        include: {
          role: includeRoleInfo,
          ...(includeRoleInfo && {
            bannedByUser: {
              select: {
                id: true,
                username: true
              }
            }
          })
        },
        take: Math.min(limit, 50), // Máximo 50 resultados
        orderBy: [
          { isEmailVerified: 'desc' }, // Verificados primero
          { reputation: 'desc' },      // Por reputación
          { createdAt: 'asc' }         // Más antiguos primero
        ]
      });

      console.log(`✅ Found ${users.length} users matching query: "${query}"`);

      return users.map(user => UserEntity.fromObject(user));
    } catch (error) {
      console.error('❌ Error in searchUsers:', error);
      
      // Manejo seguro del error unknown
      if (error instanceof Error) {
        throw new Error(`Failed to search users: ${error.message}`);
      } else {
        throw new Error(`Failed to search users: ${String(error)}`);
      }
    }
  }

  // ===== MÉTODOS DE MODERACIÓN AVANZADA (EXISTENTES) =====

  async updateModerationStatus(id: number, data: UpdateUserModerationDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
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

  async findSilencedUsers(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { isSilenced: true },
        include: { 
          role: true,
          bannedByUser: {
            select: {
              id: true,
              username: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { silencedUntil: 'asc' }
      }),
      this.prisma.user.count({
        where: { isSilenced: true }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
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

    // Construir condiciones basadas en el nivel
    let whereCondition: any = {};
    
    switch (level) {
      case 'banned':
        whereCondition = { isBanned: true };
        break;
      case 'suspended':
        whereCondition = { isSilenced: true };
        break;
      case 'warned':
        whereCondition = { warningsCount: { gt: 0 } };
        break;
      case 'clean':
        whereCondition = {
          isBanned: false,
          isSilenced: false,
          warningsCount: 0
        };
        break;
      default:
        whereCondition = {};
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        include: { 
          role: true,
          bannedByUser: {
            select: {
              id: true,
              username: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where: whereCondition
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async countUsersByModerationStatus(): Promise<ModerationStatsDto> {
    const [total, banned, silenced, warned] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({ where: { isSilenced: true } }),
      this.prisma.user.count({ where: { warningsCount: { gt: 0 } } })
    ]);

    return {
      total,
      banned,
      silenced,
      warned,
      clean: total - banned - silenced - warned
    };
  }

  async findUsersWithActiveWarnings(pagination: { page: number; limit: number }): Promise<PaginatedUsersResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { warningsCount: { gt: 0 } },
        include: { 
          role: true,
          bannedByUser: {
            select: {
              id: true,
              username: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { warningsCount: 'desc' },
          { lastWarningAt: 'desc' }
        ]
      }),
      this.prisma.user.count({
        where: { warningsCount: { gt: 0 } }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map(user => UserEntity.fromObject(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async cleanExpiredSilences(): Promise<number> {
    const now = new Date();
    
    const result = await this.prisma.user.updateMany({
      where: {
        isSilenced: true,
        silencedUntil: {
          lte: now
        }
      },
      data: {
        isSilenced: false,
        silencedUntil: null
      }
    });

    console.log(`🧹 Cleaned ${result.count} expired silences`);
    return result.count;
  }
}