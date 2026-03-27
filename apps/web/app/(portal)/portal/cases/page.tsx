import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Portal Cases - Client-scoped cases view
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
  title: 'Cases | CVERiskPilot Portal',
};

export default async function PortalCasesPage() {
  const session = await getPortalSession();
  if (!session) redirect('/login?redirect=/portal/cases');

  const { organizationId, clientId } = session;

  let cases: any[] = [];
  let totalCount = 0;

  try {
    cases = await (prisma.vulnerabilityCase as any).findMany({
      where: { organizationId, clientId },
      include: {
        assignedTo: { select: { name: true } },
        slaPolicy: { select: { name: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    totalCount = await (prisma.vulnerabilityCase as any).count({
      where: { organizationId, clientId },
    });
  } catch (error) {
    console.error('[portal] Failed to fetch cases:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} vulnerability cases for your organization
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat
          label="Critical"
          value={cases.filter((c: any) => c.severity === 'CRITICAL').length}
          color="text-red-700"
        />
        <MiniStat
          label="High"
          value={cases.filter((c: any) => c.severity === 'HIGH').length}
          color="text-orange-700"
        />
        <MiniStat
          label="Overdue"
          value={cases.filter((c: any) => c.dueAt && new Date(c.dueAt) < new Date() && !['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION'].includes(c.status)).length}
          color="text-red-600"
        />
        <MiniStat
          label="KEV"
          value={cases.filter((c: any) => c.kevListed).length}
          color="text-orange-600"
        />
      </div>

      {/* Cases Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {cases.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No vulnerability cases found for your organization.
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
                  <th className="px-6 py-3 font-medium text-gray-500">CVSS</th>
                  <th className="px-6 py-3 font-medium text-gray-500">EPSS</th>
                  <th className="px-6 py-3 font-medium text-gray-500">KEV</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Findings</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Due Date</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c: any) => {
                  const isOverdue = c.dueAt && new Date(c.dueAt) < new Date() && !['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION'].includes(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 max-w-xs truncate">{c.title}</td>
                      <td className="px-6 py-3">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{formatStatus(c.status)}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{(c.cveIds ?? []).join(', ') || '-'}</td>
                      <td className="px-6 py-3 text-gray-600">{c.cvssScore?.toFixed(1) ?? '-'}</td>
                      <td className="px-6 py-3 text-gray-600">{c.epssScore?.toFixed(4) ?? '-'}</td>
                      <td className="px-6 py-3">
                        {c.kevListed ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">KEV</span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{c._count?.findings ?? c.findingCount ?? 0}</td>
                      <td className="px-6 py-3">
                        {c.dueAt ? (
                          <span className={isOverdue ? 'font-medium text-red-600' : 'text-gray-600'}>
                            {new Date(c.dueAt).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{c.assignedTo?.name || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalCount > 200 && (
          <div className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500">
            Showing 200 of {totalCount} cases
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
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
