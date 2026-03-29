import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

/**
 * GET /api/ops/analytics
 * Returns mock usage analytics for the ops dashboard.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }
  // Generate mock scans-per-day for the last 30 days
  const now = new Date();
  const scansPerDay: Array<{ date: string; count: number }> = [];
  const apiCallsPerDay: Array<{ date: string; count: number }> = [];
  const activeUsersPerDay: Array<{ date: string; count: number }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    scansPerDay.push({
      date: dateStr,
      count: Math.floor(Math.random() * 80) + 20,
    });
    apiCallsPerDay.push({
      date: dateStr,
      count: Math.floor(Math.random() * 5000) + 1000,
    });
    activeUsersPerDay.push({
      date: dateStr,
      count: Math.floor(Math.random() * 200) + 50,
    });
  }

  const storageByOrg = [
    { orgName: 'Acme Corp', storageBytes: 12_400_000_000 },
    { orgName: 'TechVault Inc', storageBytes: 8_750_000_000 },
    { orgName: 'SecureDef LLC', storageBytes: 6_320_000_000 },
    { orgName: 'CloudWatch Systems', storageBytes: 5_100_000_000 },
    { orgName: 'GovSec Partners', storageBytes: 4_800_000_000 },
    { orgName: 'NexGen Security', storageBytes: 3_200_000_000 },
    { orgName: 'DataShield Corp', storageBytes: 2_900_000_000 },
    { orgName: 'CyberFirst LLC', storageBytes: 2_100_000_000 },
    { orgName: 'PatchPro Inc', storageBytes: 1_600_000_000 },
    { orgName: 'VulnHunters', storageBytes: 900_000_000 },
  ];

  const scansByFormat = [
    { format: 'Nessus', count: 1420 },
    { format: 'SARIF', count: 980 },
    { format: 'CSV', count: 740 },
    { format: 'CycloneDX', count: 620 },
    { format: 'Qualys', count: 510 },
    { format: 'JSON', count: 390 },
    { format: 'OpenVAS', count: 280 },
    { format: 'SPDX', count: 190 },
    { format: 'OSV', count: 140 },
    { format: 'CSAF', count: 90 },
    { format: 'XLSX', count: 60 },
  ];

  const usersByTier = {
    FREE: 312,
    FOUNDERS_BETA: 87,
    PRO: 204,
    ENTERPRISE: 56,
    MSSP: 18,
  };

  // Aggregate totals
  const totalScans30d = scansPerDay.reduce((s, d) => s + d.count, 0);
  const totalApiCalls30d = apiCallsPerDay.reduce((s, d) => s + d.count, 0);
  const totalActiveUsers = activeUsersPerDay[activeUsersPerDay.length - 1]?.count ?? 0;
  const totalStorageBytes = storageByOrg.reduce((s, o) => s + o.storageBytes, 0);

  return NextResponse.json({
    scansPerDay,
    apiCallsPerDay,
    activeUsersPerDay,
    storageByOrg,
    scansByFormat,
    usersByTier,
    totals: {
      totalScans30d,
      totalApiCalls30d,
      totalActiveUsers,
      totalStorageBytes,
    },
  });
}
