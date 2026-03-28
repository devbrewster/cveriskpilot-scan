import { decryptForTenant } from '@cveriskpilot/auth';
import type { EncryptedPayload } from '@cveriskpilot/auth';
import type { DecryptedCredentials } from './types';

// ---------------------------------------------------------------------------
// Typed Error
// ---------------------------------------------------------------------------

export class CredentialResolutionError extends Error {
  constructor(
    message: string,
    public readonly connectorId: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CredentialResolutionError';
  }
}

// ---------------------------------------------------------------------------
// Required Fields by Credential Type
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: Record<DecryptedCredentials['type'], string[]> = {
  api_key: ['baseUrl'],
  basic_auth: ['baseUrl', 'username', 'password'],
  oauth2_client: ['baseUrl', 'clientId', 'clientSecret'],
  token: ['baseUrl', 'token'],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve and decrypt credentials for a ScannerConnector.
 *
 * 1. Reads the encrypted `authConfig` JSON field from the connector record
 * 2. Decrypts using the org-scoped encryption (AES-256-GCM or KMS BYOK)
 * 3. Parses and validates the decrypted JSON into DecryptedCredentials
 *
 * NEVER logs decrypted credential values.
 */
export async function resolveCredentials(
  connector: {
    id: string;
    endpoint: string;
    authConfig: unknown;
  },
  orgId: string,
  prisma: unknown,
): Promise<DecryptedCredentials> {
  const connectorId = connector.id;

  // 1. Validate authConfig shape
  if (!connector.authConfig || typeof connector.authConfig !== 'object') {
    throw new CredentialResolutionError(
      'Connector has no authConfig or authConfig is not an object',
      connectorId,
    );
  }

  const authConfig = connector.authConfig as Record<string, unknown>;

  // 2. Decrypt the encrypted payload
  let decryptedJson: string;

  try {
    // authConfig is expected to be an EncryptedPayload (ciphertext, iv, tag, keyRef, method)
    const payload = authConfig as unknown as EncryptedPayload;

    if (!payload.ciphertext || !payload.method) {
      throw new Error('authConfig is not a valid EncryptedPayload');
    }

    decryptedJson = await decryptForTenant(payload, orgId, prisma);
  } catch (error) {
    throw new CredentialResolutionError(
      `Failed to decrypt credentials for connector ${connectorId}`,
      connectorId,
      error,
    );
  }

  // 3. Parse the decrypted JSON
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(decryptedJson);
  } catch (error) {
    throw new CredentialResolutionError(
      `Decrypted authConfig is not valid JSON for connector ${connectorId}`,
      connectorId,
      error,
    );
  }

  // 4. Build DecryptedCredentials
  const credType = parsed.type as DecryptedCredentials['type'] | undefined;

  if (!credType || !REQUIRED_FIELDS[credType]) {
    throw new CredentialResolutionError(
      `Invalid credential type "${String(credType)}" for connector ${connectorId}. ` +
        `Expected one of: ${Object.keys(REQUIRED_FIELDS).join(', ')}`,
      connectorId,
    );
  }

  const credentials: DecryptedCredentials = {
    type: credType,
    baseUrl: (parsed.baseUrl as string) ?? connector.endpoint,
    apiKey: parsed.apiKey as string | undefined,
    accessKey: parsed.accessKey as string | undefined,
    secretKey: parsed.secretKey as string | undefined,
    username: parsed.username as string | undefined,
    password: parsed.password as string | undefined,
    clientId: parsed.clientId as string | undefined,
    clientSecret: parsed.clientSecret as string | undefined,
    token: parsed.token as string | undefined,
  };

  // Fall back to connector endpoint if baseUrl is not in the credentials
  if (!credentials.baseUrl) {
    credentials.baseUrl = connector.endpoint;
  }

  // 5. Validate required fields
  const required = REQUIRED_FIELDS[credType]!;
  const missing: string[] = [];

  for (const field of required) {
    const value = credentials[field as keyof DecryptedCredentials];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new CredentialResolutionError(
      `Missing required credential fields for type "${credType}": ${missing.join(', ')}`,
      connectorId,
    );
  }

  // For api_key type, at least one key field must be present
  if (credType === 'api_key') {
    if (!credentials.apiKey && !credentials.accessKey && !credentials.token) {
      throw new CredentialResolutionError(
        'api_key credential type requires at least one of: apiKey, accessKey, token',
        connectorId,
      );
    }
  }

  return credentials;
}
