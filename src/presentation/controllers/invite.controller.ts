// src/presentation/controllers/invite.controller.ts - ACTUALIZADO COMPLETO

import { Request, Response } from 'express';
import { GenerateInviteCode } from '../../domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '../../domain/use-cases/invites/validate-invite-code.use-case';
import { GetInviteCodes } from '@/domain/use-cases/invites/get-invite-codes.use-case'; 
import { DeleteInviteCode } from '@/domain/use-cases/invites/delete-invite-code.use-case'; 
import { GetInviteStats } from '@/domain/use-cases/invites/get-invite-stats.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';

export class InviteController {
  constructor(
    private readonly generateInviteCode: GenerateInviteCode,
    private readonly validateInviteCode: ValidateInviteCode,
    private readonly getInviteCodes: GetInviteCodes,
    private readonly deleteInviteCode: DeleteInviteCode,
    private readonly getInviteStats: GetInviteStats
  ) {}

  // POST /api/invites/generate (Solo admin/moderator)
  async generate(req: Request, res: Response) {
    try {
      const { customCode } = req.body || {};
      const createdBy = req.user?.userId!;

      const result = await this.generateInviteCode.execute({
        createdBy,
        customCode: customCode || undefined
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

  // POST /api/invites/validate (Público)
  async validate(req: Request, res: Response) {
    try {
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

  // ✅ NUEVO: GET /api/invites (Solo admin/moderator)
  async getList(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { 
        page = 1, 
        limit = 10, 
        status = 'all', 
        createdBy 
      } = req.query;

      const result = await this.getInviteCodes.execute({
        requesterId: userId,
        filters: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          status: status as string,
          createdBy: createdBy ? parseInt(createdBy as string) : undefined
        }
      });

      res.json({
        success: true,
        data: result,
        message: 'Invite codes retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error retrieving invite codes');
    }
  }

  // ✅ NUEVO: DELETE /api/invites/:code (Solo admin)
  async delete(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const userId = req.user?.userId!;

      const result = await this.deleteInviteCode.execute({
        code,
        requesterId: userId
      });

      res.json({
        success: true,
        data: result,
        message: `Invite code ${code} has been deleted successfully`
      });
    } catch (error) {
      this.handleError(error, res, 'Error deleting invite code');
    }
  }

  // ✅ NUEVO: GET /api/invites/stats (Solo admin/moderator)
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId!;
      const { createdBy } = req.query;

      const result = await this.getInviteStats.execute({
        requesterId: userId,
        createdBy: createdBy ? parseInt(createdBy as string) : undefined
      });

      res.json({
        success: true,
        data: result,
        message: 'Invite statistics retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error retrieving invite statistics');
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