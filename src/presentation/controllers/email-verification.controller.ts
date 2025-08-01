// src/presentation/controllers/email-verification.controller.ts - MEJORADO
import { Request, Response } from 'express';
import { VerifyEmail } from '../../domain/use-cases/email/verify-email.use-case';
import { SendVerificationEmail } from '../../domain/use-cases/email/send-verification-email.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CustomError, DomainError } from '../../shared/errors';

export class EmailVerificationController {
  constructor(
    private readonly verifyEmail: VerifyEmail,
    private readonly sendVerificationEmail: SendVerificationEmail,
    private readonly userRepository: UserRepository // ✅ NUEVO: Para obtener datos actualizados
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
        data: result,
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

      // ✅ VERIFICAR PRIMERO SI YA ESTÁ VERIFICADO
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified',
          code: 'EMAIL_ALREADY_VERIFIED',
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              isEmailVerified: user.isEmailVerified,
              emailVerifiedAt: user.emailVerifiedAt
            }
          }
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

  // ✅ NUEVO: GET /api/auth/verification-status - Estado completo del usuario
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

      // Obtener datos actualizados del usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isEmailVerified: user.isEmailVerified || false,
            emailVerifiedAt: user.emailVerifiedAt || null,
            role: user.role,
            reputation: user.reputation,
            createdAt: user.createdAt
          }
        },
        message: 'User verification status retrieved successfully'
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