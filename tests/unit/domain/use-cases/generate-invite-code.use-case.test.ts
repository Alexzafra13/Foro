import { GenerateInviteCode } from '@/domain/use-cases/invites/generate-invite-code.use-case';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { UserErrors, ValidationErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

describe('GenerateInviteCode Use Case', () => {
  let generateInviteCode: GenerateInviteCode;
  let mockInviteCodeRepository: jest.Mocked<InviteCodeRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockInviteCodeRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      markAsUsed: jest.fn(),
      deleteByCode: jest.fn(),
      getStats: jest.fn(),
    };

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    generateInviteCode = new GenerateInviteCode(mockInviteCodeRepository, mockUserRepository);
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const adminUser = TestFactory.createUserEntity({
      id: 1,
      username: 'admin',
      role: { id: 1, name: 'admin' }
    });

    const moderatorUser = TestFactory.createUserEntity({
      id: 2,
      username: 'moderator',
      role: { id: 2, name: 'moderator' }
    });

    const regularUser = TestFactory.createUserEntity({
      id: 3,
      username: 'user',
      role: { id: 3, name: 'user' }
    });

    it('should generate invite code for admin user', async () => {
      // Arrange
      const mockInviteCode = {
        code: 'GENERATED-CODE', // ✅ No importa el código específico
        createdBy: adminUser.id,
        usedBy: null,
        usedAt: null,
        createdAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockInviteCodeRepository.findByCode.mockResolvedValue(null);
      mockInviteCodeRepository.create.mockResolvedValue(mockInviteCode as any);

      // Act
      const result = await generateInviteCode.execute({
        createdBy: adminUser.id
      });

      // Assert
      expect(result).toEqual({
        code: expect.stringMatching(/^[A-Z0-9-]+$/), // ✅ Verificar formato, no valor exacto
        createdBy: adminUser.id,
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        creator: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role!.name
        }
      });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(adminUser.id);
      expect(mockInviteCodeRepository.create).toHaveBeenCalledWith({
        code: expect.stringMatching(/^[A-Z0-9-]+$/), // ✅ Verificar formato
        createdBy: adminUser.id
      });
    });

    it('should generate invite code for moderator user', async () => {
      // Arrange
      const mockInviteCode = {
        code: 'MOD-CODE-123',
        createdBy: moderatorUser.id,
        usedBy: null,
        usedAt: null,
        createdAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(moderatorUser);
      mockInviteCodeRepository.findByCode.mockResolvedValue(null);
      mockInviteCodeRepository.create.mockResolvedValue(mockInviteCode as any);

      // Act
      const result = await generateInviteCode.execute({
        createdBy: moderatorUser.id
      });

      // Assert
      expect(result.creator.role).toBe('moderator');
    });

    it('should throw error if user does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(generateInviteCode.execute({
        createdBy: 999
      })).rejects.toThrow(UserErrors.userNotFound(999));

      expect(mockInviteCodeRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if user is not admin or moderator', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(regularUser);

      // Act & Assert
      await expect(generateInviteCode.execute({
        createdBy: regularUser.id
      })).rejects.toThrow(UserErrors.insufficientPermissions());

      expect(mockInviteCodeRepository.create).not.toHaveBeenCalled();
    });

    it('should generate custom code when provided', async () => {
      // Arrange
      const customCode = 'CUSTOM-INVITE';
      const mockInviteCode = {
        code: customCode,
        createdBy: adminUser.id,
        usedBy: null,
        usedAt: null,
        createdAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockInviteCodeRepository.findByCode.mockResolvedValue(null);
      mockInviteCodeRepository.create.mockResolvedValue(mockInviteCode as any);

      // Act
      const result = await generateInviteCode.execute({
        createdBy: adminUser.id,
        customCode
      });

      // Assert
      expect(result.code).toBe(customCode);
      expect(mockInviteCodeRepository.create).toHaveBeenCalledWith({
        code: customCode,
        createdBy: adminUser.id
      });
    });

    it('should throw error if custom code already exists', async () => {
      // Arrange
      const existingCode = 'EXISTING-CODE';
      const existingInviteCode = { code: existingCode };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockInviteCodeRepository.findByCode.mockResolvedValue(existingInviteCode as any);

      // Act & Assert
      await expect(generateInviteCode.execute({
        createdBy: adminUser.id,
        customCode: existingCode
      })).rejects.toThrow(ValidationErrors.invalidFormat('Code', 'unique code (already exists)'));

      expect(mockInviteCodeRepository.create).not.toHaveBeenCalled();
    });

    it('should calculate correct expiration date (7 days)', async () => {
      // Arrange
      const mockInviteCode = {
        code: 'TEST-CODE-123',
        createdBy: adminUser.id,
        usedBy: null,
        usedAt: null,
        createdAt: new Date('2024-01-01T10:00:00Z')
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockInviteCodeRepository.findByCode.mockResolvedValue(null);
      mockInviteCodeRepository.create.mockResolvedValue(mockInviteCode as any);

      // Act
      const result = await generateInviteCode.execute({
        createdBy: adminUser.id
      });

      // Assert
      const expectedExpiration = new Date('2024-01-08T10:00:00Z');
      expect(result.expiresAt).toEqual(expectedExpiration);
    });

    describe('custom code validation', () => {
      beforeEach(() => {
        mockUserRepository.findById.mockResolvedValue(adminUser);
        mockInviteCodeRepository.findByCode.mockResolvedValue(null);
      });

      it('should throw error for custom code shorter than 6 characters', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: '12345'
        })).rejects.toThrow(ValidationErrors.minLength('Custom code', 6));
      });

      it('should throw error for custom code longer than 20 characters', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: 'A'.repeat(21)
        })).rejects.toThrow(ValidationErrors.maxLength('Custom code', 20));
      });

      it('should throw error for custom code with invalid characters', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: 'INVALID@CODE'
        })).rejects.toThrow(ValidationErrors.invalidFormat(
          'Custom code', 
          'alphanumeric characters and hyphens only'
        ));
      });

      it('should throw error for custom code starting with hyphen', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: '-INVALID'
        })).rejects.toThrow(ValidationErrors.invalidFormat(
          'Custom code', 
          'cannot start or end with hyphen'
        ));
      });

      it('should throw error for custom code ending with hyphen', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: 'INVALID-'
        })).rejects.toThrow(ValidationErrors.invalidFormat(
          'Custom code', 
          'cannot start or end with hyphen'
        ));
      });

      it('should throw error for custom code with consecutive hyphens', async () => {
        await expect(generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: 'INVALID--CODE'
        })).rejects.toThrow(ValidationErrors.invalidFormat(
          'Custom code', 
          'cannot have consecutive hyphens'
        ));
      });

      it('should normalize custom code to uppercase', async () => {
        const mockInviteCode = {
          code: 'VALID-CODE',
          createdBy: adminUser.id,
          usedBy: null,
          usedAt: null,
          createdAt: new Date()
        };

        mockInviteCodeRepository.create.mockResolvedValue(mockInviteCode as any);

        const result = await generateInviteCode.execute({
          createdBy: adminUser.id,
          customCode: 'valid-code'
        });

        expect(result.code).toBe('VALID-CODE');
      });
    });
  });
});