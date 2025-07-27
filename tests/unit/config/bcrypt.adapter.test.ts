import { bcryptAdapter } from '@/config/bcrypt.adapter';

describe('BcryptAdapter', () => {
  describe('hash', () => {
    it('should hash a password correctly', () => {
      // Arrange
      const password = 'testPassword123';

      // Act
      const hashedPassword = bcryptAdapter.hash(password);

      // Assert
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    });

    it('should generate different hashes for the same password', () => {
      // Arrange
      const password = 'testPassword123';

      // Act
      const hash1 = bcryptAdapter.hash(password);
      const hash2 = bcryptAdapter.hash(password);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = bcryptAdapter.hash(password);

      // Act
      const isValid = bcryptAdapter.compare(password, hashedPassword);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', () => {
      // Arrange
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = bcryptAdapter.hash(password);

      // Act
      const isValid = bcryptAdapter.compare(wrongPassword, hashedPassword);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = bcryptAdapter.hash(password);

      // Act
      const isValid = bcryptAdapter.compare('', hashedPassword);

      // Assert
      expect(isValid).toBe(false);
    });
  });
});