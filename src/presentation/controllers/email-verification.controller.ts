import { Request, Response } from 'express';
import { VerifyEmail } from '../../domain/use-cases/email/verify-email.use-case';
import { SendVerificationEmail } from '../../domain/use-cases/email/send-verification-email.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class EmailVerificationController {
  constructor(
    private readonly verifyEmail: VerifyEmail,
    private readonly sendVerificationEmail: SendVerificationEmail
  ) {}

  // POST /api/auth/verify-email
  async verify(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await this.verifyEmail.execute({ token });

      res.json({
        success: true,
        data: result.user,
        message: 'Email verified successfully! You can now access all features.'
      });
    } catch (error) {
      this.handleError(error, res, 'Error verifying email');
    }
  }

  // POST /api/auth/resend-verification
  async resendVerification(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const result = await this.sendVerificationEmail.execute({ userId });

      res.json({
        success: true,
        data: {
          expiresAt: result.expiresAt
        },
        message: 'Verification email sent successfully. Please check your inbox.'
      });
    } catch (error) {
      this.handleError(error, res, 'Error resending verification email');
    }
  }

  // GET /api/auth/verification-status
  async getVerificationStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Este endpoint podría expandirse para mostrar más información
      // Por ahora, solo confirmamos que el middleware de auth funciona
      res.json({
        success: true,
        data: {
          userId,
          message: 'User is authenticated'
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error checking verification status');
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