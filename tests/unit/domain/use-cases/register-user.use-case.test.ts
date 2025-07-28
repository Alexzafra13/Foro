import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { UserRepository } from '@/domain/repositories/user.repository';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { SendVerificationEmail } from '@/domain/use-cases/email/send-verification-email.use-case';
import { SendVerificationEmailResponseDto } from '@/domain/use-cases/email/send-verification-email.use-case';
import { InviteCodeErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';
import { bcryptAdapter } from '@/config/bcrypt.adapter';
import { JwtAdapter } from '@/config/jwt.adapter';

// Mocks
jest.mock('@/config/bcrypt.adapter');
jest.mock('@/config/jwt.adapter');

describe('RegisterUser Use Case (Updated with Email Verification)', () => {
  let registerUser: RegisterUser;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockInviteCodeRepository: jest.Mocked<InviteCodeRepository>;
  let mockSendVerificationEmailExecute: jest.Mock;
  let mockSendVerificationEmail: SendVerificationEmail;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    mockInviteCodeRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      markAsUsed: jest.fn(),
      deleteByCode: jest.fn(),
      getStats: jest.fn(),
    };

    // ✅ Arreglo tipado para evitar errores TS en .mockResolvedValue
    mockSendVerificationEmailExecute = jest.fn();
    mockSendVerificationEmail = {
      execute: mockSendVerificationEmailExecute
    } as unknown as SendVerificationEmail;

    registerUser = new RegisterUser(
      mockUserRepository,
      mockInviteCodeRepository,
      mockSendVerificationEmail
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validRegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      inviteCode: 'ABCD-1234-EFGH'
    };

    const validInviteCode = {
      code: 'ABCD-1234-EFGH',
      createdBy: 1,
      usedBy: null,
      usedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hora atrás
      isUsed: () => false,
      canBeUsed: () => true,
      isExpired: () => false,
      markAsUsed: jest.fn()
    };

    it('should register a new user successfully with email verification', async () => {
      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const newUser = TestFactory.createUserEntity({
        id: 1,
        username: validRegisterDto.username,
        email: validRegisterDto.email,
        passwordHash: hashedPassword,
        roleId: 3,
        role: { id: 3, name: 'user' },
        isEmailVerified: false
      });

      const emailVerificationResponse: SendVerificationEmailResponseDto = {
        success: true,
        message: 'Verification email sent successfully',
        tokenId: 1,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      };

      mockInviteCodeRepository.findByCode.mockResolvedValue(validInviteCode as any);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockInviteCodeRepository.markAsUsed.mockResolvedValue(validInviteCode as any);
      mockSendVerificationEmailExecute.mockResolvedValue(emailVerificationResponse);
      (bcryptAdapter.hash as jest.Mock).mockReturnValue(hashedPassword);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      const result = await registerUser.execute(validRegisterDto);

      expect(result).toEqual({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role!,
          reputation: newUser.reputation,
          createdAt: newUser.createdAt,
          isEmailVerified: false
        },
        token,
        inviteCodeUsed: validRegisterDto.inviteCode,
        emailVerificationSent: true
      });

      expect(mockSendVerificationEmailExecute).toHaveBeenCalledWith({
        userId: newUser.id
      });
    });

    it('should register user even if email verification fails', async () => {
      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const newUser = TestFactory.createUserEntity({
        id: 1,
        username: validRegisterDto.username,
        email: validRegisterDto.email,
        passwordHash: hashedPassword,
        roleId: 3,
        role: { id: 3, name: 'user' },
        isEmailVerified: false
      });

      mockInviteCodeRepository.findByCode.mockResolvedValue(validInviteCode as any);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockInviteCodeRepository.markAsUsed.mockResolvedValue(validInviteCode as any);
      mockSendVerificationEmailExecute.mockRejectedValue(new Error('Email service failed'));
      (bcryptAdapter.hash as jest.Mock).mockReturnValue(hashedPassword);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      const result = await registerUser.execute(validRegisterDto);

      expect(result).toEqual({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role!,
          reputation: newUser.reputation,
          createdAt: newUser.createdAt,
          isEmailVerified: false
        },
        token,
        inviteCodeUsed: validRegisterDto.inviteCode,
        emailVerificationSent: false
      });

      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockInviteCodeRepository.markAsUsed).toHaveBeenCalled();
    });

    it('should create user with isEmailVerified = false by default', async () => {
      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const newUser = TestFactory.createUserEntity({ isEmailVerified: false });

      mockInviteCodeRepository.findByCode.mockResolvedValue(validInviteCode as any);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockInviteCodeRepository.markAsUsed.mockResolvedValue(validInviteCode as any);
      mockSendVerificationEmailExecute.mockResolvedValue({
        success: true,
        message: 'Email sent',
        tokenId: 1,
        expiresAt: new Date()
      });
      (bcryptAdapter.hash as jest.Mock).mockReturnValue(hashedPassword);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      const result = await registerUser.execute(validRegisterDto);

      expect(result.user.isEmailVerified).toBe(false);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: validRegisterDto.username,
        email: validRegisterDto.email.toLowerCase(),
        passwordHash: hashedPassword,
        roleId: 3
      });
    });

    it('should throw error if invite code does not exist', async () => {
      mockInviteCodeRepository.findByCode.mockResolvedValue(null);

      await expect(registerUser.execute(validRegisterDto))
        .rejects
        .toThrow(InviteCodeErrors.codeNotFound(validRegisterDto.inviteCode));

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockSendVerificationEmailExecute).not.toHaveBeenCalled();
    });

    it('should throw error if invite code is already used', async () => {
      const usedInviteCode = {
        ...validInviteCode,
        usedBy: 999,
        usedAt: new Date(),
        isUsed: () => true,
        user: { id: 999, username: 'otheruser' }
      };

      mockInviteCodeRepository.findByCode.mockResolvedValue(usedInviteCode as any);

      await expect(registerUser.execute(validRegisterDto))
        .rejects
        .toThrow(InviteCodeErrors.codeAlreadyUsed(
          validRegisterDto.inviteCode,
          'otheruser',
          usedInviteCode.usedAt
        ));

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockSendVerificationEmailExecute).not.toHaveBeenCalled();
    });

    it('should normalize data before processing', async () => {
      const dtoWithSpaces = {
        username: '  testuser  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
        inviteCode: '  abcd-1234-efgh  '
      };

      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const newUser = TestFactory.createUserEntity();

      mockInviteCodeRepository.findByCode.mockResolvedValue(validInviteCode as any);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockInviteCodeRepository.markAsUsed.mockResolvedValue(validInviteCode as any);
      mockSendVerificationEmailExecute.mockResolvedValue({
        success: true,
        message: 'Email sent',
        tokenId: 1,
        expiresAt: new Date()
      });
      (bcryptAdapter.hash as jest.Mock).mockReturnValue(hashedPassword);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      await registerUser.execute(dtoWithSpaces);

      expect(mockInviteCodeRepository.findByCode).toHaveBeenCalledWith('ABCD-1234-EFGH');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        roleId: 3
      });
    });
  });
});
