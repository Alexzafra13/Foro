// src/domain/repositories/file.repository.ts
import { FileEntity } from '../entities/file.entity';
import { FileFilters, PaginationOptions, PaginatedFileResult } from '../datasources/file.datasource';

export interface FileRepository {
  // Operaciones básicas CRUD
  saveFileRecord(file: FileEntity): Promise<FileEntity>;
  getFileById(id: string): Promise<FileEntity | null>;
  updateFileRecord(id: string, updates: Partial<FileEntity>): Promise<FileEntity>;
  deleteFileRecord(id: string): Promise<void>;

  // Consultas por usuario
  getFilesByUploader(uploaderId: number): Promise<FileEntity[]>;
  getFilesByUploaderPaginated(
    uploaderId: number,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult>;

  // Consultas por tipo de archivo
  getFilesByType(uploadType: 'avatar' | 'post' | 'comment'): Promise<FileEntity[]>;
  getAvatarByUserId(userId: number): Promise<FileEntity | null>;

  // Consultas con filtros
  findFiles(
    filters?: FileFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult>;

  // Estadísticas
  countFilesByUploader(uploaderId: number): Promise<number>;
  getTotalSizeByUploader(uploaderId: number): Promise<number>;
  getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    avatarCount: number;
    postCount: number;
    commentCount: number;
  }>;

  // Utilidades
  updateFileUrl(id: string, newUrl: string): Promise<FileEntity>;
  markFileAsOrphaned(id: string): Promise<void>;
  cleanupOrphanedFiles(): Promise<number>;
}