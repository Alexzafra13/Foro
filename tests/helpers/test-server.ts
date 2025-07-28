// tests/helpers/test-server.ts
import express, { Application } from 'express';
import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '@/domain/use-cases/auth/login-user.use-case';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { UserRepository } from '@/domain/repositories/user.repository';
import { UserEntity } from '@/domain/entities/user.entity';

export class TestServer {
  private app: Application;
  private mockUserRepository!: jest.Mocked<UserRepository>;
  private users: Map<string, UserEntity> = new Map();

  constructor() {
    this.app = express();
    this.middlewares();
    this.setupMocks();
  }

  private middlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupMocks() {
    // Mock del repositorio
    this.mockUserRepository = {
      create: jest.fn().mockImplementation(async (dto) => {
        const user = new UserEntity(
          this.users.size + 1,
          dto.username,
          dto.email,
          dto.passwordHash,
          0,
          dto.roleId,
          new Date(),
          { id: dto.roleId, name: 'user' }
        );
        this.users.set(dto.email, user);
        return user;
      }),
      findByEmail: jest.fn().mockImplementation(async (email) => {
        return this.users.get(email) || null;
      }),
      findByUsername: jest.fn().mockImplementation(async (username) => {
        for (const user of this.users.values()) {
          if (user.username === username) return user;
        }
        return null;
      }),
      findById: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<UserRepository>;
  }

  async getApp(): Promise<Application> {
    await this.routes();
    return this.app;
  }

  private async routes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK' });
    });

    // Crear instancias con el mock
    const registerUser = new RegisterUser(this.mockUserRepository);
    const loginUser = new LoginUser(this.mockUserRepository);
    const authController = new AuthController(registerUser, loginUser);

    // Rutas de auth
    const authRouter = express.Router();
    authRouter.post('/register', authController.register.bind(authController));
    authRouter.post('/login', authController.login.bind(authController));
    this.app.use('/api/auth', authRouter);

    // Ruta protegida de prueba
    this.app.get('/api/users/profile', (req, res) => {
      const authorization = req.headers.authorization;
      
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      
      if (!token || token === 'invalid.token.here') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Mock response
      res.json({
        success: true,
        data: {
          userId: 1,
          email: 'profile@test.com',
          message: 'This is a protected route!'
        }
      });
    });
  }

  // Método para limpiar los datos entre tests
  clearUsers() {
    this.users.clear();
  }
}