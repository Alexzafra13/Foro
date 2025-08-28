// src/presentation/middlewares/upload.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { multerAdapter } from '../../config/multer.adapter';
import { sharpAdapter } from '../../config/sharp.adapter';

// Extender Request para incluir processedFile
declare global {
  namespace Express {
    interface Request {
      processedFile?: {
        originalName: string;
        filename: string;
        path: string;
        url: string;
        mimetype: string;
        size: number;
        uploadType: string;
      };
    }
  }
}

export class UploadMiddleware {
  // Middleware de Multer para subir archivo
  static uploadSingle = multerAdapter.single('file');

  // Middleware para procesar imagen según tipo
  static processImage(uploadType: 'avatar' | 'post' | 'comment') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Verificar que hay archivo
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file provided',
            message: 'Please select an image to upload'
          });
        }

        // Validar que el tipo de upload es válido
        if (!['avatar', 'post', 'comment'].includes(uploadType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid upload type',
            message: 'Upload type must be avatar, post, or comment'
          });
        }

        // Procesar imagen usando Sharp adapter
        const processedFile = await sharpAdapter.processImage({
          uploadType,
          buffer: req.file.buffer,
          originalName: req.file.originalname
        });

        // Agregar info procesada al request
        req.processedFile = processedFile;

        console.log(`✅ Image processed: ${uploadType} - ${processedFile.filename}`);
        next();
      } catch (error) {
        console.error('❌ Error processing image:', error);
        
        // Error específico de Sharp
        if (error instanceof Error && error.message.includes('Input file')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid image file',
            message: 'The uploaded file is not a valid image'
          });
        }

        // Error de tamaño
        if (error instanceof Error && error.message.includes('File too large')) {
          return res.status(413).json({
            success: false,
            error: 'File too large',
            message: 'Image file is too large. Maximum size allowed is 10MB'
          });
        }

        // Error genérico
        return res.status(500).json({
          success: false,
          error: 'Image processing failed',
          message: 'Failed to process the uploaded image'
        });
      }
    };
  }

  // Middleware para validar permisos de upload - SIN REPUTACIÓN
  static validateUploadPermissions(uploadType: 'avatar' | 'post' | 'comment') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'You must be logged in to upload files'
          });
        }

        // Verificar si el usuario está baneado
        if (user.isBanned) {
          return res.status(403).json({
            success: false,
            error: 'Account banned',
            message: 'Banned users cannot upload files'
          });
        }

        // Verificar si el usuario está silenciado (no puede subir imágenes de posts/comentarios)
        if (user.isSilenced && uploadType !== 'avatar') {
          return res.status(403).json({
            success: false,
            error: 'Account silenced',
            message: 'Silenced users can only update their avatar'
          });
        }

        // Validaciones específicas por tipo
        if (uploadType === 'avatar') {
          // Cualquier usuario verificado puede subir avatar
          if (!user.isEmailVerified) {
            return res.status(403).json({
              success: false,
              error: 'Email not verified',
              message: 'You must verify your email before uploading an avatar'
            });
          }
        }
        // Para posts y comentarios, solo verificamos que esté autenticado y no baneado/silenciado
        // (ya validado arriba)

        next();
      } catch (error) {
        console.error('❌ Error validating upload permissions:', error);
        return res.status(500).json({
          success: false,
          error: 'Permission validation failed',
          message: 'Failed to validate upload permissions'
        });
      }
    };
  }

  // Middleware para manejar errores de Multer
  static handleMulterError(error: any, req: Request, res: Response, next: NextFunction) {
    if (error) {
      console.error('❌ Multer error:', error);

      // Error de tamaño de archivo
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File too large',
          message: 'File size cannot exceed 10MB'
        });
      }

      // Error de tipo de archivo
      if (error.message === 'Solo se permiten archivos de imagen') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'Only image files are allowed (JPG, PNG, GIF, WebP)'
        });
      }

      // Error de límite de archivos
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: 'Only one file can be uploaded at a time'
        });
      }

      // Error genérico de Multer
      return res.status(400).json({
        success: false,
        error: 'Upload failed',
        message: error.message || 'File upload failed'
      });
    }

    next();
  }
}