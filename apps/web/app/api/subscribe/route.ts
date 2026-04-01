import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// POST /api/subscribe — public endpoint, no auth required
// Allows visitors to subscribe to the email newsletter.
// ---------------------------------------------------------------------------

const SUBSCRIBERS_FILE = path.join(process.cwd(), '.data', 'subscribers.json');

interface Subscriber {
  email: string;
  source: string;
  subscribedAt: string;
}

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(data) as Subscriber[];
  } catch {
    return [];
  }
}

async function writeSubscribers(subs: Subscriber[]): Promise<void> {
  const dir = path.dirname(SUBSCRIBERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** In-memory rate limit — 5 requests per IP per 60 seconds */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

/** public endpoint */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(`subscribe:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'unknown';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
    }

    const subscribers = await readSubscribers();

    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json({ message: 'Already subscribed.' }, { status: 200 });
    }

    subscribers.push({ email, source, subscribedAt: new Date().toISOString() });
    await writeSubscribers(subscribers);

    return NextResponse.json({ message: 'Subscribed successfully.' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Subscription failed.' }, { status: 500 });
  }
}
