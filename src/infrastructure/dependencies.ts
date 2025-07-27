// src/infrastructure/dependencies.ts
import { PrismaClient } from '@prisma/client';
import { PrismaUserDatasource } from './datasources/prisma-user.datasource';
import { UserRepositoryImpl } from './repositories/user.repository.impl';
import { RegisterUser } from '../domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '../domain/use-cases/auth/login-user.use-case';
import { AuthController } from '../presentation/controllers/auth.controller';

export class Dependencies {
  static async create() {
    // Database
    const prisma = new PrismaClient();
    
    // Datasources
    const userDatasource = new PrismaUserDatasource(prisma);
    
    // Repositories
    const userRepository = new UserRepositoryImpl(userDatasource);
    
    // Use Cases
    const registerUser = new RegisterUser(userRepository);
    const loginUser = new LoginUser(userRepository);
    
    // Controllers
    const authController = new AuthController(registerUser, loginUser);
    
    return {
      prisma,
      controllers: {
        authController,
      },
    };
  }
}