/**
 * Passkey (WebAuthn) registration endpoints.
 *
 * STATUS: Not yet implemented — returns 501 until DB persistence and
 * session integration are completed. See packages/auth/src/security/webauthn.ts
 * for the underlying crypto which is ready.
 */

import { NextResponse } from 'next/server';

const NOT_IMPLEMENTED = NextResponse.json(
  { ok: false, error: { code: 'not_implemented', message: 'Passkey registration is not yet available.' } },
  { status: 501 },
);

export async function POST() {
  return NOT_IMPLEMENTED;
}

export async function PUT() {
  return NOT_IMPLEMENTED;
}
