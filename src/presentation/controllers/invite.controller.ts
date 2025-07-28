import { Request, Response } from 'express';
import { GenerateInviteCode } from '../../domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '../../domain/use-cases/invites/validate-invite-code.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class InviteController {
  constructor(
    private readonly generateInviteCode: GenerateInviteCode,
    private readonly validateInviteCode: ValidateInviteCode
  ) {}

  // POST /api/invites/generate (Solo admin/moderator)
  async generate(req: Request, res: Response) {
    try {
      // ✅ MEJORADO: Manejar body undefined/null y extraer customCode de forma segura
      const { customCode } = req.body || {};
      const createdBy = req.user?.userId!; // Del middleware de auth

      const result = await this.generateInviteCode.execute({
        createdBy,
        customCode: customCode || undefined // ✅ Convertir string vacío a undefined
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Invite code generated successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error generating invite code');
    }
  }

  // POST /api/invites/validate
  async validate(req: Request, res: Response) {
    try {
      // ✅ MEJORADO: Validar que el campo code existe
      const { code } = req.body || {};
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Invite code is required',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await this.validateInviteCode.execute({ code });

      res.json({
        success: true,
        data: result,
        message: 'Invite code is valid'
      });
    } catch (error) {
      this.handleError(error, res, 'Error validating invite code');
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