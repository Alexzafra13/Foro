import { SendVerificationEmail } from '@/domain/use-cases/email/send-verification-email.use-case';
import { EmailVerificationTokenRepository } from '@/domain/repositories/email-verification-token.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { EmailAdapter } from '@/config/email.adapter';
import { UserErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

describe('SendVerificationEmail Use Case', () => {
  let sendVerificationEmail: SendVerificationEmail;
  let mockEmailVerificationTokenRepository: jest.Mocked<EmailVerificationTokenRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEmailAdapter: jest.Mocked<EmailAdapter>;

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

    mockEmailAdapter = {
      sendEmail: jest.fn(),
    };

    sendVerificationEmail = new SendVerificationEmail(
      mockEmailVerificationTokenRepository,
      mockUserRepository,
      mockEmailAdapter
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validUser = TestFactory.createUserEntity({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      isEmailVerified: false
    });

    const mockToken = {
      id: 1,
      userId: 1,
      token: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas
      createdAt: new Date(),
      usedAt: null
    };

    it('should send verification email successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(validUser);
      mockEmailVerificationTokenRepository.deleteByUserId.mockResolvedValue(0);
      mockEmailVerificationTokenRepository.create.mockResolvedValue(mockToken as any);
      mockEmailAdapter.sendEmail.mockResolvedValue(true);

      // Act
      const result = await sendVerificationEmail.execute({ userId: validUser.id });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Verification email sent successfully',
        tokenId: mockToken.id,
        expiresAt: mockToken.expiresAt
      });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(validUser.id);
      expect(mockEmailVerificationTokenRepository.deleteByUserId).toHaveBeenCalledWith(validUser.id);
      expect(mockEmailVerificationTokenRepository.create).toHaveBeenCalledWith({
        userId: validUser.id,
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date)
      });
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalledWith({
        to: validUser.email,
        subject: '✅ Verifica tu cuenta en el Foro',
        html: expect.stringContaining(validUser.username),
        text: expect.stringContaining(validUser.username)
      });
    });

    it('should throw error if user does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(sendVerificationEmail.execute({ userId: 999 }))
        .rejects
        .toThrow(UserErrors.userNotFound(999));

      expect(mockEmailVerificationTokenRepository.create).not.toHaveBeenCalled();
      expect(mockEmailAdapter.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email is already verified', async () => {
      // Arrange
      const verifiedUser = TestFactory.createUserEntity({
        id: 1,
        isEmailVerified: true
      });
      mockUserRepository.findById.mockResolvedValue(verifiedUser);

      // Act & Assert
      await expect(sendVerificationEmail.execute({ userId: 1 }))
        .rejects
        .toThrow('Email is already verified');

      expect(mockEmailVerificationTokenRepository.create).not.toHaveBeenCalled();
      expect(mockEmailAdapter.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email sending fails', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(validUser);
      mockEmailVerificationTokenRepository.deleteByUserId.mockResolvedValue(0);
      mockEmailVerificationTokenRepository.create.mockResolvedValue(mockToken as any);
      mockEmailAdapter.sendEmail.mockResolvedValue(false);

      // Act & Assert
      await expect(sendVerificationEmail.execute({ userId: validUser.id }))
        .rejects
        .toThrow('Failed to send verification email');
    });

    it('should clean up old tokens before creating new one', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(validUser);
      mockEmailVerificationTokenRepository.deleteByUserId.mockResolvedValue(2); // 2 tokens deleted
      mockEmailVerificationTokenRepository.create.mockResolvedValue(mockToken as any);
      mockEmailAdapter.sendEmail.mockResolvedValue(true);

      // Act
      await sendVerificationEmail.execute({ userId: validUser.id });

      // Assert
      expect(mockEmailVerificationTokenRepository.deleteByUserId).toHaveBeenCalledWith(validUser.id);
      expect(mockEmailVerificationTokenRepository.create).toHaveBeenCalled();
      
      // Verificar orden de llamadas usando mock.calls
      const deleteCallOrder = mockEmailVerificationTokenRepository.deleteByUserId.mock.invocationCallOrder[0];
      const createCallOrder = mockEmailVerificationTokenRepository.create.mock.invocationCallOrder[0];
      expect(deleteCallOrder).toBeLessThan(createCallOrder);
    });
  });
});