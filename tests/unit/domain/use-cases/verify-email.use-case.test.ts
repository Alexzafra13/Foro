import { VerifyEmail, EmailVerificationErrors } from '@/domain/use-cases/email/verify-email.use-case';
import { EmailVerificationTokenRepository } from '@/domain/repositories/email-verification-token.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { ValidationErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

// Mock de EmailVerificationTokenEntity
const createMockToken = (overrides = {}) => ({
  id: 1,
  userId: 1,
  token: 'a'.repeat(64),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas
  createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hora atrás
  usedAt: null,
  isExpired: jest.fn().mockReturnValue(false),
  isUsed: jest.fn().mockReturnValue(false),
  canBeUsed: jest.fn().mockReturnValue(true),
  markAsUsed: jest.fn(),
  ...overrides
});

describe('VerifyEmail Use Case', () => {
  let verifyEmail: VerifyEmail;
  let mockEmailVerificationTokenRepository: jest.Mocked<EmailVerificationTokenRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockEmailVerificationTokenRepository = {
      create: jest.fn(),
      findByToken: jest.fn(),
      findByUserId: jest.fn(),
      markAsUsed: jest.fn(),
      deleteExpired: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    verifyEmail = new VerifyEmail(
      mockEmailVerificationTokenRepository,
      mockUserRepository
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validToken = 'a'.repeat(64);
    const validUser = TestFactory.createUserEntity({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      isEmailVerified: false
    });

    it('should verify email successfully', async () => {
      // Arrange
      const mockTokenEntity = createMockToken();
      const updatedUser = { ...validUser, isEmailVerified: true, emailVerifiedAt: new Date() };

      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(mockTokenEntity as any);
      mockUserRepository.findById.mockResolvedValue(validUser);
      mockUserRepository.updateById.mockResolvedValue(updatedUser as any);
      mockEmailVerificationTokenRepository.markAsUsed.mockResolvedValue(mockTokenEntity as any);
      mockEmailVerificationTokenRepository.deleteByUserId.mockResolvedValue(1);

      // Act
      const result = await verifyEmail.execute({ token: validToken });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          isEmailVerified: true,
          emailVerifiedAt: updatedUser.emailVerifiedAt
        }
      });

      expect(mockEmailVerificationTokenRepository.findByToken).toHaveBeenCalledWith(validToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockEmailVerificationTokenRepository.markAsUsed).toHaveBeenCalledWith(validToken);
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(1, {
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date)
      });
      expect(mockEmailVerificationTokenRepository.deleteByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw error if token does not exist', async () => {
      // Arrange
      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(verifyEmail.execute({ token: validToken }))
        .rejects
        .toThrow(EmailVerificationErrors.tokenNotFound(validToken));

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if token is expired', async () => {
      // Arrange
      const expiredToken = createMockToken({
        isExpired: jest.fn().mockReturnValue(true),
        expiresAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hora atrás
      });

      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(expiredToken as any);

      // Act & Assert
      await expect(verifyEmail.execute({ token: validToken }))
        .rejects
        .toThrow(EmailVerificationErrors.tokenExpired(expiredToken.expiresAt));

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if token is already used', async () => {
      // Arrange
      const usedAt = new Date(); // ✅ Crear Date explícitamente
      const usedToken = createMockToken({
        isUsed: jest.fn().mockReturnValue(true),
        usedAt: usedAt // ✅ Usar la variable Date
      });

      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(usedToken as any);

      // Act & Assert
      await expect(verifyEmail.execute({ token: validToken }))
        .rejects
        .toThrow(EmailVerificationErrors.tokenAlreadyUsed(usedAt)); // ✅ Usar la variable Date

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const mockTokenEntity = createMockToken();
      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(mockTokenEntity as any);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(verifyEmail.execute({ token: validToken }))
        .rejects
        .toThrow('User not found for verification token');
    });

    it('should throw error if email is already verified', async () => {
      // Arrange
      const verifiedUser = TestFactory.createUserEntity({ 
        id: 1, 
        isEmailVerified: true 
      });
      const mockTokenEntity = createMockToken();

      mockEmailVerificationTokenRepository.findByToken.mockResolvedValue(mockTokenEntity as any);
      mockUserRepository.findById.mockResolvedValue(verifiedUser);

      // Act & Assert
      await expect(verifyEmail.execute({ token: validToken }))
        .rejects
        .toThrow(EmailVerificationErrors.emailAlreadyVerified());
    });

    describe('token format validation', () => {
      it('should throw error for empty token', async () => {
        await expect(verifyEmail.execute({ token: '' }))
          .rejects
          .toThrow(ValidationErrors.requiredField('Verification token'));
      });

      it('should throw error for token shorter than 64 characters', async () => {
        await expect(verifyEmail.execute({ token: 'a'.repeat(32) }))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Verification token', '64-character hexadecimal string'));
      });

      it('should throw error for token longer than 64 characters', async () => {
        await expect(verifyEmail.execute({ token: 'a'.repeat(128) }))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Verification token', '64-character hexadecimal string'));
      });

      it('should throw error for non-hexadecimal token', async () => {
        await expect(verifyEmail.execute({ token: 'g'.repeat(64) }))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Verification token', 'hexadecimal string'));
      });
    });
  });
});