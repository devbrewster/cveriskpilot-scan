import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }
  // Mock platform health data
  type ServiceStatus = 'healthy' | 'degraded' | 'down';

  const services: Array<{ name: string; status: ServiceStatus; latencyMs: number; uptime: number }> = [
    {
      name: 'Web',
      status: 'healthy',
      latencyMs: 12,
      uptime: 99.98,
    },
    {
      name: 'Worker',
      status: 'healthy',
      latencyMs: 45,
      uptime: 99.95,
    },
    {
      name: 'Database',
      status: 'healthy',
      latencyMs: 3,
      uptime: 99.99,
    },
    {
      name: 'Redis',
      status: 'degraded',
      latencyMs: 8,
      uptime: 99.87,
    },
    {
      name: 'Pub/Sub',
      status: 'healthy',
      latencyMs: 22,
      uptime: 99.96,
    },
  ];

  const database = {
    connections: 18,
    maxConnections: 100,
    poolUtilization: 0.18,
    replicaLagMs: 12,
  };

  const redis = {
    hitRate: 0.943,
    memoryUsedMb: 312,
    memoryMaxMb: 1024,
    connectedClients: 24,
  };

  const overallStatus = services.some((s) => s.status === 'down')
    ? 'down'
    : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return NextResponse.json({
    status: overallStatus,
    services,
    database,
    redis,
    errorRate: 0.23,
    requestsPerMinute: 1842,
    p99LatencyMs: 187,
    timestamp: new Date().toISOString(),
  });
}
