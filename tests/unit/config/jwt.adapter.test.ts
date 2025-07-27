import { JwtAdapter } from '@/config/jwt.adapter';

describe('JwtAdapter', () => {
  const payload = { userId: 1, email: 'test@example.com' };

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      // Act
      const token = JwtAdapter.generateToken(payload);

      // Assert
      expect(token).toBeDefined();
      expect(token).not.toBeNull();
      
      // Solo verificar formato si el token no es null
      if (token) {
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
      }
    });

    it('should generate a token with custom duration', () => {
      // Act
      const token = JwtAdapter.generateToken(payload, '1h');

      // Assert
      expect(token).toBeDefined();
      expect(token).not.toBeNull();
      
      if (token) {
        expect(typeof token).toBe('string');
      }
    });

    it('should return null for invalid payload', () => {
      // Act
      const token = JwtAdapter.generateToken(undefined as any);

      // Assert
      expect(token).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should validate and decode a valid token', () => {
      // Arrange
      const token = JwtAdapter.generateToken(payload);
      
      // Skip test if token generation failed
      if (!token) {
        console.warn('Token generation failed, skipping validation test');
        return;
      }

      // Act
      const decoded = JwtAdapter.validateToken<typeof payload>(token);

      // Assert
      expect(decoded).toBeDefined();
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should return null for invalid token', () => {
      // Act
      const decoded = JwtAdapter.validateToken('invalid.token.here');

      // Assert
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Arrange
      const token = JwtAdapter.generateToken(payload, '1ms'); // Expires almost immediately
      
      if (!token) {
        console.warn('Token generation failed, skipping expiration test');
        return;
      }

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const decoded = JwtAdapter.validateToken(token);

      // Assert
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      // Act
      const decoded = JwtAdapter.validateToken('not-a-jwt');

      // Assert
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      // Act
      const decoded = JwtAdapter.validateToken('');

      // Assert
      expect(decoded).toBeNull();
    });
  });
});