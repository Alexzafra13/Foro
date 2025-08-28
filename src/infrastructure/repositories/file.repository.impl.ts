// src/infrastructure/repositories/file.repository.impl.ts
import { FileRepository } from '../../domain/repositories/file.repository';
import { FileDatasource, FileFilters, PaginationOptions, PaginatedFileResult } from '../../domain/datasources/file.datasource';
import { FileEntity } from '../../domain/entities/file.entity';

export class FileRepositoryImpl implements FileRepository {
  constructor(private readonly datasource: FileDatasource) {}

  // ===== OPERACIONES BÁSICAS CRUD =====

  async saveFileRecord(file: FileEntity): Promise<FileEntity> {
    return await this.datasource.create({
      originalName: file.originalName,
      filename: file.filename,
      path: file.path,
      url: file.url,
      mimetype: file.mimetype,
      size: file.size,
      uploadType: file.uploadType,
      uploaderId: file.uploaderId
    });
  }

  async getFileById(id: string): Promise<FileEntity | null> {
    return await this.datasource.findById(id);
  }

  async updateFileRecord(id: string, updates: Partial<FileEntity>): Promise<FileEntity> {
    const updateDto: any = {};
    
    if (updates.url !== undefined) updateDto.url = updates.url;
    if (updates.path !== undefined) updateDto.path = updates.path;

    return await this.datasource.updateById(id, updateDto);
  }

  async deleteFileRecord(id: string): Promise<void> {
    await this.datasource.deleteById(id);
  }

  // ===== CONSULTAS POR USUARIO =====

  async getFilesByUploader(uploaderId: number): Promise<FileEntity[]> {
    return await this.datasource.findByUploader(uploaderId);
  }

  async getFilesByUploaderPaginated(
    uploaderId: number,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult> {
    return await this.datasource.findMany(
      { uploaderId },
      pagination
    );
  }

  // ===== CONSULTAS POR TIPO DE ARCHIVO =====

  async getFilesByType(uploadType: 'avatar' | 'post' | 'comment'): Promise<FileEntity[]> {
    const result = await this.datasource.findMany({ uploadType });
    return result.data;
  }

  async getAvatarByUserId(userId: number): Promise<FileEntity | null> {
    const result = await this.datasource.findMany(
      { 
        uploaderId: userId, 
        uploadType: 'avatar' 
      },
      { limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    return result.data.length > 0 ? result.data[0] : null;
  }

  // ===== CONSULTAS CON FILTROS =====

  async findFiles(
    filters?: FileFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedFileResult> {
    return await this.datasource.findMany(filters, pagination);
  }

  // ===== ESTADÍSTICAS =====

  async countFilesByUploader(uploaderId: number): Promise<number> {
    return await this.datasource.countByUploader(uploaderId);
  }

  async getTotalSizeByUploader(uploaderId: number): Promise<number> {
    return await this.datasource.getTotalSizeByUploader(uploaderId);
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    avatarCount: number;
    postCount: number;
    commentCount: number;
  }> {
    // Obtener estadísticas por tipo
    const [avatarResult, postResult, commentResult] = await Promise.all([
      this.datasource.findMany({ uploadType: 'avatar' }),
      this.datasource.findMany({ uploadType: 'post' }),
      this.datasource.findMany({ uploadType: 'comment' })
    ]);

    // Calcular totales
    const avatarStats = this.calculateStats(avatarResult.data);
    const postStats = this.calculateStats(postResult.data);
    const commentStats = this.calculateStats(commentResult.data);

    return {
      totalFiles: avatarStats.count + postStats.count + commentStats.count,
      totalSize: avatarStats.size + postStats.size + commentStats.size,
      avatarCount: avatarStats.count,
      postCount: postStats.count,
      commentCount: commentStats.count
    };
  }

  private calculateStats(files: FileEntity[]): { count: number; size: number } {
    return {
      count: files.length,
      size: files.reduce((sum, file) => sum + file.size, 0)
    };
  }

  // ===== UTILIDADES =====

  async updateFileUrl(id: string, newUrl: string): Promise<FileEntity> {
    return await this.datasource.updateById(id, { url: newUrl });
  }

  async markFileAsOrphaned(id: string): Promise<void> {
    // En una implementación más compleja, podrías marcar archivos como huérfanos
    // Por ahora, simplemente agregamos un comentario para referencia futura
    
    // Opcional: Podrías agregar un campo `isOrphaned` al schema
    // await this.datasource.updateById(id, { isOrphaned: true });
    
    console.log(`File ${id} marked as orphaned`);
  }

  async cleanupOrphanedFiles(): Promise<number> {
    // Esta sería una implementación más compleja que:
    // 1. Encuentra archivos que no están referenciados
    // 2. Los elimina físicamente y de la BD
    
    // Por ahora retornamos 0, pero en el futuro se implementaría:
    /*
    const orphanedFiles = await this.findOrphanedFiles();
    let cleanedCount = 0;
    
    for (const file of orphanedFiles) {
      try {
        await sharpAdapter.deleteImage(file.path);
        await this.deleteFileRecord(file.id);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup file ${file.id}:`, error);
      }
    }
    
    return cleanedCount;
    */
    
    return 0;
  }

  // Método privado para futuras implementaciones
  private async findOrphanedFiles(): Promise<FileEntity[]> {
    // Implementación futura: encontrar archivos sin referencias
    // Requeriría consultas complejas para verificar que no están siendo usados
    return [];
  }
}