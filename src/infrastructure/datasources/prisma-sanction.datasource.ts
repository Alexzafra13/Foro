import { PrismaClient } from '@prisma/client';
import { SanctionDatasource } from '../../domain/datasources/sanction.datasource';
import { SanctionEntity, SanctionType } from '../../domain/entities/sanction.entity';
import { 
  CreateSanctionDto, 
  SanctionFilters, 
  SanctionPaginationOptions, 
  PaginatedSanctionsResult 
} from '../../domain/datasources/sanction.datasource';

export class PrismaSanctionDatasource extends SanctionDatasource {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  async create(dto: CreateSanctionDto): Promise<SanctionEntity> {
    const expiresAt = dto.durationHours 
      ? new Date(Date.now() + dto.durationHours * 60 * 60 * 1000)
      : null;

    const sanction = await this.prisma.userSanction.create({
      data: {
        userId: dto.userId,
        moderatorId: dto.moderatorId,
        sanctionType: dto.sanctionType,
        reason: dto.reason,
        durationHours: dto.durationHours,
        expiresAt,
        severity: dto.severity || 'medium',
        isAutomatic: dto.isAutomatic || false,
        evidence: dto.evidence
      },
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      }
    });

    return SanctionEntity.fromObject(sanction);
  }

  async findById(id: number): Promise<SanctionEntity | null> {
    const sanction = await this.prisma.userSanction.findUnique({
      where: { id },
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      }
    });

    return sanction ? SanctionEntity.fromObject(sanction) : null;
  }

  async findByUserId(userId: number, includeInactive?: boolean): Promise<SanctionEntity[]> {
    const sanctions = await this.prisma.userSanction.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sanctions.map(sanction => SanctionEntity.fromObject(sanction));
  }

  async findActiveSanctionsForUser(userId: number): Promise<SanctionEntity[]> {
    const sanctions = await this.prisma.userSanction.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null }, // Permanentes
          { expiresAt: { gt: new Date() } } // No expiradas
        ]
      },
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sanctions.map(sanction => SanctionEntity.fromObject(sanction));
  }

  async findMany(
    filters?: SanctionFilters,
    pagination?: SanctionPaginationOptions
  ): Promise<PaginatedSanctionsResult> {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.moderatorId) where.moderatorId = filters.moderatorId;
    if (filters?.sanctionType) where.sanctionType = filters.sanctionType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.severity) where.severity = filters.severity;

    // Ordenamiento
    const orderBy: any = {};
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [sanctions, total] = await Promise.all([
      this.prisma.userSanction.findMany({
        where,
        include: {
          user: { include: { role: true } },
          moderator: { include: { role: true } },
          revoker: { include: { role: true } }
        },
        orderBy,
        skip,
        take: limit
      }),
      this.prisma.userSanction.count({ where })
    ]);

    return {
      data: sanctions.map(sanction => SanctionEntity.fromObject(sanction)),
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

  async updateById(id: number, data: Partial<SanctionEntity>): Promise<SanctionEntity> {
    const updateData: any = {};
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.revokedAt !== undefined) updateData.revokedAt = data.revokedAt;
    if (data.revokedBy !== undefined) updateData.revokedBy = data.revokedBy;
    if (data.revokeReason !== undefined) updateData.revokeReason = data.revokeReason;

    const sanction = await this.prisma.userSanction.update({
      where: { id },
      data: updateData,
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      }
    });

    return SanctionEntity.fromObject(sanction);
  }

  async revoke(sanctionId: number, revokedBy: number, reason: string): Promise<SanctionEntity> {
    const sanction = await this.prisma.userSanction.update({
      where: { id: sanctionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason
      },
      include: {
        user: { include: { role: true } },
        moderator: { include: { role: true } },
        revoker: { include: { role: true } }
      }
    });

    return SanctionEntity.fromObject(sanction);
  }

  async deactivateExpiredSanctions(): Promise<number> {
    const result = await this.prisma.userSanction.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date()
        }
      },
      data: {
        isActive: false
      }
    });

    return result.count;
  }

  async countActiveSanctionsByType(sanctionType: SanctionType): Promise<number> {
    return await this.prisma.userSanction.count({
      where: {
        sanctionType,
        isActive: true
      }
    });
  }

  async getModerationStats(moderatorId?: number): Promise<any> {
    const where = moderatorId ? { moderatorId } : {};
    
    const [
      totalSanctions,
      activeSanctions,
      sanctionsByType,
      sanctionsBySeverity
    ] = await Promise.all([
      this.prisma.userSanction.count({ where }),
      this.prisma.userSanction.count({ where: { ...where, isActive: true } }),
      this.prisma.userSanction.groupBy({
        by: ['sanctionType'],
        where,
        _count: { id: true }
      }),
      this.prisma.userSanction.groupBy({
        by: ['severity'],
        where,
        _count: { id: true }
      })
    ]);

    return {
      totalSanctions,
      activeSanctions,
      sanctionsByType: sanctionsByType.reduce((acc, item) => {
        acc[item.sanctionType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      sanctionsBySeverity: sanctionsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}