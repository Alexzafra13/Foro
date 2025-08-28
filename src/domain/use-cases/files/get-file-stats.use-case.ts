// src/domain/use-cases/files/get-file-stats.use-case.ts
import { FileRepository } from '../../repositories/file.repository';
import { UserRepository } from '../../repositories/user.repository';
import { DomainError } from '../../../shared/errors';

interface GetFileStatsDto {
  requesterId: number;
  userId?: number; // Si se especifica, estadísticas de un usuario específico
}

interface FileStatsResponseDto {
  global?: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    totalSizeGB: number;
    filesByType: {
      avatar: number;
      post: number;
      comment: number;
    };
    averageFileSize: number;
    largestFileSize: number;
    totalUsers: number;
  };
  user?: {
    userId: number;
    username: string;
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    filesByType: {
      avatar: number;
      post: number;
      comment: number;
    };
    storageQuotaUsed: number; // Porcentaje del límite de 500MB
    maxFilesReached: boolean;
  };
  quotas: {
    maxFilesPerUser: number;
    maxStoragePerUserMB: number;
    maxFileSizeByType: {
      avatar: number;
      post: number;
      comment: number;
    };
  };
}

interface GetFileStatsUseCase {
  execute(dto: GetFileStatsDto): Promise<FileStatsResponseDto>;
}

export class GetFileStats implements GetFileStatsUseCase {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetFileStatsDto): Promise<FileStatsResponseDto> {
    const { requesterId, userId } = dto;

    // 1. Validar entrada
    this.validateInput(dto);

    // 2. Verificar permisos
    await this.validatePermissions(requesterId, userId);

    // 3. Obtener estadísticas según el caso
    const response: FileStatsResponseDto = {
      quotas: this.getQuotasInfo()
    };

    if (userId) {
      // Estadísticas de usuario específico
      response.user = await this.getUserStats(userId);
    } else {
      // Estadísticas globales (solo para admins)
      response.global = await this.getGlobalStats();
    }

    return response;
  }

  private validateInput(dto: GetFileStatsDto): void {
    if (!dto.requesterId || dto.requesterId <= 0) {
      throw new DomainError('Invalid requester ID', 400);
    }

    if (dto.userId && dto.userId <= 0) {
      throw new DomainError('Invalid user ID', 400);
    }
  }

  private async validatePermissions(requesterId: number, userId?: number): Promise<void> {
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw new DomainError('Requester not found', 404);
    }

    // Si pide estadísticas de un usuario específico
    if (userId) {
      // Puede ver sus propias estadísticas
      if (userId === requesterId) {
        return;
      }
      
      // Solo admins pueden ver estadísticas de otros usuarios
      if (requester.role?.name !== 'admin') {
        throw new DomainError('You do not have permission to view user statistics', 403);
      }
    } else {
      // Solo admins pueden ver estadísticas globales
      if (requester.role?.name !== 'admin') {
        throw new DomainError('You do not have permission to view global statistics', 403);
      }
    }
  }

  private async getUserStats(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainError(`User with id ${userId} not found`, 404);
    }

    const files = await this.fileRepository.getFilesByUploader(userId);
    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

    const filesByType = {
      avatar: 0,
      post: 0,
      comment: 0
    };

    files.forEach(file => {
      if (file.uploadType in filesByType) {
        filesByType[file.uploadType as keyof typeof filesByType]++;
      }
    });

    const maxStorageMB = 500; // 500MB de límite
    const storageQuotaUsed = Math.round((totalSizeMB / maxStorageMB) * 100);

    return {
      userId: user.id,
      username: user.username,
      totalFiles: files.length,
      totalSizeBytes,
      totalSizeMB,
      filesByType,
      storageQuotaUsed,
      maxFilesReached: files.length >= 100
    };
  }

  private async getGlobalStats() {
    const storageStats = await this.fileRepository.getStorageStats();
    const totalSizeMB = Math.round((storageStats.totalSize / (1024 * 1024)) * 100) / 100;
    const totalSizeGB = Math.round((totalSizeMB / 1024) * 100) / 100;

    // Obtener estadísticas adicionales
    const averageFileSize = storageStats.totalFiles > 0 
      ? Math.round(storageStats.totalSize / storageStats.totalFiles) 
      : 0;

    // Para obtener el archivo más grande, necesitaríamos una consulta adicional
    // Por simplicidad, usamos una estimación
    const largestFileSize = Math.round(averageFileSize * 5); // Estimación

    // Contar usuarios únicos que han subido archivos
    const totalUsers = await this.getTotalUsersWithFiles();

    return {
      totalFiles: storageStats.totalFiles,
      totalSizeBytes: storageStats.totalSize,
      totalSizeMB,
      totalSizeGB,
      filesByType: {
        avatar: storageStats.avatarCount,
        post: storageStats.postCount,
        comment: storageStats.commentCount
      },
      averageFileSize,
      largestFileSize,
      totalUsers
    };
  }

  private async getTotalUsersWithFiles(): Promise<number> {
    // Esta sería una consulta específica en el repositorio
    // Por ahora retornamos una estimación
    const storageStats = await this.fileRepository.getStorageStats();
    return Math.round(storageStats.totalFiles / 5); // Estimación: 5 archivos por usuario promedio
  }

  private getQuotasInfo() {
    return {
      maxFilesPerUser: 100,
      maxStoragePerUserMB: 500,
      maxFileSizeByType: {
        avatar: 5, // MB
        post: 10,  // MB
        comment: 5 // MB
      }
    };
  }
}