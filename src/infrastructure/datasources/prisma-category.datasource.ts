import { PrismaClient } from '@prisma/client';

export class PrismaCategoryDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<any[]> {
    return await this.prisma.category.findMany({
      where: {
        isVisible: true
      },
      include: {
        channels: {
          where: {
            isVisible: true
          },
          orderBy: {
            position: 'asc'
          },
          include: {
            _count: {
              select: {
                posts: true,
                members: true
              }
            }
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });
  }

  async findById(id: number): Promise<any | null> {
    return await this.prisma.category.findUnique({
      where: { id },
      include: {
        channels: {
          where: {
            isVisible: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });
  }
}