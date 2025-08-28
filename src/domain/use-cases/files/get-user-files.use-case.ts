// src/domain/use-cases/files/get-user-files.use-case.ts
import { FileRepository } from '../../repositories/file.repository';
import { UserRepository } from '../../repositories/user.repository';
import { DomainError } from '../../../shared/errors';
import { PaginationOptions, PaginatedFileResult } from '../../datasources/file.datasource';

interface GetUserFilesDto {
  userId: number;
  requesterId: number;
  uploadType?: 'avatar' | 'post' | 'comment';
  pagination?: PaginationOptions;
}

interface FileDto {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  sizeInMB: number;
  uploadType: string;
  createdAt: Date;
}

interface GetUserFilesResponseDto {
  files: FileDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    filesByType: {
      avatar: number;
      post: number;
      comment: number;
    };
  };
}

interface GetUserFilesUseCase {
  execute(dto: GetUserFilesDto): Promise<GetUserFilesResponseDto>;
}

export class GetUserFiles implements GetUserFilesUseCase {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GetUserFilesDto): Promise<GetUserFilesResponseDto> {
    const { userId, requesterId, uploadType, pagination } = dto;

    // 1. Validar entrada
    this.validateInput(dto);

    // 2. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainError(`User with id ${userId} not found`, 404);
    }

    // 3. Verificar permisos
    await this.validatePermissions(userId, requesterId);

    // 4. Obtener archivos paginados
    const result = await this.fileRepository.getFilesByUploaderPaginated(
      userId,
      pagination
    );

    // 5. Filtrar por tipo si se especifica
    let filteredFiles = result.data;
    if (uploadType) {
      filteredFiles = result.data.filter(file => file.uploadType === uploadType);
    }

    // 6. Obtener estadísticas del usuario
    const summary = await this.getUserFilesSummary(userId);

    // 7. Transformar archivos a DTO
    const filesDto: FileDto[] = filteredFiles.map(file => ({
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      url: file.url,
      mimetype: file.mimetype,
      size: file.size,
      sizeInMB: file.getSizeInMB(),
      uploadType: file.uploadType,
      createdAt: file.createdAt
    }));

    return {
      files: filesDto,
      pagination: result.pagination,
      summary
    };
  }

  private validateInput(dto: GetUserFilesDto): void {
    if (!dto.userId || dto.userId <= 0) {
      throw new DomainError('Invalid user ID', 400);
    }

    if (!dto.requesterId || dto.requesterId <= 0) {
      throw new DomainError('Invalid requester ID', 400);
    }

    if (dto.uploadType && !['avatar', 'post', 'comment'].includes(dto.uploadType)) {
      throw new DomainError('Invalid upload type', 400);
    }
  }

  private async validatePermissions(userId: number, requesterId: number): Promise<void> {
    // El usuario puede ver sus propios archivos
    if (userId === requesterId) {
      return;
    }

    // Los administradores pueden ver archivos de cualquier usuario
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw new DomainError('Requester not found', 404);
    }

    if (requester.role?.name === 'admin') {
      return;
    }

    // Los moderadores pueden ver archivos de posts y comentarios (no avatares)
    if (requester.role?.name === 'moderator') {
      return; // En este caso, filtraremos avatares en el resultado
    }

    // Si llegamos aquí, no tiene permisos
    throw new DomainError('You do not have permission to view these files', 403);
  }

  private async getUserFilesSummary(userId: number) {
    const allFiles = await this.fileRepository.getFilesByUploader(userId);
    
    const summary = {
      totalFiles: allFiles.length,
      totalSizeBytes: allFiles.reduce((sum, file) => sum + file.size, 0),
      totalSizeMB: 0,
      filesByType: {
        avatar: 0,
        post: 0,
        comment: 0
      }
    };

    // Calcular MB
    summary.totalSizeMB = Math.round((summary.totalSizeBytes / (1024 * 1024)) * 100) / 100;

    // Contar por tipo
    allFiles.forEach(file => {
      if (file.uploadType in summary.filesByType) {
        summary.filesByType[file.uploadType as keyof typeof summary.filesByType]++;
      }
    });

    return summary;
  }
}