// tests/integration/auth/auth.integration.test.ts
import request from 'supertest';
import { Application } from 'express';
import { TestServer } from '../../helpers/test-server';

// Mock de bcrypt para tests
jest.mock('@/config/bcrypt.adapter', () => ({
  bcryptAdapter: {
    hash: jest.fn().mockReturnValue('hashed_password'),
    compare: jest.fn().mockImplementation((password, hash) => {
      // Simula comparación correcta para passwords conocidos
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

describe('Auth Integration Tests', () => {
  let app: Application;
  let testServer: TestServer;
  
  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.getApp();
  });

  beforeEach(() => {
    testServer.clearUsers();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      // Arrange
      const newUser = {
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'password123'
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
          token: 'mock.jwt.token'
        }
      });
      
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for invalid email', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: 'Email must be a valid valid email address',
        code: 'DomainError'
      });
    });

    it('should return 400 for short password', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: 'Password must be at least 6 characters long',
        code: 'DomainError'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const user = {
        username: 'logintest',
        email: 'login@test.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(user);

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: user.password
        })
        .expect(200);

      // Assert
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

    it('should return 401 for invalid credentials', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
        code: 'DomainError'
      });
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get profile with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid.token')
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: 'profile@test.com',
          message: 'This is a protected route!'
        }
      });
    });

    it('should return 401 without token', async () => {
      // Act
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: 'Authorization token is required'
      });
    });

    it('should return 401 with invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid or expired token'
      });
    });
  });
});