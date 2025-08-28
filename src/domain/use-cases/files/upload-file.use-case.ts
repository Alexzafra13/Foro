// src/domain/use-cases/files/upload-file.use-case.ts
import { FileRepository } from '../../repositories/file.repository';
import { UserRepository } from '../../repositories/user.repository';
import { FileEntity } from '../../entities/file.entity';
import { ValidationErrors, DomainError } from '../../../shared/errors';

interface UploadFileDto {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  uploadType: 'avatar' | 'post' | 'comment';
  uploaderId: number;
}

interface UploadFileResponseDto {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadType: string;
  uploaderId: number;
  createdAt: Date;
  message: string;
}

interface UploadFileUseCase {
  execute(dto: UploadFileDto): Promise<UploadFileResponseDto>;
}

export class UploadFile implements UploadFileUseCase {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: UploadFileDto): Promise<UploadFileResponseDto> {
    // 1. Validar datos de entrada
    this.validateInput(dto);

    // 2. Verificar que el usuario existe
    const user = await this.userRepository.findById(dto.uploaderId);
    if (!user) {
      throw new DomainError(`User with id ${dto.uploaderId} not found`, 404);
    }

    // 3. Validar límites del archivo
    await this.validateFileLimits(dto);

    // 4. Si es avatar, eliminar avatar anterior
    if (dto.uploadType === 'avatar') {
      await this.replaceExistingAvatar(dto.uploaderId);
    }

    // 5. Crear entidad de archivo
    const fileEntity = new FileEntity(
      crypto.randomUUID(),
      dto.originalName,
      dto.filename,
      dto.path,
      dto.url,
      dto.mimetype,
      dto.size,
      dto.uploadType,
      dto.uploaderId,
      new Date()
    );

    // 6. Guardar en base de datos
    const savedFile = await this.fileRepository.saveFileRecord(fileEntity);

    // 7. Retornar respuesta
    return {
      id: savedFile.id,
      filename: savedFile.filename,
      url: savedFile.url,
      size: savedFile.size,
      uploadType: savedFile.uploadType,
      uploaderId: savedFile.uploaderId,
      createdAt: savedFile.createdAt,
      message: `${this.getUploadTypeLabel(dto.uploadType)} uploaded successfully`
    };
  }

  private validateInput(dto: UploadFileDto): void {
    if (!dto.originalName || dto.originalName.trim().length === 0) {
      throw ValidationErrors.requiredField('Original filename');
    }

    if (!dto.filename || dto.filename.trim().length === 0) {
      throw ValidationErrors.requiredField('Filename');
    }

    if (!dto.path || dto.path.trim().length === 0) {
      throw ValidationErrors.requiredField('File path');
    }

    if (!dto.url || dto.url.trim().length === 0) {
      throw ValidationErrors.requiredField('File URL');
    }

    if (!dto.mimetype || dto.mimetype.trim().length === 0) {
      throw ValidationErrors.requiredField('File mimetype');
    }

    if (dto.size <= 0) {
      throw ValidationErrors.invalidInput('File size must be greater than 0');
    }

    if (dto.uploaderId <= 0) {
      throw ValidationErrors.invalidInput('Invalid uploader ID');
    }

    if (!FileEntity.isValidUploadType(dto.uploadType)) {
      throw ValidationErrors.invalidFormat('Upload type', 'avatar, post, or comment');
    }

    // Validar tipos MIME permitidos
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/webp',
      'image/gif'
    ];

    if (!allowedMimeTypes.includes(dto.mimetype.toLowerCase())) {
      throw ValidationErrors.invalidFormat('File type', 'image file (jpg, png, webp, gif)');
    }
  }

  private async validateFileLimits(dto: UploadFileDto): Promise<void> {
    // Límites de tamaño por tipo
    const maxSizes = {
      avatar: 5 * 1024 * 1024,    // 5MB
      post: 10 * 1024 * 1024,     // 10MB  
      comment: 5 * 1024 * 1024    // 5MB
    };

    if (dto.size > maxSizes[dto.uploadType]) {
      const maxSizeMB = maxSizes[dto.uploadType] / (1024 * 1024);
      throw ValidationErrors.maxLength(
        `${this.getUploadTypeLabel(dto.uploadType)} size`, 
        maxSizes[dto.uploadType]
      );
    }

    // Validar límites por usuario (opcional - para evitar abuso)
    const userFileCount = await this.fileRepository.countFilesByUploader(dto.uploaderId);
    const userTotalSize = await this.fileRepository.getTotalSizeByUploader(dto.uploaderId);

    // Límite de 100 archivos por usuario
    if (userFileCount >= 100) {
      throw new DomainError('Maximum number of files reached (100)', 409);
    }

    // Límite de 500MB total por usuario
    const maxUserStorage = 500 * 1024 * 1024; // 500MB
    if (userTotalSize + dto.size > maxUserStorage) {
      throw new DomainError('Storage quota exceeded (500MB)', 409);
    }
  }

  private async replaceExistingAvatar(userId: number): Promise<void> {
    try {
      const existingAvatar = await this.fileRepository.getAvatarByUserId(userId);
      if (existingAvatar) {
        // Eliminar archivo anterior
        await this.fileRepository.deleteFileRecord(existingAvatar.id);
      }
    } catch (error) {
      // Log el error pero no fallar la subida
      console.warn('Failed to delete existing avatar:', error);
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