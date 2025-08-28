// src/presentation/controllers/settings.controller.ts - COMPLETO CON NUEVOS CAMPOS
import { Request, Response } from 'express';
import { GetUserSettings } from '@/domain/use-cases/user/update-user-settings.use-case'; 
import { UpdateUserSettings } from '@/domain/use-cases/user/update-user-settings.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';

export class SettingsController {
  constructor(
    private readonly getUserSettings: GetUserSettings,
    private readonly updateUserSettings: UpdateUserSettings
  ) {}

  // GET /api/users/settings
  async getSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;

      const settings = await this.getUserSettings.execute({ userId });

      res.json({
        success: true,
        data: settings,
        message: 'Settings retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching settings');
    }
  }

  // PUT /api/users/settings
  async updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const ipAddress = this.getClientIP(req);
      
      const {
        theme,
        language,
        timezone,
        emailNotifications,
        postNotifications,
        commentNotifications,
        privateProfile,
        showEmail,
        showLastSeen,
        // ✅ NUEVOS CAMPOS
        showStats,
        showJoinDate,
        restrictToModerators
      } = req.body;

      const result = await this.updateUserSettings.execute({
        userId,
        theme,
        language,
        timezone,
        emailNotifications,
        postNotifications,
        commentNotifications,
        privateProfile,
        showEmail,
        showLastSeen,
        // ✅ NUEVOS CAMPOS
        showStats,
        showJoinDate,
        restrictToModerators,
        ipAddress
      });

      res.json({
        success: true,
        data: result,
        message: `Settings updated successfully${result.changes.length > 0 ? ` (${result.changes.join(', ')})` : ''}`
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating settings');
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