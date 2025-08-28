// src/infrastructure/datasources/prisma-file.datasource.ts
import { PrismaClient } from '@prisma/client';
import { FileDatasource, CreateFileDto, UpdateFileDto, FileFilters, PaginationOptions, PaginatedFileResult } from '../../domain/datasources/file.datasource';
import { FileEntity } from '../../domain/entities/file.entity';

export class PrismaFileDatasource extends FileDatasource {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  async create(createFileDto: CreateFileDto): Promise<FileEntity> {
    const file = await this.prisma.file.create({
      data: {
        id: crypto.randomUUID(),
        originalName: createFileDto.originalName,
        filename: createFileDto.filename,
        path: createFileDto.path,
        url: createFileDto.url,
        mimetype: createFileDto.mimetype,
        size: createFileDto.size,
        uploadType: createFileDto.uploadType,
        uploaderId: createFileDto.uploaderId
      }
    });

    return new FileEntity(
      file.id,
      file.originalName,
      file.filename,
      file.path,
      file.url,
      file.mimetype,
      file.size,
      file.uploadType as 'avatar' | 'post' | 'comment',
      file.uploaderId,
      file.createdAt
    );
  }

  async findById(id: string): Promise<FileEntity | null> {
    const file = await this.prisma.file.findUnique({
      where: { id }
    });

    if (!file) return null;

    return new FileEntity(
      file.id,
      file.originalName,
      file.filename,
      file.path,
      file.url,
      file.mimetype,
      file.size,
      file.uploadType as 'avatar' | 'post' | 'comment',
      file.uploaderId,
      file.createdAt
    );
  }

  async findByUploader(uploaderId: number): Promise<FileEntity[]> {
    const files = await this.prisma.file.findMany({
      where: { uploaderId },
      orderBy: { createdAt: 'desc' }
    });

    return files.map(file => new FileEntity(
      file.id,
      file.originalName,
      file.filename,
      file.path,
      file.url,
      file.mimetype,
      file.size,
      file.uploadType as 'avatar' | 'post' | 'comment',
      file.uploaderId,
      file.createdAt
    ));
  }

  async findMany(
    filters?: FileFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult> {
    const where: any = {};

    // Aplicar filtros
    if (filters?.uploaderId) {
      where.uploaderId = filters.uploaderId;
    }

    if (filters?.uploadType) {
      where.uploadType = filters.uploadType;
    }

    if (filters?.mimetype) {
      where.mimetype = {
        contains: filters.mimetype,
        mode: 'insensitive'
      };
    }

    if (filters?.createdAfter) {
      where.createdAt = {
        ...where.createdAt,
        gte: filters.createdAfter
      };
    }

    if (filters?.createdBefore) {
      where.createdAt = {
        ...where.createdAt,
        lte: filters.createdBefore
      };
    }

    // Configurar paginación
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100); // Máximo 100
    const skip = (page - 1) * limit;

    // Configurar ordenación
    const orderBy: any = {};
    const sortBy = pagination?.sortBy || 'createdAt';
    const sortOrder = pagination?.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    // Ejecutar consultas
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy,
        skip,
        take: limit
      }),
      this.prisma.file.count({ where })
    ]);

    // Transformar a entidades
    const fileEntities = files.map(file => new FileEntity(
      file.id,
      file.originalName,
      file.filename,
      file.path,
      file.url,
      file.mimetype,
      file.size,
      file.uploadType as 'avatar' | 'post' | 'comment',
      file.uploaderId,
      file.createdAt
    ));

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: fileEntities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }

  async updateById(id: string, updateDto: UpdateFileDto): Promise<FileEntity> {
    const updatedFile = await this.prisma.file.update({
      where: { id },
      data: updateDto
    });

    return new FileEntity(
      updatedFile.id,
      updatedFile.originalName,
      updatedFile.filename,
      updatedFile.path,
      updatedFile.url,
      updatedFile.mimetype,
      updatedFile.size,
      updatedFile.uploadType as 'avatar' | 'post' | 'comment',
      updatedFile.uploaderId,
      updatedFile.createdAt
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.file.delete({
      where: { id }
    });
  }

  async countByUploader(uploaderId: number): Promise<number> {
    return await this.prisma.file.count({
      where: { uploaderId }
    });
  }

  async getTotalSizeByUploader(uploaderId: number): Promise<number> {
    const result = await this.prisma.file.aggregate({
      where: { uploaderId },
      _sum: {
        size: true
      }
    });

    return result._sum.size || 0;
  }
}