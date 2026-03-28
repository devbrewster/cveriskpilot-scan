import { POAMView } from '@/components/compliance/poam-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'POAM Tracking | CVERiskPilot',
};

export default function POAMPage() {
  // In production, clientId comes from the active client context / URL params.
  const clientId = 'client-default';
  const organizationId = 'org-default';

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          POAM Tracking
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          NIST 800-171 Plan of Action and Milestones generated from your vulnerability cases.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <POAMView clientId={clientId} organizationId={organizationId} />
      </div>
    </div>
  );
}
