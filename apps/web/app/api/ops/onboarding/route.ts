import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/ops/onboarding — Onboarding pipeline overview (mock data)
// ---------------------------------------------------------------------------

type Milestone = 'first_scan' | 'first_case' | 'first_report' | 'invited_team' | 'upgraded_plan';
type Stage = 'trial' | 'activated' | 'converted' | 'churned';

interface RecentSignup {
  id: string;
  orgName: string;
  email: string;
  tier: string;
  signupDate: string;
  stage: Stage;
  milestones: Milestone[];
}

const MOCK_SIGNUPS: RecentSignup[] = [
  {
    id: 'org_101',
    orgName: 'Horizon Cyber Group',
    email: 'admin@horizoncyber.com',
    tier: 'FREE',
    signupDate: '2026-03-27T14:30:00Z',
    stage: 'trial',
    milestones: ['first_scan'],
  },
  {
    id: 'org_102',
    orgName: 'Vanguard Risk Partners',
    email: 'ops@vanguardrisk.io',
    tier: 'PRO',
    signupDate: '2026-03-25T09:15:00Z',
    stage: 'converted',
    milestones: ['first_scan', 'first_case', 'first_report', 'invited_team', 'upgraded_plan'],
  },
  {
    id: 'org_103',
    orgName: 'NovaTech Solutions',
    email: 'cto@novatech.dev',
    tier: 'FREE',
    signupDate: '2026-03-24T16:45:00Z',
    stage: 'activated',
    milestones: ['first_scan', 'first_case'],
  },
  {
    id: 'org_104',
    orgName: 'QuickSec Startups',
    email: 'founder@quicksec.io',
    tier: 'FREE',
    signupDate: '2026-03-22T11:00:00Z',
    stage: 'churned',
    milestones: [],
  },
  {
    id: 'org_105',
    orgName: 'ShieldOps Federal',
    email: 'security@shieldops.gov',
    tier: 'ENTERPRISE',
    signupDate: '2026-03-20T08:30:00Z',
    stage: 'converted',
    milestones: ['first_scan', 'first_case', 'first_report', 'invited_team', 'upgraded_plan'],
  },
  {
    id: 'org_106',
    orgName: 'CyberNest Labs',
    email: 'info@cybernest.co',
    tier: 'FREE',
    signupDate: '2026-03-19T13:20:00Z',
    stage: 'activated',
    milestones: ['first_scan', 'first_case', 'first_report'],
  },
  {
    id: 'org_107',
    orgName: 'TrustLayer Compliance',
    email: 'admin@trustlayer.com',
    tier: 'FREE',
    signupDate: '2026-03-18T10:00:00Z',
    stage: 'trial',
    milestones: ['first_scan'],
  },
  {
    id: 'org_108',
    orgName: 'RedTeam Dynamics',
    email: 'ops@redteamdyn.com',
    tier: 'PRO',
    signupDate: '2026-03-16T15:45:00Z',
    stage: 'converted',
    milestones: ['first_scan', 'first_case', 'first_report', 'upgraded_plan'],
  },
  {
    id: 'org_109',
    orgName: 'BluePoint Security',
    email: 'team@bluepointsec.net',
    tier: 'FREE',
    signupDate: '2026-03-14T07:10:00Z',
    stage: 'activated',
    milestones: ['first_scan', 'first_case'],
  },
  {
    id: 'org_110',
    orgName: 'Fortify GRC',
    email: 'hello@fortifygrc.com',
    tier: 'FREE',
    signupDate: '2026-03-12T19:30:00Z',
    stage: 'churned',
    milestones: ['first_scan'],
  },
];

const STAGES: { name: Stage; count: number }[] = [
  { name: 'trial', count: 48 },
  { name: 'activated', count: 31 },
  { name: 'converted', count: 18 },
  { name: 'churned', count: 9 },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }

  try {
    return NextResponse.json({
      stages: STAGES,
      recentSignups: MOCK_SIGNUPS,
      conversionRate: 37.5,
      avgTimeToConvert: 12.4,
      activeTrials: 48,
      thisMonthSignups: 14,
    });
  } catch (error) {
    console.error('[API] GET /api/ops/onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to load onboarding data' },
      { status: 500 },
    );
  }
}
