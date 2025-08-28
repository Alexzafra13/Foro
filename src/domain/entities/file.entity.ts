// src/domain/entities/file.entity.ts
export class FileEntity {
  constructor(
    public readonly id: string,
    public readonly originalName: string,
    public readonly filename: string,
    public readonly path: string,
    public readonly url: string,
    public readonly mimetype: string,
    public readonly size: number,
    public readonly uploadType: 'avatar' | 'post' | 'comment',
    public readonly uploaderId: number,
    public readonly createdAt: Date
  ) {}

  // Métodos de utilidad
  isImage(): boolean {
    return this.mimetype.startsWith('image/');
  }

  getFileExtension(): string {
    return this.filename.split('.').pop() || '';
  }

  getSizeInMB(): number {
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }

  isOwnedBy(userId: number): boolean {
    return this.uploaderId === userId;
  }

  // Método estático para validar tipo de upload
  static isValidUploadType(type: string): type is 'avatar' | 'post' | 'comment' {
    return ['avatar', 'post', 'comment'].includes(type);
  }
}