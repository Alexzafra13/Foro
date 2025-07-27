import { UserEntity } from '@/domain/entities/user.entity';

describe('UserEntity', () => {
  const validUserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    reputation: 100,
    roleId: 3,
    createdAt: new Date(),
    role: { id: 3, name: 'user' },
    avatarUrl: 'https://example.com/avatar.jpg'
  };

  describe('constructor', () => {
    it('should create a user entity with all properties', () => {
      // Act
      const user = new UserEntity(
        validUserData.id,
        validUserData.username,
        validUserData.email,
        validUserData.passwordHash,
        validUserData.reputation,
        validUserData.roleId,
        validUserData.createdAt,
        validUserData.role,
        validUserData.avatarUrl
      );

      // Assert
      expect(user.id).toBe(validUserData.id);
      expect(user.username).toBe(validUserData.username);
      expect(user.email).toBe(validUserData.email);
      expect(user.passwordHash).toBe(validUserData.passwordHash);
      expect(user.reputation).toBe(validUserData.reputation);
      expect(user.roleId).toBe(validUserData.roleId);
      expect(user.createdAt).toBe(validUserData.createdAt);
      expect(user.role).toBe(validUserData.role);
      expect(user.avatarUrl).toBe(validUserData.avatarUrl);
    });

    it('should create a user entity without optional properties', () => {
      // Act
      const user = new UserEntity(
        validUserData.id,
        validUserData.username,
        validUserData.email,
        validUserData.passwordHash,
        validUserData.reputation,
        validUserData.roleId,
        validUserData.createdAt
      );

      // Assert
      expect(user.role).toBeUndefined();
      expect(user.avatarUrl).toBeUndefined();
    });
  });

  describe('fromObject', () => {
    it('should create a user entity from a valid object', () => {
      // Act
      const user = UserEntity.fromObject(validUserData);

      // Assert
      expect(user).toBeInstanceOf(UserEntity);
      expect(user.id).toBe(validUserData.id);
      expect(user.username).toBe(validUserData.username);
      expect(user.email).toBe(validUserData.email);
      expect(user.passwordHash).toBe(validUserData.passwordHash);
      expect(user.reputation).toBe(validUserData.reputation);
      expect(user.roleId).toBe(validUserData.roleId);
      expect(user.createdAt).toBe(validUserData.createdAt);
      expect(user.role).toBe(validUserData.role);
      expect(user.avatarUrl).toBe(validUserData.avatarUrl);
    });

    it('should use default reputation of 0 if not provided', () => {
      // Arrange
      const dataWithoutReputation = { ...validUserData };
      delete (dataWithoutReputation as any).reputation;

      // Act
      const user = UserEntity.fromObject(dataWithoutReputation);

      // Assert
      expect(user.reputation).toBe(0);
    });

    it('should throw error if id is missing', () => {
      // Arrange
      const dataWithoutId = { ...validUserData };
      delete (dataWithoutId as any).id;

      // Act & Assert
      expect(() => UserEntity.fromObject(dataWithoutId)).toThrow('User id is required');
    });

    it('should throw error if username is missing', () => {
      // Arrange
      const dataWithoutUsername = { ...validUserData };
      delete (dataWithoutUsername as any).username;

      // Act & Assert
      expect(() => UserEntity.fromObject(dataWithoutUsername)).toThrow('User username is required');
    });

    it('should throw error if email is missing', () => {
      // Arrange
      const dataWithoutEmail = { ...validUserData };
      delete (dataWithoutEmail as any).email;

      // Act & Assert
      expect(() => UserEntity.fromObject(dataWithoutEmail)).toThrow('User email is required');
    });

    it('should throw error if passwordHash is missing', () => {
      // Arrange
      const dataWithoutPasswordHash = { ...validUserData };
      delete (dataWithoutPasswordHash as any).passwordHash;

      // Act & Assert
      expect(() => UserEntity.fromObject(dataWithoutPasswordHash)).toThrow('User passwordHash is required');
    });
  });
});