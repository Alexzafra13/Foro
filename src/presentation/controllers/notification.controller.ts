// src/presentation/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { CreateNotification } from '../../domain/use-cases/notifications/create-notification.use-case';
import { GetUserNotifications } from '../../domain/use-cases/notifications/get-user-notifications.use-case';
import { MarkNotificationAsRead } from '../../domain/use-cases/notifications/mark-notification-as-read.use-case';
import { MarkAllAsRead } from '../../domain/use-cases/notifications/mark-all-as-read.use-case';
import { CustomError, DomainError } from '../../shared/errors';
import { SSEController } from './sse.controller'; // ✅ Importación añadida

export class NotificationController {
  constructor(
    private readonly createNotification: CreateNotification,
    private readonly getUserNotifications: GetUserNotifications,
    private readonly markNotificationAsRead: MarkNotificationAsRead,
    private readonly markAllAsReadUseCase: MarkAllAsRead
  ) {}

  async getMany(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { page, limit, unread, type } = req.query;

      const result = await this.getUserNotifications.execute({
        userId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        filterUnread: unread === 'true',
        filterType: type as string
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
        stats: result.stats,
        message: `Found ${result.notifications.length} notifications`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching notifications');
    }
  }

  async getUnread(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { limit } = req.query;

      const result = await this.getUserNotifications.execute({
        userId,
        page: 1,
        limit: limit ? parseInt(limit as string) : 10,
        filterUnread: true
      });

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          unreadCount: result.stats.unreadCount
        },
        message: `${result.stats.unreadCount} unread notifications`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching unread notifications');
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          code: 'INVALID_NOTIFICATION_ID'
        });
      }

      const result = await this.markNotificationAsRead.execute({
        notificationId,
        userId
      });

      // ✅ Actualizar contador por SSE
      const unread = await this.getUserNotifications.execute({
        userId,
        filterUnread: true
      });
      SSEController.sendUnreadCountToUser(userId, unread.stats.unreadCount);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error marking notification as read');
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;

      const result = await this.markAllAsReadUseCase.execute({ userId });

      // ✅ Actualizar contador por SSE
      SSEController.sendUnreadCountToUser(userId, 0);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error marking all notifications as read');
    }
  }

  async createTest(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Test endpoint not available in production',
          code: 'FORBIDDEN'
        });
      }

      const userId = req.user?.userId!;
      const { type = 'system', content = 'Test notification' } = req.body;

      const result = await this.createNotification.execute({
        userId,
        type: type as any,
        content
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Test notification created successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating test notification');
    }
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
