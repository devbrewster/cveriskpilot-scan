// Per-tenant encryption for CVERiskPilot
// Supports Cloud KMS BYOK per-org with AES-256-GCM fallback

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV */
  iv: string;
  /** Base64-encoded auth tag (GCM) */
  tag: string;
  /** Key version or reference for KMS rotation */
  keyRef: string;
  /** Encryption method: 'kms' or 'local' */
  method: 'kms' | 'local';
}

interface KmsKeyConfig {
  /** Full KMS key resource name (e.g., projects/X/locations/Y/keyRings/Z/cryptoKeys/K) */
  kmsKeyName: string;
  /** GCP project for KMS API calls */
  projectId?: string;
}

// ---------------------------------------------------------------------------
// KMS Configuration Cache
// ---------------------------------------------------------------------------

const orgKmsCache = new Map<string, KmsKeyConfig | null>();

/**
 * Get KMS key configuration for an organization from its settings.
 * Falls back to null if KMS is not configured for the org.
 */
async function getOrgKmsConfig(
  orgId: string,
  prisma?: any,
): Promise<KmsKeyConfig | null> {
  if (orgKmsCache.has(orgId)) {
    return orgKmsCache.get(orgId)!;
  }

  if (!prisma) return null;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { entitlements: true },
    });

    if (!org?.entitlements) {
      orgKmsCache.set(orgId, null);
      return null;
    }

    const entitlements = org.entitlements as Record<string, unknown>;
    const kmsConfig = entitlements.kmsKeyConfig as KmsKeyConfig | undefined;

    if (kmsConfig?.kmsKeyName) {
      orgKmsCache.set(orgId, kmsConfig);
      return kmsConfig;
    }
  } catch {
    // Ignore — fall back to local encryption
  }

  orgKmsCache.set(orgId, null);
  return null;
}

/**
 * Clear the KMS config cache for an org (e.g., after config update).
 */
export function clearKmsCache(orgId?: string): void {
  if (orgId) {
    orgKmsCache.delete(orgId);
  } else {
    orgKmsCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Local AES-256-GCM Encryption (fallback)
// ---------------------------------------------------------------------------

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

/**
 * Get the app-level encryption key from environment.
 * Must be a 32-byte hex string (64 hex chars).
 */
function getAppEncryptionKey(): Buffer {
  const keyHex = process.env.APP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;

  if (!keyHex) {
    throw new Error(
      'No encryption key available. Set APP_ENCRYPTION_KEY (64 hex chars) or AUTH_SECRET.',
    );
  }

  // Derive a consistent 32-byte key from the secret
  return crypto.createHash('sha256').update(keyHex).digest();
}

function encryptLocal(data: string): EncryptedPayload {
  const key = getAppEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyRef: 'app-local',
    method: 'local',
  };
}

function decryptLocal(payload: EncryptedPayload): string {
  const key = getAppEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ---------------------------------------------------------------------------
// Cloud KMS Encryption
// ---------------------------------------------------------------------------

async function encryptWithKms(
  data: string,
  kmsConfig: KmsKeyConfig,
): Promise<EncryptedPayload> {
  // Encrypt locally first, then wrap the local key with KMS (envelope encryption)
  // This is the recommended pattern for Cloud KMS to avoid sending large data over the wire
  const localPayload = encryptLocal(data);

  try {
    const accessToken = await getGCPAccessToken();
    const kmsUrl = `https://cloudkms.googleapis.com/v1/${kmsConfig.kmsKeyName}:encrypt`;

    const response = await fetch(kmsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plaintext: Buffer.from(JSON.stringify(localPayload)).toString('base64'),
      }),
    });

    if (!response.ok) {
      throw new Error(`KMS encrypt failed: ${response.status}`);
    }

    const result = (await response.json()) as { ciphertext: string; name: string };

    return {
      ciphertext: result.ciphertext,
      iv: '',
      tag: '',
      keyRef: kmsConfig.kmsKeyName,
      method: 'kms',
    };
  } catch (error) {
    // Fall back to local encryption if KMS is unavailable
    console.warn(`KMS encryption failed, falling back to local: ${error}`);
    return localPayload;
  }
}

async function decryptWithKms(
  payload: EncryptedPayload,
  kmsConfig: KmsKeyConfig,
): Promise<string> {
  const accessToken = await getGCPAccessToken();
  const kmsUrl = `https://cloudkms.googleapis.com/v1/${kmsConfig.kmsKeyName}:decrypt`;

  const response = await fetch(kmsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ciphertext: payload.ciphertext,
    }),
  });

  if (!response.ok) {
    throw new Error(`KMS decrypt failed: ${response.status}`);
  }

  const result = (await response.json()) as { plaintext: string };
  const innerPayload = JSON.parse(
    Buffer.from(result.plaintext, 'base64').toString('utf8'),
  ) as EncryptedPayload;

  return decryptLocal(innerPayload);
}

/**
 * Get a GCP access token from the metadata server or application default credentials.
 */
async function getGCPAccessToken(): Promise<string> {
  // Try metadata server first (when running on GCP)
  try {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(2000),
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    }
  } catch {
    // Not on GCP — fall through
  }

  // Fall back to GOOGLE_APPLICATION_CREDENTIALS / gcloud
  throw new Error(
    'Could not obtain GCP access token. Ensure the application is running on GCP or GOOGLE_APPLICATION_CREDENTIALS is set.',
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt data for a specific tenant/organization.
 * Uses the org's KMS key if configured, otherwise falls back to local AES-256-GCM.
 */
export async function encryptForTenant(
  data: string,
  orgId: string,
  prisma?: any,
): Promise<EncryptedPayload> {
  const kmsConfig = await getOrgKmsConfig(orgId, prisma);

  if (kmsConfig) {
    return encryptWithKms(data, kmsConfig);
  }

  return encryptLocal(data);
}

/**
 * Decrypt data for a specific tenant/organization.
 */
export async function decryptForTenant(
  payload: EncryptedPayload,
  orgId: string,
  prisma?: any,
): Promise<string> {
  if (payload.method === 'kms') {
    const kmsConfig = await getOrgKmsConfig(orgId, prisma);
    if (!kmsConfig) {
      throw new Error(`KMS key not found for organization ${orgId}`);
    }
    return decryptWithKms(payload, kmsConfig);
  }

  return decryptLocal(payload);
}
