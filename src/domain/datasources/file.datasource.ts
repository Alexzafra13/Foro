// src/domain/datasources/file.datasource.ts
import { FileEntity } from '../entities/file.entity';

export interface CreateFileDto {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  uploadType: 'avatar' | 'post' | 'comment';
  uploaderId: number;
}

export interface UpdateFileDto {
  url?: string;
  path?: string;
}

export interface FileFilters {
  uploaderId?: number;
  uploadType?: 'avatar' | 'post' | 'comment';
  mimetype?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'size' | 'originalName';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedFileResult {
  data: FileEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class FileDatasource {
  abstract create(createFileDto: CreateFileDto): Promise<FileEntity>;
  abstract findById(id: string): Promise<FileEntity | null>;
  abstract findByUploader(uploaderId: number): Promise<FileEntity[]>;
  abstract findMany(
    filters?: FileFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult>;
  abstract updateById(id: string, updateDto: UpdateFileDto): Promise<FileEntity>;
  abstract deleteById(id: string): Promise<void>;
  abstract countByUploader(uploaderId: number): Promise<number>;
  abstract getTotalSizeByUploader(uploaderId: number): Promise<number>;
}