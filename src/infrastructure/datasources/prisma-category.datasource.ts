import { PrismaClient } from '@prisma/client';
import { CategoryDatasource } from '../../domain/datasources/category.datasource';
import { CategoryEntity } from '../../domain/entities/category.entity';

export class PrismaCategoryDatasource implements CategoryDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<CategoryEntity[]> {
    const categories = await this.prisma.category.findMany({
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

    return categories.map(category => CategoryEntity.fromObject(category));
  }

  async findById(id: number): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({
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

    return category ? CategoryEntity.fromObject(category) : null;
  }

  async findWithChannels(): Promise<CategoryEntity[]> {
    return this.findAll();
  }
}