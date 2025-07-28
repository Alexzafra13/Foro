import { Request, Response } from 'express';
import { AuthMiddleware } from '@/presentation/middlewares/auth.middleware';
import { JwtAdapter } from '@/config/jwt.adapter';

jest.mock('@/config/jwt.adapter');

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should call next() with valid token', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const payload = { userId: 1, email: 'test@example.com' };
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };
      
      (JwtAdapter.validateToken as jest.Mock).mockReturnValue(payload);

      // Act
      await AuthMiddleware.validateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(JwtAdapter.validateToken).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no authorization header', async () => {
      // Act
      await AuthMiddleware.validateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization token is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has wrong format', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      };

      // Act
      await AuthMiddleware.validateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid.token'
      };
      
      (JwtAdapter.validateToken as jest.Mock).mockReturnValue(null);

      // Act
      await AuthMiddleware.validateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should call next() without token', async () => {
      // Act
      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user if valid token provided', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const payload = { userId: 1, email: 'test@example.com' };
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };
      
      (JwtAdapter.validateToken as jest.Mock).mockReturnValue(payload);

      // Act
      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() even with invalid token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid.token'
      };
      
      (JwtAdapter.validateToken as jest.Mock).mockReturnValue(null);

      // Act
      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});