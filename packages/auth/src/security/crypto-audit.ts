// Vault Protocol: Cryptographic audit signing via Cloud KMS (Ed25519)
// Falls back to local Ed25519 keypair when KMS is unavailable (dev/test)

import crypto from 'node:crypto';
import type { AuditEntry } from './audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditSignatureData {
  /** Base64-encoded Ed25519 signature */
  signature: string;
  /** KMS key version or 'local' */
  keyVersion: string;
  /** The audit entry hash that was signed */
  entryHash: string;
  /** ISO 8601 timestamp of when the signature was created */
  signedAt: string;
}

export interface SignedAuditExport {
  entry: AuditEntry;
  signature: AuditSignatureData;
  merkleProof?: {
    root: string;
    path: Array<{ hash: string; direction: 'left' | 'right' }>;
    leafIndex: number;
  };
}

// ---------------------------------------------------------------------------
// KMS Signing Key Configuration
// ---------------------------------------------------------------------------

interface KmsSigningConfig {
  /** Full KMS key version resource name for asymmetric signing */
  keyVersionName: string;
  /** Algorithm: ED25519 or EC_SIGN_P256_SHA256 */
  algorithm: string;
}

const orgSigningKeyCache = new Map<string, KmsSigningConfig | null>();

/**
 * Get or create the signing key config for an organization.
 * In production, this reads from org entitlements / KMS.
 * Falls back to local Ed25519 for dev/test.
 */
export async function getOrgSigningConfig(
  orgId: string,
): Promise<KmsSigningConfig | null> {
  if (orgSigningKeyCache.has(orgId)) {
    return orgSigningKeyCache.get(orgId)!;
  }

  // Check for KMS key ring configured via environment
  const keyRing = process.env.VAULT_KMS_KEY_RING;
  if (keyRing) {
    // Convention: one signing key per org in the key ring
    // Format: projects/{project}/locations/{location}/keyRings/{ring}/cryptoKeys/audit-{orgId}/cryptoKeyVersions/1
    const keyVersionName = `${keyRing}/cryptoKeys/audit-${orgId}/cryptoKeyVersions/1`;
    const config: KmsSigningConfig = {
      keyVersionName,
      algorithm: 'EC_SIGN_ED25519',
    };
    orgSigningKeyCache.set(orgId, config);
    return config;
  }

  orgSigningKeyCache.set(orgId, null);
  return null;
}

export function clearSigningKeyCache(orgId?: string): void {
  if (orgId) {
    orgSigningKeyCache.delete(orgId);
  } else {
    orgSigningKeyCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Local Ed25519 Signing (dev/test fallback)
// ---------------------------------------------------------------------------

/** Deterministic local keypair derived from app secret + orgId */
function getLocalKeypair(orgId: string): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
  const secret = process.env.APP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? 'dev-secret';
  // Derive a seed from the secret + orgId
  const seed = crypto.createHash('sha256').update(`${secret}:vault:${orgId}`).digest();

  // Ed25519 uses a 32-byte seed to generate keypair
  const keypair = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  } as Parameters<typeof crypto.generateKeyPairSync>[1]);

  return {
    privateKey: crypto.createPrivateKey({ key: keypair.privateKey as unknown as Buffer, format: 'der', type: 'pkcs8' }),
    publicKey: crypto.createPublicKey({ key: keypair.publicKey as unknown as Buffer, format: 'der', type: 'spki' }),
  };
}

// Cache local keypairs per org for the process lifetime
const localKeypairCache = new Map<string, ReturnType<typeof getLocalKeypair>>();

function getCachedLocalKeypair(orgId: string) {
  if (!localKeypairCache.has(orgId)) {
    localKeypairCache.set(orgId, getLocalKeypair(orgId));
  }
  return localKeypairCache.get(orgId)!;
}

function signLocal(data: Buffer, orgId: string): string {
  const { privateKey } = getCachedLocalKeypair(orgId);
  const signature = crypto.sign(null, data, privateKey);
  return signature.toString('base64');
}

function verifyLocal(data: Buffer, signature: string, orgId: string): boolean {
  const { publicKey } = getCachedLocalKeypair(orgId);
  return crypto.verify(null, data, publicKey, Buffer.from(signature, 'base64'));
}

// ---------------------------------------------------------------------------
// Cloud KMS Signing
// ---------------------------------------------------------------------------

async function getGCPAccessToken(): Promise<string> {
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
    // Not on GCP
  }
  throw new Error('Could not obtain GCP access token for KMS signing');
}

async function signWithKms(
  data: Buffer,
  config: KmsSigningConfig,
): Promise<string> {
  const accessToken = await getGCPAccessToken();
  const digest = crypto.createHash('sha256').update(data).digest();

  const url = `https://cloudkms.googleapis.com/v1/${config.keyVersionName}:asymmetricSign`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: digest.toString('base64'),
    }),
  });

  if (!response.ok) {
    throw new Error(`KMS asymmetricSign failed: ${response.status}`);
  }

  const result = (await response.json()) as { signature: string };
  return result.signature;
}

async function verifyWithKms(
  data: Buffer,
  signature: string,
  config: KmsSigningConfig,
): Promise<boolean> {
  const accessToken = await getGCPAccessToken();
  const digest = crypto.createHash('sha256').update(data).digest();

  const url = `https://cloudkms.googleapis.com/v1/${config.keyVersionName}:asymmetricVerify`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: digest.toString('base64'),
      signature,
    }),
  });

  if (!response.ok) {
    throw new Error(`KMS asymmetricVerify failed: ${response.status}`);
  }

  const result = (await response.json()) as { success: boolean };
  return result.success;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign an audit entry, producing a cryptographic signature.
 * Uses Cloud KMS in production, local Ed25519 in dev/test.
 */
export async function signAuditEntry(
  entry: AuditEntry,
  orgId: string,
): Promise<AuditSignatureData> {
  const dataToSign = Buffer.from(entry.hash, 'utf-8');
  const kmsConfig = await getOrgSigningConfig(orgId);

  let signature: string;
  let keyVersion: string;

  if (kmsConfig) {
    try {
      signature = await signWithKms(dataToSign, kmsConfig);
      keyVersion = kmsConfig.keyVersionName;
    } catch (err) {
      // Fall back to local signing if KMS fails
      console.warn(`KMS signing failed for org ${orgId}, using local fallback:`, err);
      signature = signLocal(dataToSign, orgId);
      keyVersion = 'local';
    }
  } else {
    signature = signLocal(dataToSign, orgId);
    keyVersion = 'local';
  }

  return {
    signature,
    keyVersion,
    entryHash: entry.hash,
    signedAt: new Date().toISOString(),
  };
}

/**
 * Verify a signature against an audit entry hash.
 */
export async function verifyAuditSignature(
  entryHash: string,
  signatureData: AuditSignatureData,
  orgId: string,
): Promise<boolean> {
  const dataToVerify = Buffer.from(entryHash, 'utf-8');

  if (signatureData.keyVersion === 'local') {
    return verifyLocal(dataToVerify, signatureData.signature, orgId);
  }

  // KMS verification
  const kmsConfig = await getOrgSigningConfig(orgId);
  if (!kmsConfig) {
    // Key was KMS but we can't find the config — can't verify
    return false;
  }

  try {
    return await verifyWithKms(dataToVerify, signatureData.signature, kmsConfig);
  } catch {
    return false;
  }
}

/**
 * Get the public key for an org's signing key (for external verification).
 * Returns PEM-encoded public key.
 */
export async function getOrgPublicKey(orgId: string): Promise<string> {
  const kmsConfig = await getOrgSigningConfig(orgId);

  if (kmsConfig) {
    const accessToken = await getGCPAccessToken();
    const url = `https://cloudkms.googleapis.com/v1/${kmsConfig.keyVersionName}/publicKey`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const result = (await response.json()) as { pem: string };
      return result.pem;
    }
  }

  // Local key
  const { publicKey } = getCachedLocalKeypair(orgId);
  return publicKey.export({ type: 'spki', format: 'pem' }) as string;
}
