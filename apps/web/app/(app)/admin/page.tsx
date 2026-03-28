'use client';

import { RoleGuard } from '@/components/auth/role-guard';
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

export default function AdminPage() {
  return (
    <RoleGuard permission="platform:admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
          <p className="mt-1 text-sm text-gray-500">
            System-wide management for platform administrators
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Organizations" value="—" />
          <StatCard label="Active Sessions" value="—" />
          <StatCard label="Total Users" value="—" />
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
          description="API endpoint pending implementation"
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
              <tbody>
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    Organization data loads from admin API
                  </td>
                </tr>
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
                {/* Visual-only toggle */}
                <div
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent transition-colors ${
                    flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  aria-label={`${flag.name} toggle (visual only)`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition-transform ${
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
    </RoleGuard>
  );
}
