import { PrismaClient } from '@prisma/client';
import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';

export interface CreatePasswordResetTokenDto {
  userId: number;
  token: string;
  expiresAt: Date;
}

export abstract class PasswordResetTokenDatasource {
  abstract create(createDto: CreatePasswordResetTokenDto): Promise<PasswordResetTokenEntity>;
  abstract findByToken(token: string): Promise<PasswordResetTokenEntity | null>;
  abstract findByUserId(userId: number): Promise<PasswordResetTokenEntity[]>;
  abstract markAsUsed(token: string): Promise<PasswordResetTokenEntity>;
  abstract deleteExpired(): Promise<number>;
  abstract deleteByUserId(userId: number): Promise<number>;
}

export class PrismaPasswordResetTokenDatasource implements PasswordResetTokenDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreatePasswordResetTokenDto): Promise<PasswordResetTokenEntity> {
    const token = await this.prisma.passwordResetToken.create({
      data: createDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    });

    return PasswordResetTokenEntity.fromObject(token);
  }

  async findByToken(token: string): Promise<PasswordResetTokenEntity | null> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    });

    return resetToken ? PasswordResetTokenEntity.fromObject(resetToken) : null;
  }

  async findByUserId(userId: number): Promise<PasswordResetTokenEntity[]> {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return tokens.map(token => PasswordResetTokenEntity.fromObject(token));
  }

  async markAsUsed(token: string): Promise<PasswordResetTokenEntity> {
    const updatedToken = await this.prisma.passwordResetToken.update({
      where: { token },
      data: {
        usedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    });

    return PasswordResetTokenEntity.fromObject(updatedToken);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  async deleteByUserId(userId: number): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: { userId }
    });

    return result.count;
  }
}