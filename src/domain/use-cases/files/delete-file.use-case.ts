// src/domain/use-cases/files/delete-file.use-case.ts
import { FileRepository } from '../../repositories/file.repository';
import { UserRepository } from '../../repositories/user.repository';
import { DomainError } from '../../../shared/errors';
import { sharpAdapter } from '../../../config/sharp.adapter';

interface DeleteFileDto {
  fileId: string;
  userId: number;
}

interface DeleteFileResponseDto {
  fileId: string;
  filename: string;
  uploadType: string;
  message: string;
  deletedAt: Date;
}

interface DeleteFileUseCase {
  execute(dto: DeleteFileDto): Promise<DeleteFileResponseDto>;
}

export class DeleteFile implements DeleteFileUseCase {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: DeleteFileDto): Promise<DeleteFileResponseDto> {
    const { fileId, userId } = dto;

    // 1. Validar entrada
    this.validateInput(dto);

    // 2. Buscar archivo
    const file = await this.fileRepository.getFileById(fileId);
    if (!file) {
      throw new DomainError('File not found', 404);
    }

    // 3. Verificar permisos
    await this.validatePermissions(file, userId);

    // 4. Eliminar archivo físico
    await this.deletePhysicalFile(file.path);

    // 5. Eliminar registro de base de datos
    await this.fileRepository.deleteFileRecord(fileId);

    // 6. Retornar respuesta
    return {
      fileId: file.id,
      filename: file.filename,
      uploadType: file.uploadType,
      message: `${this.getUploadTypeLabel(file.uploadType)} deleted successfully`,
      deletedAt: new Date()
    };
  }

  private validateInput(dto: DeleteFileDto): void {
    if (!dto.fileId || dto.fileId.trim().length === 0) {
      throw new DomainError('File ID is required', 400);
    }

    if (!dto.userId || dto.userId <= 0) {
      throw new DomainError('Invalid user ID', 400);
    }
  }

  private async validatePermissions(file: any, userId: number): Promise<void> {
    // El propietario siempre puede eliminar
    if (file.uploaderId === userId) {
      return;
    }

    // Los administradores pueden eliminar cualquier archivo
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainError('User not found', 404);
    }

    // Verificar si el usuario tiene rol y es admin
    if (user.role?.name === 'admin') {
      return;
    }

    // Los moderadores pueden eliminar archivos de posts y comentarios (no avatares)
    if (user.role?.name === 'moderator' && file.uploadType !== 'avatar') {
      return;
    }

    // Si llegamos aquí, no tiene permisos
    throw new DomainError('You do not have permission to delete this file', 403);
  }

  private async deletePhysicalFile(filePath: string): Promise<void> {
    try {
      await sharpAdapter.deleteImage(filePath);
    } catch (error) {
      // Log el error pero no fallar la eliminación del registro
      console.warn('Failed to delete physical file:', error);
    }
  }

  private getUploadTypeLabel(type: string): string {
    const labels = {
      avatar: 'Avatar',
      post: 'Post image', 
      comment: 'Comment image'
    };
    return labels[type as keyof typeof labels] || 'File';
  }
}