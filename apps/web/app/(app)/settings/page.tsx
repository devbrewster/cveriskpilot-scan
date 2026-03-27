import { SlaSettings } from '@/components/settings/sla-settings';
import { RetentionSettings } from '@/components/settings/retention-settings';

export const metadata = {
  title: 'Settings | CVERiskPilot',
};

export default function SettingsPage() {
  // In a real app, organizationId comes from session/auth context.
  // Using a placeholder that the client component can override via props or context.
  const organizationId = 'org-default';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization, SLA policies, and platform configuration.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <SlaSettings organizationId={organizationId} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <RetentionSettings organizationId={organizationId} />
      </div>
    </div>
  );
}
