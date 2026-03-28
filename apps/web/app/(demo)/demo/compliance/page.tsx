'use client';

import { demoComplianceScores, demoStats } from '@/lib/demo-data';

/* ------------------------------------------------------------------ */
/* Framework metadata                                                 */
/* ------------------------------------------------------------------ */

interface FrameworkInfo {
  label: string;
  key: keyof typeof demoComplianceScores;
  version: string;
  controlsAssessed: number;
  controlsTotal: number;
  description: string;
}

const frameworks: FrameworkInfo[] = [
  {
    label: 'SOC 2',
    key: 'SOC2',
    version: 'Type II',
    controlsAssessed: 42,
    controlsTotal: 54,
    description:
      'Service Organization Control 2 evaluates security, availability, processing integrity, confidentiality, and privacy controls across your infrastructure.',
  },
  {
    label: 'SSDF',
    key: 'SSDF',
    version: 'NIST SP 800-218 v1.1',
    controlsAssessed: 28,
    controlsTotal: 34,
    description:
      'Secure Software Development Framework defines practices for reducing the number of vulnerabilities in released software and mitigating potential impact.',
  },
  {
    label: 'ASVS',
    key: 'ASVS',
    version: 'OWASP v4.0.3',
    controlsAssessed: 89,
    controlsTotal: 125,
    description:
      'Application Security Verification Standard provides a basis for testing web application technical security controls and a list of requirements for secure development.',
  },
];

/* ------------------------------------------------------------------ */
/* POAM data                                                          */
/* ------------------------------------------------------------------ */

interface PoamEntry {
  id: string;
  finding: string;
  milestone: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed';
  assignee: string;
}

const poamEntries: PoamEntry[] = [
  {
    id: 'POAM-001',
    finding: 'Patch Apache Log4j across production fleet',
    milestone: 'Deploy patched Log4j 2.17.1 to all services',
    dueDate: '2026-04-10',
    status: 'In Progress',
    assignee: 'Platform Team',
  },
  {
    id: 'POAM-002',
    finding: 'Remediate SQL injection in auth module',
    milestone: 'Implement parameterized queries and WAF rule',
    dueDate: '2026-04-15',
    status: 'Open',
    assignee: 'AppSec Team',
  },
  {
    id: 'POAM-003',
    finding: 'Upgrade admin panel authentication flow',
    milestone: 'Migrate to OIDC-based SSO with MFA enforcement',
    dueDate: '2026-04-05',
    status: 'In Progress',
    assignee: 'Identity Team',
  },
];

const poamStatusColors: Record<string, string> = {
  Open: 'bg-red-100 text-red-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function progressColor(score: number): string {
  if (score > 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number): string {
  if (score > 80) return 'text-green-700';
  if (score >= 60) return 'text-yellow-700';
  return 'text-red-700';
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoCompliancePage() {
  const openPoams = poamEntries.filter((p) => p.status !== 'Completed').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Framework alignment scores and remediation milestones
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Compliance scores are computed from your vulnerability data and control mappings.
        </p>
      </div>

      {/* Framework cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {frameworks.map((fw) => {
          const score = demoComplianceScores[fw.key];
          return (
            <div
              key={fw.key}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fw.label}</h3>
                  <p className="text-xs text-gray-500">{fw.version}</p>
                </div>
                <span className={`text-3xl font-bold ${scoreTextColor(score)}`}>
                  {score}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${progressColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Controls assessed */}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-500">Controls Assessed</span>
                <span className="font-medium text-gray-900">
                  {fw.controlsAssessed} / {fw.controlsTotal}
                </span>
              </div>

              {/* Description */}
              <p className="mt-4 text-sm leading-relaxed text-gray-500">
                {fw.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* POAM Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Plan of Action & Milestones (POA&M)</h2>
            <p className="mt-1 text-sm text-gray-500">
              Remediation milestones tracked against compliance requirements
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
            {openPoams} Open POAM{openPoams !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Finding</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Milestone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {poamEntries.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600">
                    {entry.id}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {entry.finding}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {entry.milestone}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(entry.dueDate).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${poamStatusColors[entry.status]}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {entry.assignee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
