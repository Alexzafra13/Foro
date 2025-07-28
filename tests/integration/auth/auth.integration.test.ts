import request from 'supertest';
import { Application } from 'express';
import { TestServer } from '../../helpers/test-server';

// Mock de bcrypt para tests
jest.mock('@/config/bcrypt.adapter', () => ({
  bcryptAdapter: {
    hash: jest.fn().mockReturnValue('hashed_password'),
    compare: jest.fn().mockImplementation((password, hash) => {
      return password === 'password123' && hash === 'hashed_password';
    })
  }
}));

// Mock de JWT para tests
jest.mock('@/config/jwt.adapter', () => ({
  JwtAdapter: {
    generateToken: jest.fn().mockReturnValue('mock.jwt.token'),
    validateToken: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' })
  }
}));

describe('Auth Integration Tests (Updated with Invite Codes)', () => {
  let app: Application;
  let testServer: TestServer;
  
  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.getApp();
  });

  beforeEach(() => {
    testServer.clearUsers();
    testServer.clearInviteCodes();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid invite code', async () => {
      // Primero crear un código de invitación válido
      const validInviteCode = 'TEST-CODE-123';
      testServer.addInviteCode(validInviteCode, 1); // Creado por admin (id: 1)

      const newUser = {
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'password123',
        inviteCode: validInviteCode
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            username: newUser.username,
            email: newUser.email,
            role: {
              id: 3,
              name: 'user'
            }
          },
          token: 'mock.jwt.token',
          inviteCodeUsed: validInviteCode
        }
      });
      
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 if invite code is missing', async () => {
      const userWithoutInviteCode = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
        // inviteCode missing
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithoutInviteCode)
        .expect(400); // ✅ CORREGIDO: 400 es correcto para campo requerido faltante

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invite code is required',
        code: 'DomainError'
      });
    });

    it('should return 404 if invite code does not exist', async () => {
      const userWithInvalidCode = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        inviteCode: 'INVALID-CODE'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithInvalidCode)
        .expect(404); // ✅ CORREGIDO: 404 para código no encontrado

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found'),
        code: 'DomainError'
      });
    });

    it('should return 409 if invite code is already used', async () => {
      const usedInviteCode = 'USED-CODE-123';
      testServer.addInviteCode(usedInviteCode, 1);
      testServer.markInviteCodeAsUsed(usedInviteCode, 999, 'otheruser');

      const userWithUsedCode = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        inviteCode: usedInviteCode
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithUsedCode)
        .expect(409); // ✅ CORREGIDO: 409 para conflicto (código ya usado)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already used'),
        code: 'DomainError'
      });
    });

    it('should return 410 if invite code is expired', async () => {
      const expiredInviteCode = 'EXPIRED-CODE';
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8); // 8 días atrás
      testServer.addInviteCode(expiredInviteCode, 1, expiredDate);

      const userWithExpiredCode = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        inviteCode: expiredInviteCode
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithExpiredCode)
        .expect(410); // ✅ CORREGIDO: 410 para Gone (código expirado)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('expired'),
        code: 'DomainError'
      });
    });

    it('should normalize invite code to uppercase', async () => {
      const validInviteCode = 'TEST-CODE-UPPER';
      testServer.addInviteCode(validInviteCode, 1);

      const userWithLowercaseCode = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        inviteCode: 'test-code-upper' // lowercase
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithLowercaseCode)
        .expect(201);

      expect(response.body.data.inviteCodeUsed).toBe(validInviteCode);
    });

    it('should still validate other fields even with valid invite code', async () => {
      const validInviteCode = 'VALID-CODE-123';
      testServer.addInviteCode(validInviteCode, 1);

      const userWithInvalidEmail = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        inviteCode: validInviteCode
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithInvalidEmail)
        .expect(400); // ✅ MANTENER: 400 para validación de formato

      expect(response.body).toMatchObject({
        success: false,
        error: 'Email must be a valid valid email address',
        code: 'DomainError'
      });

      // El código de invitación NO debe ser marcado como usado
      expect(testServer.isInviteCodeUsed(validInviteCode)).toBe(false);
    });
  });

  describe('POST /api/invites/generate', () => {
    it('should generate invite code for admin user', async () => {
      const response = await request(app)
        .post('/api/invites/generate')
        .set('Authorization', 'Bearer admin.token')
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Invite code generated successfully',
        data: {
          code: expect.stringMatching(/^[A-Z0-9-]+$/),
          createdBy: expect.any(Number),
          createdAt: expect.any(String),
          expiresAt: expect.any(String)
        }
      });
    });

    it('should generate custom invite code', async () => {
      const customCode = 'CUSTOM-123';

      const response = await request(app)
        .post('/api/invites/generate')
        .set('Authorization', 'Bearer admin.token')
        .send({ customCode })
        .expect(201);

      expect(response.body.data.code).toBe(customCode);
    });

    it('should return 401 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/invites/generate')
        .set('Authorization', 'Bearer user.token')
        .send({})
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('permissions')
      });
    });
  });

  describe('POST /api/invites/validate', () => {
    it('should validate existing invite code', async () => {
      const validCode = 'VALID-TEST-CODE';
      testServer.addInviteCode(validCode, 1);

      const response = await request(app)
        .post('/api/invites/validate')
        .send({ code: validCode })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Invite code is valid',
        data: {
          isValid: true,
          code: validCode,
          isUsed: false,
          isExpired: false
        }
      });
    });

    it('should return 404 for non-existent code', async () => {
      const response = await request(app)
        .post('/api/invites/validate')
        .send({ code: 'NON-EXISTENT' })
        .expect(404); // ✅ CORREGIDO: 404 para código no encontrado

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });
  });

  describe('POST /api/auth/login (unchanged)', () => {
    it('should login with valid credentials', async () => {
      // Setup: crear usuario con invite code
      const inviteCode = 'SETUP-CODE';
      testServer.addInviteCode(inviteCode, 1);

      const user = {
        username: 'logintest',
        email: 'login@test.com',
        password: 'password123',
        inviteCode
      };

      await request(app).post('/api/auth/register').send(user);

      // Test: login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: user.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: user.email,
            username: user.username
          },
          token: 'mock.jwt.token'
        }
      });
    });
  });
});