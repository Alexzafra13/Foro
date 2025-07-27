// src/presentation/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { RegisterUser, RegisterUserDto } from '../../domain/use-cases/auth/register-user.use-case';
import { LoginUser, LoginUserDto } from '../../domain/use-cases/auth/login-user.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser
  ) {}

  async register(req: Request, res: Response) {
    try {
      const { username, email, password }: RegisterUserDto = req.body;
      
      const result = await this.registerUser.execute({
        username,
        email,
        password
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error in register');
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginUserDto = req.body;
      
      const result = await this.loginUser.execute({
        email,
        password
      });

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      this.handleError(error, res, 'Error in login');
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