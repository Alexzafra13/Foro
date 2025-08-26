// src/presentation/controllers/user-search.controller.ts

import { Request, Response } from 'express';
import { SearchUsers } from '../../domain/use-cases/user/search-users.use-case';
import { DomainError } from '../../shared/errors/domain.errors';
import { CustomError } from '../../shared/errors';

export class UserSearchController {
  constructor(private readonly searchUsersUseCase: SearchUsers) {}

  searchUsers = async (req: Request, res: Response) => {
    try {
      console.log('🔍 UserSearchController.searchUsers called');
      console.log('Query params:', req.query);
      console.log('User from token:', req.user);

      const {
        q: query,
        limit = '10',
        excludeCurrentUser = 'false',
        includeRoleInfo = 'true',
        onlyModeratable = 'false'
      } = req.query as {
        q?: string;
        limit?: string;
        excludeCurrentUser?: string;
        includeRoleInfo?: string;
        onlyModeratable?: string;
      };

      // Validar query
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required',
          message: 'Please provide a search query using the "q" parameter'
        });
      }

      if (query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query too short',
          message: 'Search query must be at least 2 characters long'
        });
      }

      // Obtener userId del JWT si está disponible
      const currentUserId = (req as any).user?.userId;
      
      console.log('Current user ID from token:', currentUserId);
      console.log('Exclude current user:', excludeCurrentUser === 'true');

      // Validar y parsear límite
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter',
          message: 'Limit must be a positive integer'
        });
      }

      // Ejecutar búsqueda
      const result = await this.searchUsersUseCase.execute({
        query,
        limit: Math.min(50, parsedLimit),
        excludeCurrentUser: excludeCurrentUser === 'true',
        currentUserId,
        includeRoleInfo: includeRoleInfo === 'true',
        onlyModeratable: onlyModeratable === 'true'
      });

      console.log(`✅ Search completed. Found ${result.data.length} users`);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        query: result.query,
        message: `Found ${result.total} user${result.total !== 1 ? 's' : ''} matching "${result.query}"`
      });

    } catch (error) {
      console.error('❌ Error in searchUsers controller:', error);
      
      // Manejar errores de dominio (incluye ValidationErrors)
      if (error instanceof DomainError) {
        return res.status(error.statusCode).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      // Manejar errores personalizados
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.name,
          message: error.message
        });
      }

      // Error genérico
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while searching users',
        ...(process.env.NODE_ENV === 'development' && {
          debug: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
      });
    }
  };
}