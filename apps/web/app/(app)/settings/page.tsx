'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SlaSettings } from '@/components/settings/sla-settings';
import { RetentionSettings } from '@/components/settings/retention-settings';
import { SsoSettings } from '@/components/settings/sso-settings';
import { ApiKeys } from '@/components/settings/api-keys';
import { ServiceAccounts } from '@/components/settings/service-accounts';
import { IpAllowlist } from '@/components/settings/ip-allowlist';
import { ConnectorSettings } from '@/components/settings/connector-settings';
import { JiraSettings } from '@/components/settings/jira-settings';
import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { WebhookSettings } from '@/components/settings/webhook-settings';
import { OrgProfile } from '@/components/settings/org-profile';
import { AiPrompts } from '@/components/settings/ai-prompts';
import { MfaSetup } from '@/components/auth/mfa-setup';

type TabId =
  | 'org-profile'
  | 'sso'
  | 'mfa'
  | 'api-keys'
  | 'service-accounts'
  | 'ip-allowlist'
  | 'connectors'
  | 'jira'
  | 'webhooks'
  | 'sla-policies'
  | 'data-retention'
  | 'notifications'
  | 'ai-prompts';

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
      { id: 'mfa', label: 'MFA' },
      { id: 'api-keys', label: 'API Keys' },
      { id: 'service-accounts', label: 'Service Accounts' },
      { id: 'ip-allowlist', label: 'IP Allowlist' },
    ],
  },
  {
    name: 'Integrations',
    tabs: [
      { id: 'connectors', label: 'Connectors' },
      { id: 'jira', label: 'Jira' },
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
    name: 'AI',
    tabs: [{ id: 'ai-prompts', label: 'AI Prompts' }],
  },
  {
    name: 'Notifications',
    tabs: [{ id: 'notifications', label: 'Notification Preferences' }],
  },
];

const TAB_IDS = new Set<TabId>(tabGroups.flatMap((g) => g.tabs.map((t) => t.id)));

// Map URL-friendly aliases to tab IDs (e.g., /settings?tab=api → api-keys)
const TAB_ALIASES: Record<string, TabId> = {
  api: 'api-keys',
  keys: 'api-keys',
  'api-keys': 'api-keys',
  'service-accounts': 'service-accounts',
  sso: 'sso',
  mfa: 'mfa',
  jira: 'jira',
  webhooks: 'webhooks',
  connectors: 'connectors',
  sla: 'sla-policies',
  retention: 'data-retention',
  notifications: 'notifications',
  ai: 'ai-prompts',
  'ip-allowlist': 'ip-allowlist',
  'org-profile': 'org-profile',
};

export default function SettingsPage() {
  const { loaded, organizationId, tier } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam && TAB_ALIASES[tabParam]) || (tabParam && TAB_IDS.has(tabParam as TabId) ? (tabParam as TabId) : 'org-profile');
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync tab when URL query changes
  useEffect(() => {
    const t = searchParams.get('tab');
    const resolved = (t && TAB_ALIASES[t]) || (t && TAB_IDS.has(t as TabId) ? (t as TabId) : null);
    if (resolved && resolved !== activeTab) setActiveTab(resolved);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading settings...</div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-600">No organization found. Please log in again.</div>
      </div>
    );
  }

  const orgId = organizationId;
  const orgTier = tier ?? 'PRO';

  function renderTab(tab: TabId) {
    switch (tab) {
      case 'org-profile':
        return <OrgProfile organizationId={orgId} tier={orgTier} />;
      case 'sso':
        return <SsoSettings organizationId={orgId} tier={orgTier} />;
      case 'mfa':
        return <MfaSetup />;
      case 'api-keys':
        return <ApiKeys organizationId={orgId} />;
      case 'service-accounts':
        return <ServiceAccounts organizationId={orgId} />;
      case 'ip-allowlist':
        return <IpAllowlist organizationId={orgId} />;
      case 'connectors':
        return <ConnectorSettings organizationId={orgId} />;
      case 'jira':
        return <JiraSettings organizationId={orgId} />;
      case 'webhooks':
        return <WebhookSettings organizationId={orgId} />;
      case 'sla-policies':
        return <SlaSettings organizationId={orgId} />;
      case 'data-retention':
        return <RetentionSettings organizationId={orgId} />;
      case 'notifications':
        return <NotificationPreferences organizationId={orgId} />;
      case 'ai-prompts':
        return <AiPrompts organizationId={orgId} />;
      default:
        return null;
    }
  }

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
          className="block w-full rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
            {renderTab(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}
