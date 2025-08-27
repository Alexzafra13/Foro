// src/presentation/controllers/public-profile.controller.ts
import { Request, Response } from 'express';
import { GetPublicProfile } from '../../domain/use-cases/user/get-public-profile.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class PublicProfileController {
  constructor(
    private readonly getPublicProfileUseCase: GetPublicProfile
  ) {}

  // GET /api/users/public/:username
  async getPublicProfile(req: Request, res: Response) {
    try {
      const username = req.params.username;
      const viewerUserId = req.user?.userId; // Opcional - undefined si no está autenticado

      console.log(`🔍 PublicProfileController.getPublicProfile called for username: ${username}, viewer: ${viewerUserId || 'anonymous'}`);

      if (!username || username.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      const profile = await this.getPublicProfileUseCase.execute({
        username: username.trim(),
        viewerUserId
      });

      res.json({
        success: true,
        data: profile,
        message: 'Public profile retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching public profile');
    }
  }

  private handleError(error: unknown, res: Response, defaultMessage: string) {
    console.error('PublicProfileController Error:', error);
    
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: defaultMessage
    });
  }

  private getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           'unknown';
  }
}