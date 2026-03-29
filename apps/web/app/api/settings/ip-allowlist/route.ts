import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// CIDR Validation
// ---------------------------------------------------------------------------

/**
 * Validate a CIDR notation string (IPv4 or IPv6).
 */
function isValidCIDR(cidr: string): boolean {
  const trimmed = cidr.trim();

  // IPv4 CIDR: x.x.x.x/prefix
  const ipv4Match = trimmed.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/,
  );

  if (ipv4Match) {
    const octets = [
      parseInt(ipv4Match[1], 10),
      parseInt(ipv4Match[2], 10),
      parseInt(ipv4Match[3], 10),
      parseInt(ipv4Match[4], 10),
    ];
    const prefix = parseInt(ipv4Match[5], 10);

    if (octets.some((o) => o > 255)) return false;
    if (prefix > 32) return false;
    return true;
  }

  // IPv6 CIDR: basic validation
  const ipv6Match = trimmed.match(/^([0-9a-fA-F:]+)\/(\d{1,3})$/);
  if (ipv6Match) {
    const prefix = parseInt(ipv6Match[2], 10);
    if (prefix > 128) return false;
    // Basic structure check — contains at least one colon
    if (!ipv6Match[1].includes(':')) return false;
    return true;
  }

  // Single IP (no prefix) — also accept for convenience
  const singleIpv4 = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (singleIpv4) {
    const octets = [
      parseInt(singleIpv4[1], 10),
      parseInt(singleIpv4[2], 10),
      parseInt(singleIpv4[3], 10),
      parseInt(singleIpv4[4], 10),
    ];
    return octets.every((o) => o <= 255);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/settings/ip-allowlist — Get the IP allowlist for the authenticated org.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const entitlements = (org.entitlements ?? {}) as Record<string, unknown>;
    const ipAllowlist = (entitlements.ipAllowlist as string[]) ?? [];
    const ipAllowlistEnabled = Boolean(entitlements.ipAllowlistEnabled);

    return NextResponse.json({
      enabled: ipAllowlistEnabled,
      allowlist: ipAllowlist,
    });
  } catch (error) {
    console.error('[API] GET /api/settings/ip-allowlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/ip-allowlist — Update the IP allowlist for the authenticated org.
 *
 * Body: { enabled: boolean, allowlist: string[] }
 * Each entry should be a CIDR range or single IP.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { enabled, allowlist } = body as {
      enabled?: boolean;
      allowlist?: string[];
    };

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled (boolean) is required' },
        { status: 400 },
      );
    }

    if (!Array.isArray(allowlist)) {
      return NextResponse.json(
        { error: 'allowlist (array of CIDR ranges) is required' },
        { status: 400 },
      );
    }

    // Validate all CIDR entries
    const invalidEntries: string[] = [];
    const cleanedList: string[] = [];

    for (const entry of allowlist) {
      const trimmed = String(entry).trim();
      if (!trimmed) continue;

      if (!isValidCIDR(trimmed)) {
        invalidEntries.push(trimmed);
      } else {
        cleanedList.push(trimmed);
      }
    }

    if (invalidEntries.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid CIDR entries',
          invalidEntries,
          message: 'Each entry must be a valid CIDR range (e.g., 10.0.0.0/8) or single IP (e.g., 203.0.113.1)',
        },
        { status: 400 },
      );
    }

    // Require at least one entry if enabling
    if (enabled && cleanedList.length === 0) {
      return NextResponse.json(
        { error: 'At least one IP range is required when enabling the allowlist' },
        { status: 400 },
      );
    }

    // Update org entitlements
    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { entitlements: true },
    });

    const entitlements = (org?.entitlements ?? {}) as Record<string, unknown>;

    await (prisma as any).organization.update({
      where: { id: session.organizationId },
      data: {
        entitlements: {
          ...entitlements,
          ipAllowlistEnabled: enabled,
          ipAllowlist: cleanedList,
        },
      },
    });

    return NextResponse.json({
      enabled,
      allowlist: cleanedList,
      message: enabled
        ? `IP allowlist enabled with ${cleanedList.length} range(s)`
        : 'IP allowlist disabled',
    });
  } catch (error) {
    console.error('[API] PUT /api/settings/ip-allowlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
