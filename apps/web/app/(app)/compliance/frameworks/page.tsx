import { FrameworkDashboard } from '@/components/compliance/framework-dashboard';

export const metadata = {
  title: 'Compliance Frameworks | CVERiskPilot',
};

export default function FrameworksPage() {
  const organizationId = 'org-default';

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Compliance Frameworks
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Auto-assessed compliance posture for SOC 2, NIST SSDF, and OWASP ASVS.
        </p>
      </div>

      <FrameworkDashboard organizationId={organizationId} />
    </div>
  );
}
