import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { UserRepository } from '@/domain/repositories/user.repository';
import { UserErrors, ValidationErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';
import { bcryptAdapter } from '@/config/bcrypt.adapter';
import { JwtAdapter } from '@/config/jwt.adapter';

// Mocks
jest.mock('@/config/bcrypt.adapter');
jest.mock('@/config/jwt.adapter');

describe('RegisterUser Use Case', () => {
  let registerUser: RegisterUser;
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

    registerUser = new RegisterUser(mockUserRepository);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validRegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      // Arrange
      const hashedPassword = 'hashed_password';
      const token = 'valid.jwt.token';
      const newUser = TestFactory.createUserEntity({
        id: 1,
        username: validRegisterDto.username,
        email: validRegisterDto.email,
        passwordHash: hashedPassword,
        roleId: 3,
        role: { id: 3, name: 'user' }
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      (bcryptAdapter.hash as jest.Mock).mockReturnValue(hashedPassword);
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(token);

      // Act
      const result = await registerUser.execute(validRegisterDto);

      // Assert
      expect(result).toEqual({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role!,
          reputation: newUser.reputation,
          createdAt: newUser.createdAt
        },
        token
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validRegisterDto.email);
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(validRegisterDto.username);
      expect(bcryptAdapter.hash).toHaveBeenCalledWith(validRegisterDto.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: validRegisterDto.username,
        email: validRegisterDto.email,
        passwordHash: hashedPassword,
        roleId: 3
      });
      expect(JwtAdapter.generateToken).toHaveBeenCalledWith({
        userId: newUser.id,
        email: newUser.email
      });
    });

    it('should throw error if email already exists', async () => {
      const existingUser = TestFactory.createUserEntity();
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(registerUser.execute(validRegisterDto))
        .rejects
        .toThrow(UserErrors.emailAlreadyExists(validRegisterDto.email));

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validRegisterDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if username already exists', async () => {
      const existingUser = TestFactory.createUserEntity();
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      await expect(registerUser.execute(validRegisterDto))
        .rejects
        .toThrow(UserErrors.usernameAlreadyExists(validRegisterDto.username));

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(validRegisterDto.username);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if JWT generation fails', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(TestFactory.createUserEntity());
      (bcryptAdapter.hash as jest.Mock).mockReturnValue('hashed');
      (JwtAdapter.generateToken as jest.Mock).mockReturnValue(null);

      await expect(registerUser.execute(validRegisterDto))
        .rejects
        .toThrow('Error generating authentication token');
    });

    describe('validation', () => {
      it('should throw error for username shorter than 3 characters', async () => {
        const invalidDto = { ...validRegisterDto, username: 'ab' };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.minLength('Username', 3));
      });

      it('should throw error for username longer than 32 characters', async () => {
        const invalidDto = { 
          ...validRegisterDto, 
          username: 'a'.repeat(33) 
        };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Username', 32));
      });

      it('should throw error for invalid email format', async () => {
        const invalidDto = { ...validRegisterDto, email: 'invalid-email' };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Email', 'valid email address'));
      });

      it('should throw error for email longer than 100 characters', async () => {
        const invalidDto = { 
          ...validRegisterDto, 
          email: 'a'.repeat(89) + '@example.com' 
        };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Email', 100));
      });

      it('should throw error for password shorter than 6 characters', async () => {
        const invalidDto = { ...validRegisterDto, password: '12345' };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.minLength('Password', 6));
      });

      it('should throw error for password longer than 100 characters', async () => {
        const invalidDto = { 
          ...validRegisterDto, 
          password: 'a'.repeat(101) 
        };

        await expect(registerUser.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Password', 100));
      });

      it('should trim username and lowercase email', async () => {
        const dtoWithSpaces = {
          username: '  testuser  ',
          email: '  TEST@EXAMPLE.COM  ',
          password: 'password123'
        };

        const expectedUsername = 'testuser';
        const expectedEmail = 'test@example.com';

        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockUserRepository.findByUsername.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue(
          TestFactory.createUserEntity({ username: expectedUsername, email: expectedEmail })
        );
        (bcryptAdapter.hash as jest.Mock).mockReturnValue('hashed');
        (JwtAdapter.generateToken as jest.Mock).mockReturnValue('token');

        await registerUser.execute(dtoWithSpaces);

        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            username: expectedUsername,
            email: expectedEmail
          })
        );
      });
    });
  });
});
