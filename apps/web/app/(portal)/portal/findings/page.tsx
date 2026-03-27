import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Portal Findings - Client-scoped findings view
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
  title: 'Findings | CVERiskPilot Portal',
};

export default async function PortalFindingsPage() {
  const session = await getPortalSession();
  if (!session) redirect('/login?redirect=/portal/findings');

  const { organizationId, clientId } = session;

  let findings: any[] = [];
  let totalCount = 0;

  try {
    findings = await (prisma.finding as any).findMany({
      where: { organizationId, clientId },
      include: {
        asset: { select: { name: true, type: true, environment: true } },
        vulnerabilityCase: {
          select: {
            title: true,
            severity: true,
            status: true,
            cveIds: true,
            cvssScore: true,
            epssScore: true,
            kevListed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    totalCount = await (prisma.finding as any).count({
      where: { organizationId, clientId },
    });
  } catch (error) {
    console.error('[portal] Failed to fetch findings:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Findings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} total findings across your assets
          </p>
        </div>
      </div>

      {/* Findings Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {findings.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No findings found for your organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Case Title</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Severity</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Asset</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Scanner</th>
                  <th className="px-6 py-3 font-medium text-gray-500">CVE IDs</th>
                  <th className="px-6 py-3 font-medium text-gray-500">CVSS</th>
                  <th className="px-6 py-3 font-medium text-gray-500">KEV</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {findings.map((f: any) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-xs truncate">
                      {f.vulnerabilityCase?.title || '-'}
                    </td>
                    <td className="px-6 py-3">
                      <SeverityBadge severity={f.vulnerabilityCase?.severity || 'INFO'} />
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {formatStatus(f.vulnerabilityCase?.status || '-')}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{f.asset?.name || '-'}</td>
                    <td className="px-6 py-3 text-gray-600">{f.scannerName}</td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {(f.vulnerabilityCase?.cveIds ?? []).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {f.vulnerabilityCase?.cvssScore?.toFixed(1) ?? '-'}
                    </td>
                    <td className="px-6 py-3">
                      {f.vulnerabilityCase?.kevListed ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">KEV</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {f.discoveredAt ? new Date(f.discoveredAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalCount > 200 && (
          <div className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500">
            Showing 200 of {totalCount} findings
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

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
