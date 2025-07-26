import { Request, Response } from 'express';
import { GetRoles } from '@/domain/use-cases/role/get-roles.use-case';
import { CustomError } from '@/shared';

export class RoleController {
  constructor(private readonly getRoles: GetRoles) {}

  async getAllRoles(req: Request, res: Response) {
    try {
      const roles = await this.getRoles.execute();
      
      res.json({
        success: true,
        data: roles,
        message: 'Roles retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting roles:', error);
      
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}