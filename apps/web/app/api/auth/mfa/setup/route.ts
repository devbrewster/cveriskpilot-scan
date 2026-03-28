// ---------------------------------------------------------------------------
// GET  /api/auth/mfa/setup — Return TOTP setup data (secret, QR URI, backup codes)
// POST /api/auth/mfa/setup — Confirm MFA setup by verifying initial token
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET — Generate a new TOTP secret and return setup data.
 * In production this would call generateTOTPSecret() from @cveriskpilot/auth
 * and store the pending secret in the session/DB.
 */
export async function GET() {
  try {
    // TODO: Use real session to get userEmail, then call:
    //   import { generateTOTPSecret } from '@cveriskpilot/auth';
    //   const { secret, uri } = generateTOTPSecret(userEmail);

    // Mock data for now
    const mockSecret = 'JBSWY3DPEHPK3PXP'; // example base32 secret
    const mockQrCodeUri =
      'otpauth://totp/CVERiskPilot:george.ontiveros@cveriskpilot.com?secret=JBSWY3DPEHPK3PXP&issuer=CVERiskPilot&algorithm=SHA1&digits=6&period=30';

    // Generate mock backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    return NextResponse.json({
      secret: mockSecret,
      qrCodeUri: mockQrCodeUri,
      backupCodes,
    });
  } catch (error) {
    console.error('[API] GET /api/auth/mfa/setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST — Confirm MFA setup by verifying the first TOTP token.
 * On success, marks the user's mfaEnabled = true in the database.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { token } = body as { token?: string };

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token must be a 6-digit code' },
        { status: 400 },
      );
    }

    // TODO: In production:
    // 1. Retrieve the pending secret from session/DB
    // 2. Call verifyTOTPToken(token, pendingSecret)
    // 3. If valid, set user.mfaEnabled = true, user.mfaSecret = encrypt(pendingSecret)
    // For now, accept any valid 6-digit code as confirmation.

    return NextResponse.json({
      success: true,
      message: 'MFA has been enabled for your account',
    });
  } catch (error) {
    console.error('[API] POST /api/auth/mfa/setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
