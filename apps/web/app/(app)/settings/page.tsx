'use client';

import { useState } from 'react';
import { SlaSettings } from '@/components/settings/sla-settings';
import { RetentionSettings } from '@/components/settings/retention-settings';
import { SsoSettings } from '@/components/settings/sso-settings';
import { ApiKeys } from '@/components/settings/api-keys';
import { ServiceAccounts } from '@/components/settings/service-accounts';
import { IpAllowlist } from '@/components/settings/ip-allowlist';
import { ConnectorSettings } from '@/components/settings/connector-settings';
import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { WebhookSettings } from '@/components/settings/webhook-settings';
import { OrgProfile } from '@/components/settings/org-profile';

// TODO: These should come from session/auth context
const organizationId = 'org-default';
const tier = 'PRO';

type TabId =
  | 'org-profile'
  | 'sso'
  | 'api-keys'
  | 'service-accounts'
  | 'ip-allowlist'
  | 'connectors'
  | 'webhooks'
  | 'sla-policies'
  | 'data-retention'
  | 'notifications';

interface TabItem {
  id: TabId;
  label: string;
}

interface TabGroup {
  name: string;
  tabs: TabItem[];
}

const tabGroups: TabGroup[] = [
  {
    name: 'Organization',
    tabs: [{ id: 'org-profile', label: 'Org Profile' }],
  },
  {
    name: 'Security',
    tabs: [
      { id: 'sso', label: 'SSO' },
      { id: 'api-keys', label: 'API Keys' },
      { id: 'service-accounts', label: 'Service Accounts' },
      { id: 'ip-allowlist', label: 'IP Allowlist' },
    ],
  },
  {
    name: 'Integrations',
    tabs: [
      { id: 'connectors', label: 'Connectors' },
      { id: 'webhooks', label: 'Webhooks' },
    ],
  },
  {
    name: 'Policies',
    tabs: [
      { id: 'sla-policies', label: 'SLA Policies' },
      { id: 'data-retention', label: 'Data Retention' },
    ],
  },
  {
    name: 'Notifications',
    tabs: [{ id: 'notifications', label: 'Notification Preferences' }],
  },
];

const allTabs = tabGroups.flatMap((g) => g.tabs);

function renderTab(activeTab: TabId) {
  switch (activeTab) {
    case 'org-profile':
      return <OrgProfile organizationId={organizationId} tier={tier} />;
    case 'sso':
      return <SsoSettings organizationId={organizationId} tier={tier} />;
    case 'api-keys':
      return <ApiKeys organizationId={organizationId} />;
    case 'service-accounts':
      return <ServiceAccounts organizationId={organizationId} />;
    case 'ip-allowlist':
      return <IpAllowlist organizationId={organizationId} />;
    case 'connectors':
      return <ConnectorSettings organizationId={organizationId} />;
    case 'webhooks':
      return <WebhookSettings organizationId={organizationId} />;
    case 'sla-policies':
      return <SlaSettings organizationId={organizationId} />;
    case 'data-retention':
      return <RetentionSettings organizationId={organizationId} />;
    case 'notifications':
      return <NotificationPreferences organizationId={organizationId} />;
    default:
      return null;
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('org-profile');

  const activeLabel = allTabs.find((t) => t.id === activeTab)?.label ?? 'Settings';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization, security, integrations, and platform configuration.
        </p>
      </div>

      {/* Mobile: dropdown selector */}
      <div className="md:hidden">
        <label htmlFor="settings-tab" className="sr-only">
          Settings section
        </label>
        <select
          id="settings-tab"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {tabGroups.map((group) => (
            <optgroup key={group.name} label={group.name}>
              {group.tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Desktop: vertical sidebar nav */}
        <nav className="hidden md:block md:w-56 md:shrink-0">
          <div className="space-y-6">
            {tabGroups.map((group) => (
              <div key={group.name}>
                <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {group.name}
                </h3>
                <ul className="space-y-0.5">
                  {group.tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Main content area */}
        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            {renderTab(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}
