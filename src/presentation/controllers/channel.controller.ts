import { Request, Response } from 'express';
import { GetChannel } from '@/domain/use-cases/channel/get-channel.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';

export class ChannelController {
  constructor(private readonly getChannel: GetChannel) {}

  // GET /api/channels/:id
  async getById(req: Request, res: Response) {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.user?.userId; // Opcional del middleware

      if (isNaN(channelId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel ID'
        });
      }

      const channel = await this.getChannel.execute({ channelId, userId });

      res.json({
        success: true,
        data: channel,
        message: 'Channel retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching channel');
    }
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found',
        code: 'CHANNEL_NOT_FOUND'
      });
    }

    if (error.message.includes('Authentication required')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for private channel',
        code: 'AUTH_REQUIRED'
      });
    }
    
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