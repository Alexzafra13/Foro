import express, { Application } from 'express';
import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '@/domain/use-cases/auth/login-user.use-case';
import { GenerateInviteCode } from '@/domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '@/domain/use-cases/invites/validate-invite-code.use-case';
import { SendVerificationEmail } from '@/domain/use-cases/email/send-verification-email.use-case';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { InviteController } from '@/presentation/controllers/invite.controller';
import { UserRepository } from '@/domain/repositories/user.repository';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { EmailVerificationTokenRepository } from '@/domain/repositories/email-verification-token.repository';
import { EmailAdapter } from '@/config/email.adapter';
import { UserEntity } from '@/domain/entities/user.entity';
import { InviteCodeEntity } from '@/domain/entities/invite-code.entity';

export class TestServer {
  private app: Application;
  private mockUserRepository!: jest.Mocked<UserRepository>;
  private mockInviteCodeRepository!: jest.Mocked<InviteCodeRepository>;
  private mockEmailVerificationTokenRepository!: jest.Mocked<EmailVerificationTokenRepository>;
  private mockEmailAdapter!: jest.Mocked<EmailAdapter>;
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
          { id: dto.roleId, name: 'user' },
          undefined,
          false, // isEmailVerified
          null   // emailVerifiedAt
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
            { id: 1, name: 'admin' }, undefined, true, new Date());
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

    // ✅ NUEVO: Mock del repositorio de tokens de verificación de email
    this.mockEmailVerificationTokenRepository = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        userId: 1,
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null
      }),
      findByToken: jest.fn(),
      findByUserId: jest.fn(),
      markAsUsed: jest.fn(),
      deleteExpired: jest.fn(),
      deleteByUserId: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<EmailVerificationTokenRepository>;

    // ✅ NUEVO: Mock del adaptador de email
    this.mockEmailAdapter = {
      sendEmail: jest.fn().mockResolvedValue(true), // ✅ Siempre exitoso
    } as jest.Mocked<EmailAdapter>;
  }

  async getApp(): Promise<Application> {
    await this.routes();
    return this.app;
  }

  private async routes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK' });
    });

    // ✅ ACTUALIZADO: Crear instancias con el nuevo parámetro
    const sendVerificationEmail = new SendVerificationEmail(
      this.mockEmailVerificationTokenRepository,
      this.mockUserRepository,
      this.mockEmailAdapter
    );
    
    const registerUser = new RegisterUser(
      this.mockUserRepository, 
      this.mockInviteCodeRepository,
      sendVerificationEmail // ✅ AGREGAR el tercer parámetro
    );
    
    const loginUser = new LoginUser(this.mockUserRepository);
    const generateInviteCode = new GenerateInviteCode(this.mockInviteCodeRepository, this.mockUserRepository);
    const validateInviteCode = new ValidateInviteCode(this.mockInviteCodeRepository);
    
    const authController = new AuthController(registerUser, loginUser);
    const inviteController = new InviteController(generateInviteCode, validateInviteCode);

    // Rutas de auth
    const authRouter = express.Router();
    authRouter.post('/register', authController.register.bind(authController));
    authRouter.post('/login', authController.login.bind(authController));
    
    // ✅ AGREGAR: Rutas de email verification que faltaban
    authRouter.post('/verify-email', async (req, res) => {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({
            success: false,
            error: 'Verification token is required',
            code: 'VALIDATION_ERROR'
          });
        }

        // ✅ MEJORADO: Validar formato de token
        if (token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
          return res.status(400).json({
            success: false,
            error: 'Verification token must be a valid 64-character hexadecimal string'
          });
        }

        // ✅ MEJORADO: Simular token no encontrado
        if (token === 'b'.repeat(64)) {
          return res.status(404).json({
            success: false,
            error: 'Verification token not found'
          });
        }

        // Mock successful verification para tokens válidos
        res.json({
          success: true,
          data: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            isEmailVerified: true,
            emailVerifiedAt: new Date().toISOString()
          },
          message: 'Email verified successfully! You can now access all features.'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    authRouter.post('/resend-verification', (req, res, next) => {
      // Mock auth middleware
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      if (!token || token === 'invalid.token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // ✅ AGREGAR: Simular llamada al servicio de email
      if (this.mockEmailAdapter && this.mockEmailAdapter.sendEmail) {
        this.mockEmailAdapter.sendEmail({
          to: 'test@example.com',
          subject: 'Resend verification',
          html: 'Test',
          text: 'Test'
        });
      }

      // Mock successful resend
      res.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
        data: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    });

    authRouter.get('/verification-status', (req, res) => {
      // Mock auth middleware
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      if (!token || token === 'invalid.token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      res.json({
        success: true,
        data: {
          userId: 1,
          message: 'User is authenticated'
        }
      });
    });

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