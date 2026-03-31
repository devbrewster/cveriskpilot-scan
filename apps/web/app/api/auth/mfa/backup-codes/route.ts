// ---------------------------------------------------------------------------
// POST /api/auth/mfa/backup-codes — Generate new backup codes for MFA recovery
// Requires MFA to be enabled. Returns plaintext codes (shown once) and
// stores SHA-256 hashed versions in the database.
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  getServerSessionFromCookies,
  generateBackupCodes,
  hashBackupCode,
} from '@cveriskpilot/auth';
import { checkCsrf } from '@cveriskpilot/auth';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';

/**
 * POST — Generate new backup codes. Requires MFA to be enabled.
 * Returns plaintext codes (shown to user once) and stores hashed versions.
 * Replaces any previously stored backup codes.
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const cookieStore = await cookies();
    const session = await getServerSessionFromCookies(
      (name: string) => cookieStore.get(name)?.value,
    );

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify MFA is enabled for this user
    const user = await (prisma as any).user.findUnique({
      where: { id: session.userId },
      select: { mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA must be enabled before generating backup codes' },
        { status: 400 },
      );
    }

    // Generate codes
    const codes = generateBackupCodes(10);
    const hashedCodes = codes.map(hashBackupCode);

    // Store hashed codes on the user record (replaces previous codes)
    await (prisma as any).user.update({
      where: { id: session.userId },
      data: { mfaBackupCodes: hashedCodes },
    });

    // Audit log
    try {
      const { logAudit } = await import('@/lib/audit');
      await logAudit({
        action: 'UPDATE',
        entityType: 'user',
        entityId: session.userId,
        actorId: session.userId,
        organizationId: session.organizationId,
        details: { event: 'backup_codes_regenerated', count: codes.length },
      });
    } catch {
      // Best effort — audit logging should not block the response
    }

    // Return plaintext codes (shown to user once, then never retrievable)
    return NextResponse.json({
      codes,
      message: 'Save these backup codes in a secure location. Each code can only be used once.',
    });
  } catch (error) {
    console.error('[API] POST /api/auth/mfa/backup-codes error:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup codes. Please try again.' },
      { status: 500 },
    );
  }
}
