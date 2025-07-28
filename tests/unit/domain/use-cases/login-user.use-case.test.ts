import { LoginUser } from '@/domain/use-cases/auth/login-user.use-case';
import { UserRepository } from '@/domain/repositories/user.repository';
import { UserErrors, ValidationErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';
import { bcryptAdapter } from '@/config/bcrypt.adapter';
import { JwtAdapter } from '@/config/jwt.adapter';

// Mocks
jest.mock('@/config/bcrypt.adapter');
jest.mock('@/config/jwt.adapter');

describe('LoginUser Use Case', () => {
  let loginUser: LoginUser;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    loginUser = new LoginUser(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validLoginDto = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const existingUser = TestFactory.createUserEntity({
        id: 1,
        email: validLoginDto.email,
        passwordHash: hashedPassword,
        role: { id: 3, name: 'user' }
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      (bcryptAdapter.compare as jest.Mock).mockReturnValue(true);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      // Act
      const result = await loginUser.execute(validLoginDto);

      // Assert
      expect(result).toEqual({
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role!,
          reputation: existingUser.reputation,
          createdAt: existingUser.createdAt
        },
        token
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validLoginDto.email.toLowerCase());
      expect(bcryptAdapter.compare).toHaveBeenCalledWith(validLoginDto.password, hashedPassword);
      expect(JwtAdapter.generateToken).toHaveBeenCalledWith({
        userId: existingUser.id,
        email: existingUser.email
      });
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(loginUser.execute(validLoginDto))
        .rejects
        .toThrow(UserErrors.invalidCredentials());

      expect(bcryptAdapter.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      // Arrange
      const user = TestFactory.createUserEntity();
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcryptAdapter.compare as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(loginUser.execute(validLoginDto))
        .rejects
        .toThrow(UserErrors.invalidCredentials());

      expect(JwtAdapter.generateToken).not.toHaveBeenCalled();
    });

    it('should throw error if JWT generation fails', async () => {
      // Arrange
      const user = TestFactory.createUserEntity();
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcryptAdapter.compare as jest.Mock).mockReturnValue(true);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(loginUser.execute(validLoginDto))
        .rejects
        .toThrow('Error generating authentication token');
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const uppercaseEmail = 'TEST@EXAMPLE.COM';
      const user = TestFactory.createUserEntity();
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcryptAdapter.compare as jest.Mock).mockReturnValue(true);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue('token');

      // Act
      await loginUser.execute({ email: uppercaseEmail, password: 'password' });

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    describe('validation', () => {
      it('should throw error for empty email', async () => {
        // Arrange
        const invalidDto = { email: '', password: 'password123' };

        // Act & Assert
        await expect(loginUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Email'));
      });

      it('should throw error for invalid email format', async () => {
        // Arrange
        const invalidDto = { email: 'invalid-email', password: 'password123' };

        // Act & Assert
        await expect(loginUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Email', 'valid email address'));
      });

      it('should throw error for empty password', async () => {
        // Arrange
        const invalidDto = { email: 'test@example.com', password: '' };

        // Act & Assert
        await expect(loginUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Password'));
      });
    });
  });
});