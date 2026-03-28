/**
 * POST /api/auth/mfa/passkeys/register
 *   → body: {} | { passkeyName?: string }
 *   ← 200 { ok, data: { challengeId, options } }
 *
 * PUT /api/auth/mfa/passkeys/register
 *   → body: { challengeId, response, passkeyName? }
 *   ← 200 { ok, data: { passkey } }
 *   ← 400 { ok: false, error }
 *
 * GET returns the registration options (same as POST for convenience).
 */

import { NextResponse } from 'next/server';

import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  type RegistrationResponseJSON,
  type WebAuthnChallenge,
} from '@cveriskpilot/auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-memory challenge store (replace with Redis / DB in production)
// ---------------------------------------------------------------------------
const challengeStore = new Map<string, WebAuthnChallenge>();

// ---------------------------------------------------------------------------
// POST — Generate registration options
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // TODO: Replace with real session lookup
  const userId = 'stub-user-id';
  const userEmail = 'user@example.com';
  const userDisplayName = 'Stub User';
  const sessionId = 'stub-session-id';

  const body = (await request.json().catch(() => null)) as {
    passkeyName?: string;
  } | null;

  const { challengeRecord, options } = await generatePasskeyRegistrationOptions({
    userId,
    userEmail,
    userDisplayName,
    existingPasskeys: [], // TODO: Load from DB
    request,
    sessionId,
    passkeyName: body?.passkeyName ?? null,
  });

  challengeStore.set(challengeRecord.id, challengeRecord);

  // Auto-expire after TTL
  const ttl = new Date(challengeRecord.expiresAt).getTime() - Date.now();
  setTimeout(() => challengeStore.delete(challengeRecord.id), ttl);

  return NextResponse.json({
    ok: true,
    data: { challengeId: challengeRecord.id, options },
  });
}

// ---------------------------------------------------------------------------
// PUT — Verify registration response
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    challengeId?: string;
    passkeyName?: string;
    response?: RegistrationResponseJSON;
  } | null;

  if (!body?.challengeId || !body.response) {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid_request', message: 'Challenge and response are required.' } },
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

  challengeStore.delete(body.challengeId);

  const result = await verifyPasskeyRegistration({
    challenge,
    response: body.response,
    passkeyName: body.passkeyName ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: 'Passkey registration failed.' } },
      { status: 400 },
    );
  }

  // TODO: Persist result.passkey to DB via Prisma
  // TODO: Record audit event

  return NextResponse.json({
    ok: true,
    data: {
      passkey: { id: result.passkey.id, name: result.passkey.name },
    },
  });
}
