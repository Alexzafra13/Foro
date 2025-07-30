
import { Request, Response } from 'express';
import { RequestPasswordReset } from '../../domain/use-cases/auth/request-password-reset.use-case';
import { ResetPassword } from '../../domain/use-cases/auth/reset-password.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class PasswordResetController {
  constructor(
    private readonly requestPasswordReset: RequestPasswordReset,
    private readonly resetPasswordUseCase: ResetPassword
  ) {}

  // POST /api/auth/request-password-reset
  async requestReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const ipAddress = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await this.requestPasswordReset.execute({
        email,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        data: {
          expiresAt: result.expiresAt
        },
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error requesting password reset');
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      const ipAddress = this.getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token, new password and confirmation are required',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword,
        confirmPassword,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        data: result.user,
        message: result.message
      });
    } catch (error) {
      this.handleError(error, res, 'Error resetting password');
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
