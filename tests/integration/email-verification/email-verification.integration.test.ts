import request from 'supertest';
import { Application } from 'express';
import { TestServer } from '../../helpers/test-server';

// Mock de los adapters
jest.mock('@/config/bcrypt.adapter', () => ({
  bcryptAdapter: {
    hash: jest.fn().mockReturnValue('hashed_password'),
    compare: jest.fn().mockImplementation((password, hash) => {
      return password === 'password123' && hash === 'hashed_password';
    })
  }
}));

jest.mock('@/config/jwt.adapter', () => ({
  JwtAdapter: {
    generateToken: jest.fn().mockReturnValue('mock.jwt.token'),
    validateToken: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' })
  }
}));

// Mock más completo del sistema de email
jest.mock('@/config/email.adapter', () => {
  const mockSendEmail = jest.fn().mockResolvedValue(true);
  
  return {
    createEmailAdapter: () => ({
      sendEmail: mockSendEmail
    }),
    MockEmailAdapter: jest.fn().mockImplementation(() => ({
      sendEmail: mockSendEmail,
      getSentEmails: jest.fn().mockReturnValue([]),
      clearSentEmails: jest.fn()
    })),
    GmailAdapter: jest.fn().mockImplementation(() => ({
      sendEmail: mockSendEmail
    }))
  };
});

// Mock del EmailVerificationTokenEntity
jest.mock('@/domain/entities/email-verification-token.entity', () => ({
  EmailVerificationTokenEntity: {
    generateToken: jest.fn().mockReturnValue('a'.repeat(64)),
    calculateExpirationDate: jest.fn().mockReturnValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  }
}));

describe('Email Verification Integration Tests', () => {
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

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Crear usuario primero
      const validInviteCode = 'TEST-CODE-123';
      testServer.addInviteCode(validInviteCode, 1);

      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        inviteCode: validInviteCode
      };

      // Registrar usuario (esto debería enviar email de verificación)
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(registerResponse.body.data.emailVerificationSent).toBe(true);

      // Mock de token válido para verificación
      const validToken = 'a'.repeat(64);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: validToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email verified successfully! You can now access all features.',
        data: {
          id: expect.any(Number),
          username: newUser.username,
          email: newUser.email,
          isEmailVerified: true,
          emailVerifiedAt: expect.any(String)
        }
      });
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Verification token is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 400 for invalid token format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('64-character hexadecimal string')
      });
    });

    it('should return 404 for non-existent token', async () => {
      const nonExistentToken = 'b'.repeat(64);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: nonExistentToken })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
        data: {
          expiresAt: expect.any(String)
        }
      });

      // El mock ahora se llama directamente en el endpoint
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({})
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Authorization token is required'
      });
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .set('Authorization', 'Bearer invalid.token')
        .send({})
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid or expired token'
      });
    });
  });

  describe('GET /api/auth/verification-status', () => {
    it('should return verification status for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/verification-status')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          userId: expect.any(Number),
          message: 'User is authenticated'
        }
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/verification-status')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Authorization token is required'
      });
    });
  });

  describe('Email sending during registration', () => {
    it('should send verification email when user registers', async () => {
      // Setup
      const validInviteCode = 'EMAIL-TEST-CODE';
      testServer.addInviteCode(validInviteCode, 1);

      const newUser = {
        username: 'emailtest',
        email: 'emailtest@example.com',
        password: 'password123',
        inviteCode: validInviteCode
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      // Assert - El registro debe ser exitoso y reportar email enviado
      expect(response.body.data.emailVerificationSent).toBe(true);
      expect(response.body.data.user.isEmailVerified).toBe(false);
    });

    it('should still register user even if email sending fails', async () => {
      // Setup - hacer que el envío de email falle
      const { createEmailAdapter } = require('@/config/email.adapter');
      const mockAdapter = createEmailAdapter();
      mockAdapter.sendEmail.mockResolvedValueOnce(false);
      
      const validInviteCode = 'EMAIL-FAIL-CODE';
      testServer.addInviteCode(validInviteCode, 1);

      const newUser = {
        username: 'emailfailtest',
        email: 'emailfail@example.com',
        password: 'password123',
        inviteCode: validInviteCode
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      // Assert - el registro debe ser exitoso aunque el email falle
      expect(response.body.data.emailVerificationSent).toBe(false);
      expect(response.body.data.user.isEmailVerified).toBe(false);
      expect(response.body.success).toBe(true);
    });
  });
});