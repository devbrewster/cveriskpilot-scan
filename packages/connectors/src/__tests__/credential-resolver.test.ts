import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCredentials, CredentialResolutionError } from '../credential-resolver';

// ---------------------------------------------------------------------------
// Mock the @cveriskpilot/auth module
// ---------------------------------------------------------------------------

vi.mock('@cveriskpilot/auth', () => ({
  decryptForTenant: vi.fn(),
}));

import { decryptForTenant } from '@cveriskpilot/auth';

const mockDecrypt = vi.mocked(decryptForTenant);

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeConnector(authConfig: unknown, endpoint = 'https://scanner.example.com') {
  return {
    id: 'conn-test-001',
    endpoint,
    authConfig,
  };
}

function makeEncryptedPayload(decryptedJson: string) {
  // Simulates what an EncryptedPayload looks like
  const payload = {
    ciphertext: 'encrypted-data-base64',
    iv: 'iv-base64',
    tag: 'tag-base64',
    keyRef: 'org-key-001',
    method: 'aes-256-gcm',
  };
  mockDecrypt.mockResolvedValueOnce(decryptedJson);
  return payload;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveCredentials', () => {
  const orgId = 'org-test-001';
  const mockPrisma = {};

  beforeEach(() => {
    mockDecrypt.mockReset();
  });

  // -------------------------------------------------------------------------
  // api_key type
  // -------------------------------------------------------------------------

  describe('api_key credentials', () => {
    it('resolves api_key credentials with apiKey field', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'api_key',
          apiKey: 'my-secret-api-key',
          baseUrl: 'https://cloud.tenable.com',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('api_key');
      expect(result.apiKey).toBe('my-secret-api-key');
      expect(result.baseUrl).toBe('https://cloud.tenable.com');
    });

    it('resolves api_key credentials with accessKey + secretKey', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'api_key',
          accessKey: 'access-123',
          secretKey: 'secret-456',
          baseUrl: 'https://cloud.tenable.com',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('api_key');
      expect(result.accessKey).toBe('access-123');
      expect(result.secretKey).toBe('secret-456');
    });

    it('resolves api_key credentials with token field', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'api_key',
          token: 'bearer-token-xyz',
          baseUrl: 'https://scanner.example.com',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('api_key');
      expect(result.token).toBe('bearer-token-xyz');
    });

    it('throws when api_key type has no key fields', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'api_key',
          baseUrl: 'https://scanner.example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(CredentialResolutionError);

      await expect(
        resolveCredentials(
          makeConnector(makeEncryptedPayload(
            JSON.stringify({ type: 'api_key', baseUrl: 'https://scanner.example.com' }),
          )),
          orgId,
          mockPrisma,
        ),
      ).rejects.toThrow(/at least one of: apiKey, accessKey, token/);
    });
  });

  // -------------------------------------------------------------------------
  // basic_auth type
  // -------------------------------------------------------------------------

  describe('basic_auth credentials', () => {
    it('resolves basic_auth credentials', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'basic_auth',
          username: 'qualys-user',
          password: 'qualys-pass',
          baseUrl: 'https://qualysapi.qualys.com',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('basic_auth');
      expect(result.username).toBe('qualys-user');
      expect(result.password).toBe('qualys-pass');
      expect(result.baseUrl).toBe('https://qualysapi.qualys.com');
    });

    it('throws when username is missing for basic_auth', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'basic_auth',
          password: 'pass',
          baseUrl: 'https://scanner.example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Missing required credential fields.*username/);
    });

    it('throws when password is missing for basic_auth', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'basic_auth',
          username: 'user',
          baseUrl: 'https://scanner.example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Missing required credential fields.*password/);
    });
  });

  // -------------------------------------------------------------------------
  // oauth2_client type
  // -------------------------------------------------------------------------

  describe('oauth2_client credentials', () => {
    it('resolves oauth2_client credentials', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'oauth2_client',
          clientId: 'cs-client-id',
          clientSecret: 'cs-client-secret',
          baseUrl: 'https://api.crowdstrike.com',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('oauth2_client');
      expect(result.clientId).toBe('cs-client-id');
      expect(result.clientSecret).toBe('cs-client-secret');
    });

    it('throws when clientId is missing for oauth2_client', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'oauth2_client',
          clientSecret: 'secret',
          baseUrl: 'https://api.example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Missing required credential fields.*clientId/);
    });

    it('throws when clientSecret is missing for oauth2_client', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'oauth2_client',
          clientId: 'client-id',
          baseUrl: 'https://api.example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Missing required credential fields.*clientSecret/);
    });
  });

  // -------------------------------------------------------------------------
  // token type
  // -------------------------------------------------------------------------

  describe('token credentials', () => {
    it('resolves token credentials', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'token',
          token: 'snyk-api-token-12345',
          baseUrl: 'https://api.snyk.io',
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig),
        orgId,
        mockPrisma,
      );

      expect(result.type).toBe('token');
      expect(result.token).toBe('snyk-api-token-12345');
      expect(result.baseUrl).toBe('https://api.snyk.io');
    });

    it('throws when token is missing', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'token',
          baseUrl: 'https://api.snyk.io',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Missing required credential fields.*token/);
    });
  });

  // -------------------------------------------------------------------------
  // baseUrl fallback
  // -------------------------------------------------------------------------

  describe('baseUrl resolution', () => {
    it('falls back to connector endpoint when baseUrl is not in credentials', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'token',
          token: 'my-token',
          // No baseUrl in credentials
        }),
      );

      const result = await resolveCredentials(
        makeConnector(authConfig, 'https://fallback.example.com'),
        orgId,
        mockPrisma,
      );

      expect(result.baseUrl).toBe('https://fallback.example.com');
    });
  });

  // -------------------------------------------------------------------------
  // Decryption failures
  // -------------------------------------------------------------------------

  describe('decryption failures', () => {
    it('throws CredentialResolutionError on decryption failure', async () => {
      const authConfig = {
        ciphertext: 'corrupted-data',
        iv: 'iv',
        tag: 'tag',
        keyRef: 'key',
        method: 'aes-256-gcm',
      };

      mockDecrypt.mockRejectedValueOnce(new Error('Decryption failed: bad ciphertext'));

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(CredentialResolutionError);
    });

    it('wraps decryption errors without exposing decrypted data', async () => {
      const authConfig = {
        ciphertext: 'data',
        iv: 'iv',
        tag: 'tag',
        keyRef: 'key',
        method: 'aes-256-gcm',
      };

      mockDecrypt.mockRejectedValueOnce(new Error('KMS key not found'));

      try {
        await resolveCredentials(makeConnector(authConfig), orgId, mockPrisma);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CredentialResolutionError);
        const credErr = err as CredentialResolutionError;
        expect(credErr.message).toContain('Failed to decrypt credentials');
        expect(credErr.connectorId).toBe('conn-test-001');
        // Should NOT contain any credential values
        expect(credErr.message).not.toContain('my-secret');
        expect(credErr.message).not.toContain('password');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Invalid input shapes
  // -------------------------------------------------------------------------

  describe('invalid input', () => {
    it('throws when authConfig is null', async () => {
      await expect(
        resolveCredentials(makeConnector(null), orgId, mockPrisma),
      ).rejects.toThrow(CredentialResolutionError);
    });

    it('throws when authConfig is not an object', async () => {
      await expect(
        resolveCredentials(makeConnector('not-an-object'), orgId, mockPrisma),
      ).rejects.toThrow(CredentialResolutionError);
    });

    it('throws for invalid credential type', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'invalid_type',
          baseUrl: 'https://example.com',
        }),
      );

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/Invalid credential type/);
    });

    it('throws when decrypted JSON is invalid', async () => {
      const authConfig = {
        ciphertext: 'data',
        iv: 'iv',
        tag: 'tag',
        keyRef: 'key',
        method: 'aes-256-gcm',
      };

      mockDecrypt.mockResolvedValueOnce('not-valid-json{{{');

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(/not valid JSON/);
    });

    it('throws when authConfig has no ciphertext/method fields', async () => {
      const authConfig = { someField: 'value' };

      await expect(
        resolveCredentials(makeConnector(authConfig), orgId, mockPrisma),
      ).rejects.toThrow(CredentialResolutionError);
    });
  });

  // -------------------------------------------------------------------------
  // Error messages never include decrypted values
  // -------------------------------------------------------------------------

  describe('security: no decrypted values in errors', () => {
    it('does not include password in error messages', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'basic_auth',
          username: 'admin',
          // Missing password — but it should never appear in errors anyway
          baseUrl: 'https://scanner.example.com',
        }),
      );

      try {
        await resolveCredentials(makeConnector(authConfig), orgId, mockPrisma);
        expect.unreachable('Should have thrown');
      } catch (err) {
        const errStr = String(err);
        expect(errStr).not.toContain('admin');
      }
    });

    it('CredentialResolutionError includes connectorId for debugging', async () => {
      const authConfig = makeEncryptedPayload(
        JSON.stringify({
          type: 'token',
          // Missing token
          baseUrl: 'https://api.example.com',
        }),
      );

      try {
        await resolveCredentials(makeConnector(authConfig), orgId, mockPrisma);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CredentialResolutionError);
        const credErr = err as CredentialResolutionError;
        expect(credErr.connectorId).toBe('conn-test-001');
        expect(credErr.name).toBe('CredentialResolutionError');
      }
    });
  });
});
