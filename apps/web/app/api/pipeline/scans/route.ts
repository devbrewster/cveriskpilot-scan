import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Mock scan data — will be replaced by DB queries when pipeline model exists
// ---------------------------------------------------------------------------

const MOCK_SCANS = [
  { scanId: 'scan_01JQXYZ123456', repository: 'acmecorp/api-gateway', branch: 'feat/user-search', commitSha: 'a1b2c3d', prNumber: 342, verdict: 'fail' as const, totalFindings: 12, critical: 2, high: 4, medium: 2, low: 4, controlsAffected: 8, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 4, createdAt: '2026-03-28T10:15:00Z' },
  { scanId: 'scan_01JQXYZ123457', repository: 'acmecorp/api-gateway', branch: 'main', commitSha: 'e4f5g6h', prNumber: null, verdict: 'pass' as const, totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 0, createdAt: '2026-03-27T18:30:00Z' },
  { scanId: 'scan_01JQXYZ123458', repository: 'acmecorp/frontend-app', branch: 'fix/xss-sanitize', commitSha: 'i7j8k9l', prNumber: 187, verdict: 'warn' as const, totalFindings: 3, critical: 0, high: 1, medium: 2, low: 0, controlsAffected: 3, frameworks: ['NIST 800-53', 'ASVS'], poamEntriesCreated: 1, createdAt: '2026-03-28T08:45:00Z' },
  { scanId: 'scan_01JQXYZ123459', repository: 'acmecorp/infra-terraform', branch: 'main', commitSha: 'm0n1o2p', prNumber: null, verdict: 'pass' as const, totalFindings: 1, critical: 0, high: 0, medium: 0, low: 1, controlsAffected: 0, frameworks: ['FedRAMP', 'NIST 800-53'], poamEntriesCreated: 0, createdAt: '2026-03-27T22:00:00Z' },
  { scanId: 'scan_01JQXYZ123460', repository: 'acmecorp/payment-service', branch: 'feat/stripe-v3', commitSha: 'q3r4s5t', prNumber: 56, verdict: 'fail' as const, totalFindings: 7, critical: 3, high: 2, medium: 1, low: 1, controlsAffected: 6, frameworks: ['SOC 2', 'ASVS', 'SSDF'], poamEntriesCreated: 3, createdAt: '2026-03-28T06:20:00Z' },
  { scanId: 'scan_01JQXYZ123461', repository: 'acmecorp/auth-service', branch: 'main', commitSha: 'u5v6w7x', prNumber: null, verdict: 'pass' as const, totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'CMMC', 'FedRAMP'], poamEntriesCreated: 0, createdAt: '2026-03-26T14:10:00Z' },
  { scanId: 'scan_01JQXYZ123462', repository: 'acmecorp/mobile-backend', branch: 'feat/push-notif', commitSha: 'y8z9a0b', prNumber: 412, verdict: 'warn' as const, totalFindings: 5, critical: 0, high: 2, medium: 2, low: 1, controlsAffected: 4, frameworks: ['NIST 800-53', 'SOC 2'], poamEntriesCreated: 2, createdAt: '2026-03-27T11:30:00Z' },
  { scanId: 'scan_01JQXYZ123463', repository: 'acmecorp/data-pipeline', branch: 'fix/sql-param', commitSha: 'c1d2e3f', prNumber: 89, verdict: 'pass' as const, totalFindings: 2, critical: 0, high: 0, medium: 1, low: 1, controlsAffected: 1, frameworks: ['NIST 800-53', 'SSDF'], poamEntriesCreated: 0, createdAt: '2026-03-28T09:00:00Z' },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const verdict = searchParams.get('verdict');
    const repo = searchParams.get('repo');
    const framework = searchParams.get('framework');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Filter mock data
    let filtered = [...MOCK_SCANS];

    if (verdict && verdict !== 'all') {
      filtered = filtered.filter((s) => s.verdict === verdict);
    }
    if (repo && repo !== 'all') {
      filtered = filtered.filter((s) => s.repository === repo);
    }
    if (framework && framework !== 'all') {
      filtered = filtered.filter((s) => s.frameworks.includes(framework));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((s) => new Date(s.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter((s) => new Date(s.createdAt) <= to);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const scans = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      scans,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Pipeline scans API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
