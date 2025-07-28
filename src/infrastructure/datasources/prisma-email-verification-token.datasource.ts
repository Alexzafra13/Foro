import { PrismaClient } from '@prisma/client';
import { 
  EmailVerificationTokenDatasource,
  CreateEmailVerificationTokenDto 
} from '../../domain/datasources/email-verification-token.datasource';
import { EmailVerificationTokenEntity } from '@/domain/entities/email-verification-token.entity'; 

export class PrismaEmailVerificationTokenDatasource implements EmailVerificationTokenDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateEmailVerificationTokenDto): Promise<EmailVerificationTokenEntity> {
    const token = await this.prisma.emailVerificationToken.create({
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

    return EmailVerificationTokenEntity.fromObject(token);
  }

  async findByToken(token: string): Promise<EmailVerificationTokenEntity | null> {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
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

    return verificationToken ? EmailVerificationTokenEntity.fromObject(verificationToken) : null;
  }

  async findByUserId(userId: number): Promise<EmailVerificationTokenEntity[]> {
    const tokens = await this.prisma.emailVerificationToken.findMany({
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

    return tokens.map(token => EmailVerificationTokenEntity.fromObject(token));
  }

  async markAsUsed(token: string): Promise<EmailVerificationTokenEntity> {
    const updatedToken = await this.prisma.emailVerificationToken.update({
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

    return EmailVerificationTokenEntity.fromObject(updatedToken);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  async deleteByUserId(userId: number): Promise<number> {
    const result = await this.prisma.emailVerificationToken.deleteMany({
      where: { userId }
    });

    return result.count;
  }
}