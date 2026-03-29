import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Ops auth helper
// ---------------------------------------------------------------------------
async function requireOpsAuth(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) {
    return { error: auth };
  }
  const session = auth;
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return { error: NextResponse.json({ error: 'Internal staff only' }, { status: 403 }) };
  }
  return { session };
}

// ---------------------------------------------------------------------------
// /api/ops/announcements — Announcement banner management (mock)
// ---------------------------------------------------------------------------

type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'incident';
type AnnouncementStatus = 'draft' | 'active' | 'expired';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  startAt: string;
  endAt: string;
  createdBy: string;
  createdAt: string;
}

const VALID_TYPES: AnnouncementType[] = ['info', 'warning', 'maintenance', 'incident'];
const VALID_STATUSES: AnnouncementStatus[] = ['draft', 'active', 'expired'];

const announcements: Announcement[] = [
  {
    id: 'ann_001',
    title: 'Scheduled Maintenance Window',
    message: 'CVERiskPilot will undergo scheduled maintenance on March 30, 2026 from 02:00-04:00 UTC. Expect brief service interruptions.',
    type: 'maintenance',
    status: 'active',
    startAt: '2026-03-28T00:00:00Z',
    endAt: '2026-03-30T04:00:00Z',
    createdBy: 'admin@cveriskpilot.com',
    createdAt: '2026-03-27T15:20:00Z',
  },
  {
    id: 'ann_002',
    title: 'New CSAF Parser Available',
    message: 'We have added support for CSAF (Common Security Advisory Framework) scan imports. Upload your CSAF advisories to get enriched findings.',
    type: 'info',
    status: 'active',
    startAt: '2026-03-26T00:00:00Z',
    endAt: '2026-04-02T00:00:00Z',
    createdBy: 'admin@cveriskpilot.com',
    createdAt: '2026-03-26T13:10:00Z',
  },
  {
    id: 'ann_003',
    title: 'API Rate Limit Increase',
    message: 'Pro and Enterprise tiers now enjoy 2x API rate limits. Check your settings for details.',
    type: 'info',
    status: 'expired',
    startAt: '2026-03-10T00:00:00Z',
    endAt: '2026-03-20T00:00:00Z',
    createdBy: 'admin@cveriskpilot.com',
    createdAt: '2026-03-09T10:00:00Z',
  },
  {
    id: 'ann_004',
    title: 'Elevated Error Rates',
    message: 'We are investigating elevated error rates on the enrichment pipeline. CVE lookups may be delayed.',
    type: 'incident',
    status: 'expired',
    startAt: '2026-03-15T08:00:00Z',
    endAt: '2026-03-15T12:00:00Z',
    createdBy: 'support@cveriskpilot.com',
    createdAt: '2026-03-15T08:05:00Z',
  },
  {
    id: 'ann_005',
    title: 'EPSS Score Update Delay',
    message: 'FIRST EPSS feed updates are delayed. Scores may be 24h stale. We are monitoring.',
    type: 'warning',
    status: 'draft',
    startAt: '2026-03-29T00:00:00Z',
    endAt: '2026-03-31T00:00:00Z',
    createdBy: 'admin@cveriskpilot.com',
    createdAt: '2026-03-28T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// GET — List all announcements
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireOpsAuth(request);
  if ('error' in auth) return auth.error;

  try {
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('[API] GET /api/ops/announcements error:', error);
    return NextResponse.json(
      { error: 'Failed to load announcements' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new announcement
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await requireOpsAuth(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { title, message, type, startAt, endAt } = body as {
      title?: string;
      message?: string;
      type?: string;
      startAt?: string;
      endAt?: string;
    };

    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'title is required (min 3 chars)' },
        { status: 400 },
      );
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'message is required (min 10 chars)' },
        { status: 400 },
      );
    }

    if (!type || !VALID_TYPES.includes(type as AnnouncementType)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'startAt and endAt are required' },
        { status: 400 },
      );
    }

    const newAnnouncement: Announcement = {
      id: `ann_${crypto.randomBytes(4).toString('hex')}`,
      title: title.trim(),
      message: message.trim(),
      type: type as AnnouncementType,
      status: 'draft',
      startAt,
      endAt,
      createdBy: 'admin@cveriskpilot.com',
      createdAt: new Date().toISOString(),
    };

    announcements.unshift(newAnnouncement);

    return NextResponse.json({ announcement: newAnnouncement }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/ops/announcements error:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT — Update announcement status
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const auth = await requireOpsAuth(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { id, status } = body as { id?: string; status?: string };

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'id is required' },
        { status: 400 },
      );
    }

    if (!status || !VALID_STATUSES.includes(status as AnnouncementStatus)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const idx = announcements.findIndex((a) => a.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Announcement not found' },
        { status: 404 },
      );
    }

    announcements[idx] = { ...announcements[idx], status: status as AnnouncementStatus };

    return NextResponse.json({ announcement: announcements[idx] });
  } catch (error) {
    console.error('[API] PUT /api/ops/announcements error:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 },
    );
  }
}
