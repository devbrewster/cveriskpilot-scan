'use client';

const DEMO_CLIENTS = [
  { id: 'cl-001', name: 'Acme Corporation', slug: 'acme-corp', isActive: true, assetCount: 142, findingCount: 387, caseCount: 132, riskScore: 62, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'cl-002', name: 'Globex Industries', slug: 'globex', isActive: true, assetCount: 78, findingCount: 145, caseCount: 52, riskScore: 34, createdAt: '2024-02-20T14:30:00Z' },
  { id: 'cl-003', name: 'Initech LLC', slug: 'initech', isActive: true, assetCount: 23, findingCount: 55, caseCount: 19, riskScore: 12, createdAt: '2024-03-01T09:15:00Z' },
  { id: 'cl-004', name: 'Umbrella Corp', slug: 'umbrella', isActive: false, assetCount: 0, findingCount: 0, caseCount: 0, riskScore: 0, createdAt: '2024-03-10T08:00:00Z' },
];

function getRiskBadge(score: number) {
  if (score >= 50) return 'bg-red-100 text-red-800';
  if (score >= 20) return 'bg-orange-100 text-orange-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

export default function DemoClientsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage MSSP clients and their vulnerability posture
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated client data. MSSP features require Enterprise or MSSP tier.
        </p>
      </div>

      {/* Client count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{DEMO_CLIENTS.length}</span> client{DEMO_CLIENTS.length !== 1 ? 's' : ''} in your organization
        </p>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Client
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Assets</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Findings</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Cases</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Risk Score</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {DEMO_CLIENTS.map((client) => (
              <tr key={client.id} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-700">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{client.assetCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{client.findingCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{client.caseCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskBadge(client.riskScore)}`}>
                    {client.riskScore}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
