'use client';

import { useAuth } from '@/lib/auth-context';
import { POAMView } from '@/components/compliance/poam-view';

export default function POAMPage() {
  const { loaded, organizationId, clientId } = useAuth();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const orgId = organizationId ?? 'org-default';
  const cId = clientId ?? 'client-default';

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

      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
        <POAMView clientId={cId} organizationId={orgId} />
      </div>
    </div>
  );
}
