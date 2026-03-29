import Link from 'next/link';

export const metadata = {
  title: 'Compliance | CVERiskPilot Demo',
};

const complianceModules = [
  {
    title: 'POAM Tracking',
    description:
      'Plan of Action and Milestones (NIST 800-171). Generate and export POAM reports from your open vulnerability cases.',
    href: '/demo/compliance',
    icon: (
      <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Framework Dashboards',
    description:
      'Auto-assessed compliance posture for SOC 2 Type II, NIST SSDF, and OWASP ASVS frameworks.',
    href: '/demo/compliance',
    icon: (
      <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Data Retention',
    description:
      'Configure retention policies for findings, artifacts, audit logs, and reports.',
    href: '/demo/settings',
    icon: (
      <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Privacy (GDPR/CCPA)',
    description:
      'Data export, right to erasure, and per-client data deletion flows for privacy compliance.',
    href: '/demo/clients',
    icon: (
      <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export default function DemoCompliancePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing demo compliance hub. Upload your own scans to see real compliance data.
        </p>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Hub</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage compliance reporting, framework assessments, data retention, and privacy controls.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {complianceModules.map((mod) => (
          <Link
            key={mod.title}
            href={mod.href}
            className="group rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              {mod.icon}
              <div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
                  {mod.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
