/**
 * WebAuthn / Passkey server-side helpers.
 *
 * Ported from legacy 2.0 codebase (apps/web/src/lib/auth-mfa.ts).
 * Uses @simplewebauthn/server for cryptographic verification.
 *
 * NOTE: Requires `npm install @simplewebauthn/server @simplewebauthn/types`
 */

import { randomUUID } from 'node:crypto';

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

// ---------------------------------------------------------------------------
// Type aliases derived from @simplewebauthn
// ---------------------------------------------------------------------------

export type RegistrationResponseJSON = Parameters<
  typeof verifyRegistrationResponse
>[0]['response'];

export type AuthenticationResponseJSON = Parameters<
  typeof verifyAuthenticationResponse
>[0]['response'];

export type RegistrationOptionsJSON = Awaited<
  ReturnType<typeof generateRegistrationOptions>
>;

export type AuthenticationOptionsJSON = Awaited<
  ReturnType<typeof generateAuthenticationOptions>
>;

type AuthenticatorTransport =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb';

// ---------------------------------------------------------------------------
// Stored credential shape (caller persists via Prisma or other store)
// ---------------------------------------------------------------------------

export interface StoredPasskey {
  /** Credential ID (from authenticator). */
  id: string;
  userId: string;
  name: string;
  /** Base64url-encoded public key. */
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface WebAuthnChallenge {
  id: string;
  userId: string;
  challenge: string;
  purpose: 'registration' | 'authentication';
  rpId: string;
  origin: string;
  createdAt: string;
  expiresAt: string;
  sessionId: string | null;
  pendingLoginId: string | null;
  passkeyName: string | null;
}

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getChallengeTtlMs(): number {
  const raw = process.env.PASSKEY_CHALLENGE_TTL_MS;
  if (!raw) return DEFAULT_CHALLENGE_TTL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CHALLENGE_TTL_MS;
}

function getRpName(): string {
  return process.env.APP_NAME?.trim() || 'CVERiskPilot';
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Base64url encoding (for credential public keys)
// ---------------------------------------------------------------------------

export function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

export function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padding =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Uint8Array.from(Buffer.from(`${normalized}${padding}`, 'base64'));
}

// ---------------------------------------------------------------------------
// Origin / RP ID derivation
// ---------------------------------------------------------------------------

/**
 * Derive the expected origin from the incoming request.
 * Respects `x-forwarded-proto` and `x-forwarded-host` behind Cloud Run / LB.
 */
export function deriveOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto ?? requestUrl.protocol.replace(':', '');
  const host = forwardedHost ?? request.headers.get('host') ?? requestUrl.host;
  return `${protocol}://${host}`;
}

/**
 * Derive the relying-party ID (hostname) from the incoming request.
 */
export function deriveRpId(request: Request): string {
  return new URL(deriveOrigin(request)).hostname;
}

// ---------------------------------------------------------------------------
// Challenge record builder
// ---------------------------------------------------------------------------

function buildChallengeRecord(input: {
  userId: string;
  challenge: string;
  purpose: WebAuthnChallenge['purpose'];
  rpId: string;
  origin: string;
  sessionId?: string | null;
  pendingLoginId?: string | null;
  passkeyName?: string | null;
}): WebAuthnChallenge {
  const createdAt = nowIso();
  return {
    id: `webauthn-${randomUUID()}`,
    userId: input.userId,
    challenge: input.challenge,
    purpose: input.purpose,
    rpId: input.rpId,
    origin: input.origin,
    createdAt,
    expiresAt: new Date(Date.now() + getChallengeTtlMs()).toISOString(),
    sessionId: input.sessionId ?? null,
    pendingLoginId: input.pendingLoginId ?? null,
    passkeyName: input.passkeyName ?? null,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Generate WebAuthn registration options for a user.
 *
 * Returns the options JSON to send to the browser **and** a challenge record
 * that the caller must persist (e.g. in Redis or DB) so it can be verified
 * when the browser responds.
 */
export async function generatePasskeyRegistrationOptions(input: {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  existingPasskeys: StoredPasskey[];
  request: Request;
  sessionId: string;
  passkeyName?: string | null;
}): Promise<{ challengeRecord: WebAuthnChallenge; options: RegistrationOptionsJSON }> {
  const rpId = deriveRpId(input.request);
  const origin = deriveOrigin(input.request);

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: rpId,
    userName: input.userEmail,
    userID: new TextEncoder().encode(input.userId),
    userDisplayName: input.userDisplayName,
    excludeCredentials: input.existingPasskeys.map((pk) => ({
      id: pk.id,
      transports: pk.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    attestationType: 'none',
  });

  const challengeRecord = buildChallengeRecord({
    userId: input.userId,
    challenge: options.challenge,
    purpose: 'registration',
    rpId,
    origin,
    sessionId: input.sessionId,
    passkeyName: input.passkeyName ?? null,
  });

  return { challengeRecord, options };
}

/**
 * Verify a registration response from the browser.
 *
 * On success returns a `StoredPasskey` ready to persist.
 */
export async function verifyPasskeyRegistration(input: {
  challenge: WebAuthnChallenge;
  response: RegistrationResponseJSON;
  passkeyName?: string | null;
}): Promise<
  | { ok: true; passkey: StoredPasskey }
  | { ok: false; code: 'expired_challenge' | 'verification_failed' }
> {
  const { challenge, response } = input;

  if (isExpired(challenge.expiresAt)) {
    return { ok: false, code: 'expired_challenge' };
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rpId,
    requireUserVerification: true,
  }).catch(() => null);

  if (!verification?.verified || !verification.registrationInfo) {
    return { ok: false, code: 'verification_failed' };
  }

  const { registrationInfo } = verification;
  const createdAt = nowIso();

  const passkey: StoredPasskey = {
    id: registrationInfo.credential.id,
    userId: challenge.userId,
    name:
      input.passkeyName?.trim() ||
      challenge.passkeyName?.trim() ||
      'Primary Passkey',
    publicKey: encodeBase64Url(registrationInfo.credential.publicKey),
    counter: registrationInfo.credential.counter,
    deviceType: registrationInfo.credentialDeviceType,
    backedUp: registrationInfo.credentialBackedUp,
    transports: registrationInfo.credential.transports ?? [],
    createdAt,
    lastUsedAt: null,
  };

  return { ok: true, passkey };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Generate WebAuthn authentication options for a user who has registered passkeys.
 *
 * Returns the options JSON to send to the browser **and** a challenge record
 * that the caller must persist for later verification.
 */
export async function generatePasskeyAuthenticationOptions(input: {
  userId: string;
  passkeys: StoredPasskey[];
  request: Request;
  pendingLoginId?: string | null;
}): Promise<
  | { ok: true; challengeRecord: WebAuthnChallenge; options: AuthenticationOptionsJSON }
  | { ok: false; code: 'no_passkeys' }
> {
  if (input.passkeys.length === 0) {
    return { ok: false, code: 'no_passkeys' };
  }

  const rpId = deriveRpId(input.request);
  const origin = deriveOrigin(input.request);

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: input.passkeys.map((pk) => ({
      id: pk.id,
      transports: pk.transports as AuthenticatorTransport[],
    })),
    userVerification: 'required',
  });

  const challengeRecord = buildChallengeRecord({
    userId: input.userId,
    challenge: options.challenge,
    purpose: 'authentication',
    rpId,
    origin,
    pendingLoginId: input.pendingLoginId ?? null,
  });

  return { ok: true, challengeRecord, options };
}

/**
 * Verify an authentication response from the browser.
 *
 * On success returns the matched passkey ID and updated counter/metadata
 * so the caller can persist changes.
 */
export async function verifyPasskeyAuthentication(input: {
  challenge: WebAuthnChallenge;
  passkey: StoredPasskey;
  response: AuthenticationResponseJSON;
}): Promise<
  | {
      ok: true;
      passkeyId: string;
      userId: string;
      updatedCounter: number;
      updatedBackedUp: boolean;
      updatedDeviceType: 'singleDevice' | 'multiDevice';
    }
  | { ok: false; code: 'expired_challenge' | 'verification_failed' }
> {
  const { challenge, passkey, response } = input;

  if (isExpired(challenge.expiresAt)) {
    return { ok: false, code: 'expired_challenge' };
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rpId,
    requireUserVerification: true,
    credential: {
      id: passkey.id,
      publicKey: decodeBase64Url(passkey.publicKey) as Uint8Array<ArrayBuffer>,
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransport[],
    },
  }).catch(() => null);

  if (!verification?.verified) {
    return { ok: false, code: 'verification_failed' };
  }

  return {
    ok: true,
    passkeyId: passkey.id,
    userId: challenge.userId,
    updatedCounter: verification.authenticationInfo.newCounter,
    updatedBackedUp: verification.authenticationInfo.credentialBackedUp,
    updatedDeviceType: verification.authenticationInfo.credentialDeviceType,
  };
}
