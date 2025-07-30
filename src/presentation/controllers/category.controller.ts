import { Request, Response } from 'express';
import { GetCategories } from '../../domain/use-cases/categories/get-categories.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class CategoryController {
  constructor(private readonly getCategories: GetCategories) {}

  // GET /api/categories
  async getAll(req: Request, res: Response) {
    try {
      const categories = await this.getCategories.execute();

      res.json({
        success: true,
        data: categories,
        message: `Found ${categories.length} categories`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching categories');
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