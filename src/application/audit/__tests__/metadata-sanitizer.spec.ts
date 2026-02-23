import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataSanitizer } from '@/application/audit/services/metadata-sanitizer';

describe('MetadataSanitizer', () => {
  let sanitizer: MetadataSanitizer;

  beforeEach(() => {
    sanitizer = new MetadataSanitizer();
  });

  describe('sanitize', () => {
    it('should return empty object for null input', () => {
      expect(sanitizer.sanitize(null)).toEqual({});
    });

    it('should return empty object for undefined input', () => {
      expect(sanitizer.sanitize(undefined)).toEqual({});
    });

    it('should preserve non-sensitive fields', () => {
      const metadata = {
        title: 'My Document',
        action: 'create',
        userId: 'user-123',
      };

      expect(sanitizer.sanitize(metadata)).toEqual(metadata);
    });

    it('should remove password field', () => {
      const metadata = {
        username: 'admin',
        password: 'secret123',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        username: 'admin',
      });
    });

    it('should remove token field', () => {
      const metadata = {
        userId: 'user-123',
        token: 'jwt-token-value',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        userId: 'user-123',
      });
    });

    it('should remove secret field', () => {
      const metadata = {
        appId: 'app-123',
        clientSecret: 'supersecret',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        appId: 'app-123',
      });
    });

    it('should remove otp field', () => {
      const metadata = {
        email: 'user@example.com',
        otp: '123456',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        email: 'user@example.com',
      });
    });

    it('should remove key field', () => {
      const metadata = {
        prefix: 'sk_',
        apiKey: 'sk_live_xxxxx',
      };

      // Note: "prefix" is safe, but "apiKey" contains "key" and is removed
      expect(sanitizer.sanitize(metadata)).toEqual({
        prefix: 'sk_',
      });
    });

    it('should remove authorization field', () => {
      const metadata = {
        method: 'POST',
        authorization: 'Bearer xxx',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        method: 'POST',
      });
    });

    it('should be case-insensitive for sensitive keys', () => {
      const metadata = {
        PASSWORD: 'secret1',
        Token: 'secret2',
        SECRET: 'secret3',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({});
    });

    it('should match partial key names', () => {
      const metadata = {
        userPassword: 'secret',
        accessToken: 'token',
        clientSecret: 'secret',
        otpCode: '123456',
        apiKeyValue: 'key',
        authorizationHeader: 'Bearer xxx',
      };

      expect(sanitizer.sanitize(metadata)).toEqual({});
    });

    it('should sanitize nested objects', () => {
      const metadata = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          password: 'secret',
        },
        request: {
          method: 'POST',
          authorization: 'Bearer xxx',
        },
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        user: {
          id: 'user-123',
          email: 'user@example.com',
        },
        request: {
          method: 'POST',
        },
      });
    });

    it('should sanitize arrays with objects', () => {
      const metadata = {
        users: [
          { id: 'user-1', password: 'secret1' },
          { id: 'user-2', password: 'secret2' },
        ],
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        users: [{ id: 'user-1' }, { id: 'user-2' }],
      });
    });

    it('should preserve primitive arrays', () => {
      const metadata = {
        scopes: ['read', 'write'],
        numbers: [1, 2, 3],
      };

      expect(sanitizer.sanitize(metadata)).toEqual(metadata);
    });

    it('should handle deeply nested structures', () => {
      const metadata = {
        level1: {
          level2: {
            level3: {
              safeField: 'safe',
              password: 'secret',
            },
          },
        },
      };

      expect(sanitizer.sanitize(metadata)).toEqual({
        level1: {
          level2: {
            level3: {
              safeField: 'safe',
            },
          },
        },
      });
    });
  });

  describe('isSensitiveKey', () => {
    it('should return true for sensitive keys', () => {
      expect(sanitizer.isSensitiveKey('password')).toBe(true);
      expect(sanitizer.isSensitiveKey('token')).toBe(true);
      expect(sanitizer.isSensitiveKey('secret')).toBe(true);
      expect(sanitizer.isSensitiveKey('otp')).toBe(true);
      expect(sanitizer.isSensitiveKey('key')).toBe(true);
      expect(sanitizer.isSensitiveKey('authorization')).toBe(true);
    });

    it('should return false for non-sensitive keys', () => {
      expect(sanitizer.isSensitiveKey('title')).toBe(false);
      expect(sanitizer.isSensitiveKey('userId')).toBe(false);
      expect(sanitizer.isSensitiveKey('action')).toBe(false);
      expect(sanitizer.isSensitiveKey('email')).toBe(false);
    });

    it('should match partial key names', () => {
      expect(sanitizer.isSensitiveKey('userPassword')).toBe(true);
      expect(sanitizer.isSensitiveKey('accessToken')).toBe(true);
      expect(sanitizer.isSensitiveKey('clientSecret')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(sanitizer.isSensitiveKey('PASSWORD')).toBe(true);
      expect(sanitizer.isSensitiveKey('Token')).toBe(true);
      expect(sanitizer.isSensitiveKey('SECRET')).toBe(true);
    });
  });
});
