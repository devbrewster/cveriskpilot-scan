/**
 * POST /api/auth/mfa/passkeys/authenticate
 *   → body: { pendingLoginId }
 *   ← 200 { ok, data: { challengeId, options } }
 *   ← 400 { ok: false, error }
 *
 * PUT /api/auth/mfa/passkeys/authenticate
 *   → body: { pendingLoginId, challengeId, response }
 *   ← 200 { ok, data: { userId } }
 *   ← 401 { ok: false, error }
 */

import { NextResponse } from 'next/server';

import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  type AuthenticationResponseJSON,
  type StoredPasskey,
  type WebAuthnChallenge,
} from '@cveriskpilot/auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-memory challenge store (replace with Redis / DB in production)
// ---------------------------------------------------------------------------
const challengeStore = new Map<string, WebAuthnChallenge>();

// ---------------------------------------------------------------------------
// POST — Generate authentication options
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    pendingLoginId?: string;
  } | null;

  if (!body?.pendingLoginId) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_request', message: 'Pending login ID is required.' } },
      { status: 400 },
    );
  }

  // TODO: Look up the pending login challenge from DB / Redis to get userId
  // TODO: Load user's stored passkeys from DB
  const userId = 'stub-user-id'; // placeholder
  const userPasskeys: StoredPasskey[] = []; // placeholder — load from DB

  const result = await generatePasskeyAuthenticationOptions({
    userId,
    passkeys: userPasskeys,
    request,
    pendingLoginId: body.pendingLoginId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: 'Could not start passkey authentication.' } },
      { status: 400 },
    );
  }

  challengeStore.set(result.challengeRecord.id, result.challengeRecord);

  const ttl = new Date(result.challengeRecord.expiresAt).getTime() - Date.now();
  setTimeout(() => challengeStore.delete(result.challengeRecord.id), ttl);

  return NextResponse.json({
    ok: true,
    data: { challengeId: result.challengeRecord.id, options: result.options },
  });
}

// ---------------------------------------------------------------------------
// PUT — Verify authentication response
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    pendingLoginId?: string;
    challengeId?: string;
    response?: AuthenticationResponseJSON;
  } | null;

  if (!body?.pendingLoginId || !body.challengeId || !body.response) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_request', message: 'Pending login, challenge, and response are required.' } },
      { status: 400 },
    );
  }

  const challenge = challengeStore.get(body.challengeId);
  if (!challenge) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_challenge', message: 'Challenge not found or expired.' } },
      { status: 400 },
    );
  }

  // TODO: Look up the passkey by body.response.id from DB
  const passkey: StoredPasskey | null = null; // placeholder

  if (!passkey) {
    return NextResponse.json(
      { ok: false, error: { code: 'unknown_passkey', message: 'Passkey not recognized.' } },
      { status: 401 },
    );
  }

  challengeStore.delete(body.challengeId);

  const result = await verifyPasskeyAuthentication({
    challenge,
    passkey,
    response: body.response,
  });

  if (!result.ok) {
    // TODO: Record audit event (auth.login.mfa_failed)
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: 'Passkey verification failed.' } },
      { status: 401 },
    );
  }

  // TODO: Update passkey counter/metadata in DB
  // TODO: Create session, set cookie, record audit event
  // TODO: Consume the pending login challenge

  return NextResponse.json({
    ok: true,
    data: { userId: result.userId },
  });
}
