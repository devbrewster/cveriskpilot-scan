import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Portal Dashboard - Auto-scoped to client
// ---------------------------------------------------------------------------

async function getPortalSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('crp_portal_session');
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export const metadata = {
  title: 'Portal Dashboard | CVERiskPilot',
};

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect('/login?redirect=/portal');

  const { organizationId, clientId } = session;
  const where = { organizationId, clientId };

  // Fetch metrics
  let totalCases = 0;
  let criticalHighCount = 0;
  let kevCount = 0;
  let openCount = 0;
  let closedCount = 0;
  let recentCases: any[] = [];

  try {
    const cases = await (prisma.vulnerabilityCase as any).findMany({
      where,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        kevListed: true,
        cvssScore: true,
        epssScore: true,
        cveIds: true,
        createdAt: true,
        dueAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    totalCases = cases.length;
    criticalHighCount = cases.filter((c: any) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length;
    kevCount = cases.filter((c: any) => c.kevListed).length;
    openCount = cases.filter((c: any) => ['NEW', 'TRIAGE', 'IN_REMEDIATION', 'REOPENED'].includes(c.status)).length;
    closedCount = cases.filter((c: any) => ['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION'].includes(c.status)).length;
    recentCases = cases.slice(0, 10);
  } catch (error) {
    console.error('[portal] Failed to fetch dashboard data:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vulnerability overview for your organization
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Cases" value={totalCases} />
        <StatCard label="Critical / High" value={criticalHighCount} accent="text-red-700" />
        <StatCard label="KEV-Listed" value={kevCount} accent={kevCount > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatCard label="Open Cases" value={openCount} />
      </div>

      {/* Open vs Closed */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Case Status Overview</h2>
        <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{openCount}</p>
            <p className="text-sm text-gray-500">Open</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{closedCount}</p>
            <p className="text-sm text-gray-500">Closed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{criticalHighCount}</p>
            <p className="text-sm text-gray-500">Critical/High</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{kevCount}</p>
            <p className="text-sm text-gray-500">KEV Listed</p>
          </div>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Cases</h2>
        </div>
        {recentCases.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No vulnerability cases found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Severity</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">CVE IDs</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentCases.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-xs truncate">{c.title}</td>
                    <td className="px-6 py-3">
                      <SeverityBadge severity={c.severity} />
                    </td>
                    <td className="px-6 py-3 text-gray-600">{formatStatus(c.status)}</td>
                    <td className="px-6 py-3 text-gray-600 text-xs">{(c.cveIds ?? []).join(', ') || '-'}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {c.dueAt ? new Date(c.dueAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-blue-100 text-blue-700',
    INFO: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity] || 'bg-gray-100 text-gray-600'}`}>
      {severity}
    </span>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
