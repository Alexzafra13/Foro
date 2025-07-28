import express, { Application } from 'express';
import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '@/domain/use-cases/auth/login-user.use-case';
import { GenerateInviteCode } from '@/domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '@/domain/use-cases/invites/validate-invite-code.use-case';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { InviteController } from '@/presentation/controllers/invite.controller';
import { UserRepository } from '@/domain/repositories/user.repository';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { UserEntity } from '@/domain/entities/user.entity';
import { InviteCodeEntity } from '@/domain/entities/invite-code.entity';

export class TestServer {
  private app: Application;
  private mockUserRepository!: jest.Mocked<UserRepository>;
  private mockInviteCodeRepository!: jest.Mocked<InviteCodeRepository>;
  private users: Map<string, UserEntity> = new Map();
  private inviteCodes: Map<string, InviteCodeEntity> = new Map();

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
    // Mock del repositorio de usuarios
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
      findById: jest.fn().mockImplementation(async (id) => {
        // Mock básico para admin/moderator
        if (id === 1) {
          return new UserEntity(1, 'admin', 'admin@test.com', 'hash', 1000, 1, new Date(), 
            { id: 1, name: 'admin' });
        }
        return null;
      }),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<UserRepository>;

    // Mock del repositorio de códigos de invitación
    this.mockInviteCodeRepository = {
      create: jest.fn().mockImplementation(async (dto) => {
        const inviteCode = new InviteCodeEntity(
          dto.code,
          dto.createdBy,
          null,
          null,
          new Date()
        );
        this.inviteCodes.set(dto.code, inviteCode);
        return inviteCode;
      }),
      findByCode: jest.fn().mockImplementation(async (code) => {
        return this.inviteCodes.get(code) || null;
      }),
      markAsUsed: jest.fn().mockImplementation(async (code, usedBy) => {
        const inviteCode = this.inviteCodes.get(code);
        if (inviteCode) {
          inviteCode.usedBy = usedBy;
          inviteCode.usedAt = new Date();
        }
        return inviteCode;
      }),
      findMany: jest.fn(),
      deleteByCode: jest.fn(),
      getStats: jest.fn(),
    } as jest.Mocked<InviteCodeRepository>;
  }

  async getApp(): Promise<Application> {
    await this.routes();
    return this.app;
  }

  private async routes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK' });
    });

    // Crear instancias con los mocks
    const registerUser = new RegisterUser(this.mockUserRepository, this.mockInviteCodeRepository);
    const loginUser = new LoginUser(this.mockUserRepository);
    const generateInviteCode = new GenerateInviteCode(this.mockInviteCodeRepository, this.mockUserRepository);
    const validateInviteCode = new ValidateInviteCode(this.mockInviteCodeRepository);
    
    const authController = new AuthController(registerUser, loginUser);
    const inviteController = new InviteController(generateInviteCode, validateInviteCode);

    // Rutas de auth
    const authRouter = express.Router();
    authRouter.post('/register', authController.register.bind(authController));
    authRouter.post('/login', authController.login.bind(authController));
    this.app.use('/api/auth', authRouter);

    // Rutas de invitación
    const inviteRouter = express.Router();
    inviteRouter.post('/generate', (req, res, next) => {
      // Mock de autenticación para admin
      const authorization = req.headers.authorization;
      if (authorization === 'Bearer admin.token') {
        req.user = { userId: 1, email: 'admin@test.com' };
      } else if (authorization === 'Bearer user.token') {
        req.user = { userId: 2, email: 'user@test.com' };
      } else {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }
      next();
    }, (req, res, next) => {
      // Mock de verificación de permisos
      if (req.user?.userId !== 1) {
        return res.status(401).json({
          success: false,
          error: 'Insufficient permissions for this action'
        });
      }
      next();
    }, inviteController.generate.bind(inviteController));
    
    inviteRouter.post('/validate', inviteController.validate.bind(inviteController));
    this.app.use('/api/invites', inviteRouter);

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

  // Métodos para manipular datos en tests
  clearUsers() {
    this.users.clear();
  }

  clearInviteCodes() {
    this.inviteCodes.clear();
  }

  addInviteCode(code: string, createdBy: number, createdAt?: Date) {
    const inviteCode = new InviteCodeEntity(
      code,
      createdBy,
      null,
      null,
      createdAt || new Date()
    );
    this.inviteCodes.set(code, inviteCode);
  }

  markInviteCodeAsUsed(code: string, usedBy: number, username: string) {
    const inviteCode = this.inviteCodes.get(code);
    if (inviteCode) {
      inviteCode.usedBy = usedBy;
      inviteCode.usedAt = new Date();
      inviteCode.user = { id: usedBy, username };
    }
  }

  isInviteCodeUsed(code: string): boolean {
    const inviteCode = this.inviteCodes.get(code);
    return inviteCode ? inviteCode.isUsed() : false;
  }

  getInviteCode(code: string): InviteCodeEntity | undefined {
    return this.inviteCodes.get(code);
  }
}