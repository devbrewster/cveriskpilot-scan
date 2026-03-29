'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';

const FEATURE_FLAGS = [
  { name: 'AI Remediation', enabled: true },
  { name: 'MSSP Multi-Client', enabled: true },
  { name: 'ServiceNow Integration', enabled: true },
  { name: 'Advanced Reporting', enabled: true },
];

const SYSTEM_ACTIONS = [
  { label: 'Run Database Migrations', note: 'Requires CLI access' },
  { label: 'Clear Redis Cache', note: 'Requires CLI access' },
  { label: 'Generate System Report', note: 'Requires CLI access' },
];

const DEMO_ORGS = [
  { name: 'Acme Corporation', plan: 'ENTERPRISE', users: 24, cases: 203, created: '2024-01-15' },
  { name: 'Globex Industries', plan: 'PRO', users: 8, cases: 87, created: '2024-02-20' },
  { name: 'Initech LLC', plan: 'FOUNDERS_BETA', users: 3, cases: 34, created: '2024-03-01' },
];

export default function DemoAdminPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          System-wide management for platform administrators
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated admin dashboard. Real admin panel requires platform_admin role.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Organizations" value={3} />
        <StatCard label="Active Sessions" value={12} />
        <StatCard label="Total Users" value={35} />
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">System Health</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className="text-3xl font-bold tracking-tight text-gray-900">Operational</span>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <Card
        title="Organizations"
        description="All tenants on the platform"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 pr-4 font-medium text-gray-500">Org Name</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Plan</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Users</th>
                <th className="pb-3 pr-4 font-medium text-gray-500">Cases</th>
                <th className="pb-3 font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DEMO_ORGS.map((org) => (
                <tr key={org.name} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{org.name}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {org.plan}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{org.users}</td>
                  <td className="py-3 pr-4 text-gray-700">{org.cases}</td>
                  <td className="py-3 text-gray-500">{org.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card
        title="Feature Flags"
        description="Manage feature flags across tenants"
      >
        <ul className="divide-y divide-gray-100">
          {FEATURE_FLAGS.map((flag) => (
            <li key={flag.name} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{flag.name}</p>
                <p className="text-xs text-gray-400">Control plane config</p>
              </div>
              <div
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent transition-colors ${
                  flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                aria-label={`${flag.name} toggle (visual only)`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    flag.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* System Actions */}
      <Card title="System Actions">
        <div className="flex flex-wrap gap-3">
          {SYSTEM_ACTIONS.map((action) => (
            <div key={action.label} className="group relative">
              <button
                disabled
                className="rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              >
                {action.label}
              </button>
              <span className="mt-1 block text-xs text-gray-400">{action.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
