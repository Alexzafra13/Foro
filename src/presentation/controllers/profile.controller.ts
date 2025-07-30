import { Request, Response } from 'express';
import { GetProfile } from '../../domain/use-cases/user/get-profile.use-case';
import { UpdateProfile } from '../../domain/use-cases/user/update-profile.use-case';
import { ChangePassword } from '../../domain/use-cases/user/change-password.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class ProfileController {
  constructor(
    private readonly getProfile: GetProfile,
    private readonly updateProfile: UpdateProfile,
    private readonly changePassword: ChangePassword
  ) {}

  // GET /api/users/profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!; // Del middleware de auth
      const includeSettings = req.query.includeSettings === 'true';
      const includeStats = req.query.includeStats === 'true';

      const profile = await this.getProfile.execute({
        userId,
        includeSettings,
        includeStats
      });

      res.json({
        success: true,
        data: profile,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching profile');
    }
  }

  // PUT /api/users/profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { username, bio, avatarUrl } = req.body;
      const ipAddress = this.getClientIP(req);

      const result = await this.updateProfile.execute({
        userId,
        username,
        bio,
        avatarUrl,
        ipAddress
      });

      res.json({
        success: true,
        data: result,
        message: `Profile updated successfully${result.changes.length > 0 ? ` (${result.changes.join(', ')})` : ''}`
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating profile');
    }
  }

  // PUT /api/users/password
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const ipAddress = this.getClientIP(req);

      const result = await this.changePassword.execute({
        userId,
        currentPassword,
        newPassword,
        confirmPassword,
        ipAddress
      });

      res.json({
        success: true,
        data: {
          changedAt: result.changedAt
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error changing password');
    }
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);
    
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }
    
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}