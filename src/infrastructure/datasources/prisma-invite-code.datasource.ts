import { PrismaClient } from '@prisma/client';
import { 
  InviteCodeDatasource,
  CreateInviteCodeDto,
  UseInviteCodeDto,
  InviteCodeFilters
} from '../../domain/datasources/invite-code.datasource';
import { InviteCodeEntity } from '../../domain/entities/invite-code.entity';

export class PrismaInviteCodeDatasource implements InviteCodeDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateInviteCodeDto): Promise<InviteCodeEntity> {
    const inviteCode = await this.prisma.inviteCode.create({
      data: createDto,
      include: {
        creator: {
          include: { role: true }
        },
        user: true
      }
    });

    return InviteCodeEntity.fromObject({
      ...inviteCode,
      creator: inviteCode.creator ? {
        id: inviteCode.creator.id,
        username: inviteCode.creator.username,
        role: inviteCode.creator.role.name
      } : undefined
    });
  }

  async findByCode(code: string): Promise<InviteCodeEntity | null> {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { code },
      include: {
        creator: {
          include: { role: true }
        },
        user: true
      }
    });

    if (!inviteCode) return null;

    return InviteCodeEntity.fromObject({
      ...inviteCode,
      creator: inviteCode.creator ? {
        id: inviteCode.creator.id,
        username: inviteCode.creator.username,
        role: inviteCode.creator.role.name
      } : undefined,
      user: inviteCode.user ? {
        id: inviteCode.user.id,
        username: inviteCode.user.username
      } : undefined
    });
  }

  async findMany(filters?: InviteCodeFilters): Promise<InviteCodeEntity[]> {
    const where = this.buildWhereClause(filters);

    const inviteCodes = await this.prisma.inviteCode.findMany({
      where,
      include: {
        creator: {
          include: { role: true }
        },
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return inviteCodes.map(inviteCode => 
      InviteCodeEntity.fromObject({
        ...inviteCode,
        creator: inviteCode.creator ? {
          id: inviteCode.creator.id,
          username: inviteCode.creator.username,
          role: inviteCode.creator.role.name
        } : undefined,
        user: inviteCode.user ? {
          id: inviteCode.user.id,
          username: inviteCode.user.username
        } : undefined
      })
    );
  }

  async markAsUsed(code: string, usedBy: number): Promise<InviteCodeEntity> {
    const inviteCode = await this.prisma.inviteCode.update({
      where: { code },
      data: {
        usedBy,
        usedAt: new Date()
      },
      include: {
        creator: {
          include: { role: true }
        },
        user: true
      }
    });

    return InviteCodeEntity.fromObject({
      ...inviteCode,
      creator: inviteCode.creator ? {
        id: inviteCode.creator.id,
        username: inviteCode.creator.username,
        role: inviteCode.creator.role.name
      } : undefined,
      user: inviteCode.user ? {
        id: inviteCode.user.id,
        username: inviteCode.user.username
      } : undefined
    });
  }

  async deleteByCode(code: string): Promise<InviteCodeEntity> {
    const inviteCode = await this.prisma.inviteCode.delete({
      where: { code },
      include: {
        creator: {
          include: { role: true }
        },
        user: true
      }
    });

    return InviteCodeEntity.fromObject({
      ...inviteCode,
      creator: inviteCode.creator ? {
        id: inviteCode.creator.id,
        username: inviteCode.creator.username,
        role: inviteCode.creator.role.name
      } : undefined
    });
  }

  async getStats(createdBy?: number): Promise<{
    total: number;
    used: number;
    available: number;
    expired: number;
  }> {
    const where = createdBy ? { createdBy } : {};

    const [total, used] = await Promise.all([
      this.prisma.inviteCode.count({ where }),
      this.prisma.inviteCode.count({ 
        where: { 
          ...where, 
          usedBy: { not: null } 
        } 
      })
    ]);

    // Para calcular expirados, necesitamos obtener todos y verificar fecha
    const allCodes = await this.prisma.inviteCode.findMany({
      where,
      select: { createdAt: true, usedBy: true }
    });

    const now = new Date();
    const expired = allCodes.filter(code => {
      if (code.usedBy) return false; // No contar usados como expirados
      
      const expirationDate = new Date(code.createdAt);
      expirationDate.setDate(expirationDate.getDate() + 7);
      
      return now > expirationDate;
    }).length;

    const available = total - used - expired;

    return {
      total,
      used,
      available: Math.max(0, available),
      expired
    };
  }

  private buildWhereClause(filters?: InviteCodeFilters) {
    const where: any = {};

    if (filters?.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters?.isUsed !== undefined) {
      if (filters.isUsed) {
        where.usedBy = { not: null };
      } else {
        where.usedBy = null;
      }
    }

    // Para expired necesitaríamos lógica más compleja con SQL raw
    // Por simplicidad, lo manejamos en la aplicación por ahora

    return where;
  }
}