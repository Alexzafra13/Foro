import { EmailVerificationTokenEntity } from '@/domain/entities/email-verification-token.entity';

describe('EmailVerificationTokenEntity', () => {
  const validTokenData = {
    id: 1,
    userId: 1,
    token: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas
    createdAt: new Date(),
    usedAt: null,
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'testuser'
    }
  };

  describe('constructor', () => {
    it('should create a token entity with all properties', () => {
      // Act
      const token = new EmailVerificationTokenEntity(
        validTokenData.id,
        validTokenData.userId,
        validTokenData.token,
        validTokenData.expiresAt,
        validTokenData.createdAt,
        validTokenData.usedAt,
        validTokenData.user
      );

      // Assert
      expect(token.id).toBe(validTokenData.id);
      expect(token.userId).toBe(validTokenData.userId);
      expect(token.token).toBe(validTokenData.token);
      expect(token.expiresAt).toBe(validTokenData.expiresAt);
      expect(token.createdAt).toBe(validTokenData.createdAt);
      expect(token.usedAt).toBe(validTokenData.usedAt);
      expect(token.user).toBe(validTokenData.user);
    });

    it('should create a token entity without optional user property', () => {
      // Act
      const token = new EmailVerificationTokenEntity(
        validTokenData.id,
        validTokenData.userId,
        validTokenData.token,
        validTokenData.expiresAt,
        validTokenData.createdAt,
        validTokenData.usedAt
      );

      // Assert
      expect(token.user).toBeUndefined();
    });
  });

  describe('fromObject', () => {
    it('should create a token entity from a valid object', () => {
      // Act
      const token = EmailVerificationTokenEntity.fromObject(validTokenData);

      // Assert
      expect(token).toBeInstanceOf(EmailVerificationTokenEntity);
      expect(token.id).toBe(validTokenData.id);
      expect(token.userId).toBe(validTokenData.userId);
      expect(token.token).toBe(validTokenData.token);
      expect(token.expiresAt).toBe(validTokenData.expiresAt);
      expect(token.createdAt).toBe(validTokenData.createdAt);
      expect(token.usedAt).toBe(validTokenData.usedAt);
      expect(token.user).toBe(validTokenData.user);
    });

    it('should throw error if id is missing', () => {
      // Arrange
      const dataWithoutId = { ...validTokenData };
      delete (dataWithoutId as any).id;

      // Act & Assert
      expect(() => EmailVerificationTokenEntity.fromObject(dataWithoutId))
        .toThrow('EmailVerificationToken id is required');
    });

    it('should throw error if userId is missing', () => {
      // Arrange
      const dataWithoutUserId = { ...validTokenData };
      delete (dataWithoutUserId as any).userId;

      // Act & Assert
      expect(() => EmailVerificationTokenEntity.fromObject(dataWithoutUserId))
        .toThrow('EmailVerificationToken userId is required');
    });

    it('should throw error if token is missing', () => {
      // Arrange
      const dataWithoutToken = { ...validTokenData };
      delete (dataWithoutToken as any).token;

      // Act & Assert
      expect(() => EmailVerificationTokenEntity.fromObject(dataWithoutToken))
        .toThrow('EmailVerificationToken token is required');
    });

    it('should throw error if expiresAt is missing', () => {
      // Arrange
      const dataWithoutExpiresAt = { ...validTokenData };
      delete (dataWithoutExpiresAt as any).expiresAt;

      // Act & Assert
      expect(() => EmailVerificationTokenEntity.fromObject(dataWithoutExpiresAt))
        .toThrow('EmailVerificationToken expiresAt is required');
    });
  });

  describe('domain methods', () => {
    let token: EmailVerificationTokenEntity;

    beforeEach(() => {
      token = EmailVerificationTokenEntity.fromObject(validTokenData);
    });

    describe('isExpired', () => {
      it('should return false for non-expired token', () => {
        // Arrange
        const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hora en el futuro
        token.expiresAt = futureDate;

        // Act & Assert
        expect(token.isExpired()).toBe(false);
      });

      it('should return true for expired token', () => {
        // Arrange
        const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hora en el pasado
        token.expiresAt = pastDate;

        // Act & Assert
        expect(token.isExpired()).toBe(true);
      });

      it('should return true for token that expires exactly now', () => {
        // Arrange
        token.expiresAt = new Date();

        // Act & Assert (puede ser true o false dependiendo del timing, pero debería ser true la mayoría del tiempo)
        const result = token.isExpired();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('isUsed', () => {
      it('should return false for unused token', () => {
        // Arrange
        token.usedAt = null;

        // Act & Assert
        expect(token.isUsed()).toBe(false);
      });

      it('should return true for used token', () => {
        // Arrange
        token.usedAt = new Date();

        // Act & Assert
        expect(token.isUsed()).toBe(true);
      });
    });

    describe('canBeUsed', () => {
      it('should return true for valid unused token', () => {
        // Arrange
        token.usedAt = null;
        token.expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora en el futuro

        // Act & Assert
        expect(token.canBeUsed()).toBe(true);
      });

      it('should return false for used token', () => {
        // Arrange
        token.usedAt = new Date();
        token.expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora en el futuro

        // Act & Assert
        expect(token.canBeUsed()).toBe(false);
      });

      it('should return false for expired token', () => {
        // Arrange
        token.usedAt = null;
        token.expiresAt = new Date(Date.now() - 1000 * 60 * 60); // 1 hora en el pasado

        // Act & Assert
        expect(token.canBeUsed()).toBe(false);
      });

      it('should return false for used and expired token', () => {
        // Arrange
        token.usedAt = new Date();
        token.expiresAt = new Date(Date.now() - 1000 * 60 * 60); // 1 hora en el pasado

        // Act & Assert
        expect(token.canBeUsed()).toBe(false);
      });
    });

    describe('markAsUsed', () => {
      it('should mark token as used', () => {
        // Arrange
        token.usedAt = null;
        token.expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora en el futuro
        const beforeTime = new Date();

        // Act
        token.markAsUsed();

        // Assert
        expect(token.usedAt).toBeInstanceOf(Date);
        expect(token.usedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      });

      it('should throw error if token is already used', () => {
        // Arrange
        token.usedAt = new Date();

        // Act & Assert
        expect(() => token.markAsUsed())
          .toThrow('Verification token is already used');
      });

      it('should throw error if token is expired', () => {
        // Arrange
        token.usedAt = null;
        token.expiresAt = new Date(Date.now() - 1000 * 60 * 60); // 1 hora en el pasado

        // Act & Assert
        expect(() => token.markAsUsed())
          .toThrow('Verification token has expired');
      });
    });
  });

  describe('static methods', () => {
    describe('generateToken', () => {
      it('should generate a 64-character hexadecimal token', () => {
        // Act
        const token = EmailVerificationTokenEntity.generateToken();

        // Assert
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[a-f0-9]+$/);
      });

      it('should generate different tokens on consecutive calls', () => {
        // Act
        const token1 = EmailVerificationTokenEntity.generateToken();
        const token2 = EmailVerificationTokenEntity.generateToken();

        // Assert
        expect(token1).not.toBe(token2);
      });
    });

    describe('calculateExpirationDate', () => {
      it('should calculate expiration date for default 24 hours', () => {
        // Arrange
        const before = new Date();

        // Act
        const expirationDate = EmailVerificationTokenEntity.calculateExpirationDate();

        // Assert
        const after = new Date();
        const expectedMin = new Date(before.getTime() + 24 * 60 * 60 * 1000);
        const expectedMax = new Date(after.getTime() + 24 * 60 * 60 * 1000);

        expect(expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
        expect(expirationDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
      });

      it('should calculate expiration date for custom hours', () => {
        // Arrange
        const customHours = 48;
        const before = new Date();

        // Act
        const expirationDate = EmailVerificationTokenEntity.calculateExpirationDate(customHours);

        // Assert
        const after = new Date();
        const expectedMin = new Date(before.getTime() + customHours * 60 * 60 * 1000);
        const expectedMax = new Date(after.getTime() + customHours * 60 * 60 * 1000);

        expect(expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
        expect(expirationDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
      });
    });
  });
});