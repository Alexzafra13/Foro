// src/presentation/controllers/upload.controller.ts
import { Request, Response } from 'express';
import { UploadFile } from '../../domain/use-cases/files/upload-file.use-case';
import { DeleteFile } from '../../domain/use-cases/files/delete-file.use-case';
import { GetUserFiles } from '../../domain/use-cases/files/get-user-files.use-case';
import { GetFileStats } from '../../domain/use-cases/files/get-file-stats.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class UploadController {
  constructor(
    private readonly uploadFile: UploadFile,
    private readonly deleteFile: DeleteFile,
    private readonly getUserFiles: GetUserFiles,
    private readonly getFileStats: GetFileStats
  ) {}

  // POST /api/upload/{avatar|post|comment}
  async upload(req: Request, res: Response) {
    try {
      const uploaderId = req.user?.userId!;
      const processedFile = req.processedFile;

      if (!processedFile) {
        return res.status(400).json({
          success: false,
          error: 'No processed file found',
          message: 'File processing failed'
        });
      }

      console.log(`📤 Upload request: ${processedFile.uploadType} by user ${uploaderId}`);

      const result = await this.uploadFile.execute({
        originalName: processedFile.originalName,
        filename: processedFile.filename,
        path: processedFile.path,
        url: processedFile.url,
        mimetype: processedFile.mimetype,
        size: processedFile.size,
        uploadType: processedFile.uploadType as 'avatar' | 'post' | 'comment',
        uploaderId
      });

      console.log(`✅ Upload successful: ${result.filename}`);

      res.status(201).json({
        success: true,
        data: {
          id: result.id,
          url: result.url,
          filename: result.filename,
          uploadType: result.uploadType,
          size: result.size,
          createdAt: result.createdAt
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error uploading file');
    }
  }

  // DELETE /api/upload/:fileId
  async delete(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const userId = req.user?.userId!;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID is required',
          message: 'Please provide a valid file ID'
        });
      }

      console.log(`🗑️ Delete request: file ${fileId} by user ${userId}`);

      const result = await this.deleteFile.execute({
        fileId,
        userId
      });

      console.log(`✅ Delete successful: ${result.filename}`);

      res.json({
        success: true,
        data: {
          fileId: result.fileId,
          filename: result.filename,
          uploadType: result.uploadType,
          deletedAt: result.deletedAt
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error deleting file');
    }
  }

  // GET /api/upload/user/:userId/files
  async getFilesForUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const requesterId = req.user?.userId!;
      const { uploadType, page, limit } = req.query;

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          message: 'User ID must be a valid number'
        });
      }

      console.log(`📁 Get user files: user ${userId} requested by ${requesterId}`);

      const result = await this.getUserFiles.execute({
        userId,
        requesterId,
        uploadType: uploadType as 'avatar' | 'post' | 'comment' | undefined,
        pagination: {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined
        }
      });

      res.json({
        success: true,
        data: result.files,
        pagination: result.pagination,
        summary: result.summary,
        message: `Found ${result.files.length} files`
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting user files');
    }
  }

  // GET /api/upload/my-files
  async getMyFiles(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { uploadType, page, limit } = req.query;

      console.log(`📁 Get my files: user ${userId}`);

      const result = await this.getUserFiles.execute({
        userId,
        requesterId: userId, // Usuario pidiendo sus propios archivos
        uploadType: uploadType as 'avatar' | 'post' | 'comment' | undefined,
        pagination: {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined
        }
      });

      res.json({
        success: true,
        data: result.files,
        pagination: result.pagination,
        summary: result.summary,
        message: `You have ${result.summary.totalFiles} files uploaded`
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting your files');
    }
  }

  // GET /api/upload/stats
  async getStats(req: Request, res: Response) {
    try {
      const requesterId = req.user?.userId!;
      const { userId } = req.query;

      console.log(`📊 Get stats: requested by user ${requesterId}`);

      const result = await this.getFileStats.execute({
        requesterId,
        userId: userId ? parseInt(userId as string) : undefined
      });

      const message = userId 
        ? `Statistics for user ${userId}`
        : 'Global file statistics';

      res.json({
        success: true,
        data: result,
        message
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting file statistics');
    }
  }

  // GET /api/upload/my-stats
  async getMyStats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;

      console.log(`📊 Get my stats: user ${userId}`);

      const result = await this.getFileStats.execute({
        requesterId: userId,
        userId // Pidiendo sus propias estadísticas
      });

      res.json({
        success: true,
        data: result,
        message: 'Your file statistics'
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting your statistics');
    }
  }

  // GET /api/upload/health
  async healthCheck(req: Request, res: Response) {
    try {
      const uploadsPath = process.cwd() + '/uploads';
      const fs = require('fs');
      
      const directories = ['avatars', 'posts', 'comments'].map(dir => {
        const path = `${uploadsPath}/${dir}`;
        const exists = fs.existsSync(path);
        return { directory: dir, exists, path };
      });

      res.json({
        success: true,
        data: {
          uploadPath: uploadsPath,
          directories,
          timestamp: new Date().toISOString()
        },
        message: 'Upload system health check'
      });
    } catch (error) {
      this.handleError(error, res, 'Health check failed');
    }
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(`❌ ${logMessage}:`, error);

    // Error de dominio
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }

    // Error personalizado
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code || error.name
      });
    }

    // Error genérico
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
}