// src/config/sharp.adapter.ts
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface ProcessImageConfig {
  uploadType: 'avatar' | 'post' | 'comment';
  buffer: Buffer;
  originalName: string;
}

interface ProcessedImage {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  uploadType: string;
}

export const sharpAdapter = {
  async processImage(config: ProcessImageConfig): Promise<ProcessedImage> {
    const { uploadType, buffer, originalName } = config;

    // Configuración por tipo
    const settings = {
      avatar: { size: 200, quality: 80 },
      post: { size: 800, quality: 85 },
      comment: { size: 400, quality: 80 }
    };

    // Crear directorio
    const uploadDir = path.join(process.cwd(), 'uploads', uploadType);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generar nombre único
    const filename = `${uploadType}-${uuidv4()}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Procesar imagen
    const processedBuffer = await sharp(buffer)
      .resize(settings[uploadType].size, settings[uploadType].size, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: settings[uploadType].quality })
      .toBuffer();

    // Guardar archivo
    fs.writeFileSync(filepath, processedBuffer);

    return {
      originalName,
      filename,
      path: filepath,
      url: `/uploads/${uploadType}/${filename}`,
      mimetype: 'image/webp',
      size: buffer.length,
      uploadType
    };
  },

  async deleteImage(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete image:', error);
    }
  }
};