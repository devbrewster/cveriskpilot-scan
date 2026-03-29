'use client';

import { useState } from 'react';
import Link from 'next/link';

type TabId =
  | 'org-profile'
  | 'sso'
  | 'api-keys'
  | 'service-accounts'
  | 'ip-allowlist'
  | 'connectors'
  | 'jira'
  | 'webhooks'
  | 'sla-policies'
  | 'data-retention'
  | 'ai-prompts'
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
      { id: 'sso', label: 'SSO / SAML' },
      { id: 'api-keys', label: 'API Keys' },
      { id: 'service-accounts', label: 'Service Accounts' },
      { id: 'ip-allowlist', label: 'IP Allowlist' },
    ],
  },
  {
    name: 'Integrations',
    tabs: [
      { id: 'connectors', label: 'Scanner Connectors' },
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

const tabLabels: Record<TabId, string> = {} as Record<TabId, string>;
for (const group of tabGroups) {
  for (const tab of group.tabs) {
    tabLabels[tab.id] = tab.label;
  }
}

/* ---------- Org Profile tab ---------- */
function OrgProfileContent() {
  const fields = [
    { label: 'Organization Name', value: 'Acme Corp Security' },
    { label: 'Plan', value: 'Pro', badge: true },
    { label: 'Members', value: '12 users' },
    { label: 'Created', value: 'January 2024' },
    { label: 'Primary Domain', value: 'acmecorp.io' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Organization Profile</h2>
      <p className="mt-1 text-sm text-gray-500">
        Basic information about your organization.
      </p>
      <div className="mt-6 space-y-4">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="block text-sm font-medium text-gray-700">{f.label}</label>
            <div className="mt-1">
              {f.badge ? (
                <div className="flex items-center gap-2">
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {f.value}
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Pro
                  </span>
                </div>
              ) : (
                <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {f.value}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Webhooks tab ---------- */
function WebhooksContent() {
  const webhooks = [
    {
      url: 'https://hooks.slack.com/services/...',
      active: true,
      events: ['scan.complete', 'case.created'],
      lastDelivery: '2 hours ago, 200 OK',
    },
    {
      url: 'https://api.pagerduty.com/webhooks/...',
      active: true,
      events: ['sla.breached'],
      lastDelivery: '1 day ago, 200 OK',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
          <p className="mt-1 text-sm text-gray-500">
            Receive real-time notifications when events occur.
          </p>
        </div>
        <button
          disabled
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
        >
          Add Webhook
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {webhooks.map((wh, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 font-mono">
                  {wh.url}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {wh.events.map((ev) => (
                    <span
                      key={ev}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Last delivery: {wh.lastDelivery}
                </p>
              </div>
              <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- SLA Policies tab ---------- */
function SlaPoliciesContent() {
  const policies = [
    { severity: 'Critical', dueWithin: '3 days', enabled: true },
    { severity: 'High', dueWithin: '7 days', enabled: true },
    { severity: 'Medium', dueWithin: '30 days', enabled: true },
    { severity: 'Low', dueWithin: '90 days', enabled: false },
  ];

  const severityColors: Record<string, string> = {
    Critical: 'text-red-700 bg-red-50',
    High: 'text-orange-700 bg-orange-50',
    Medium: 'text-yellow-700 bg-yellow-50',
    Low: 'text-blue-700 bg-blue-50',
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">SLA Policies</h2>
      <p className="mt-1 text-sm text-gray-500">
        Define remediation deadlines by severity level.
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Due Within
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {policies.map((p) => (
              <tr key={p.severity}>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${severityColors[p.severity] ?? ''}`}
                  >
                    {p.severity}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {p.dueWithin}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Placeholder for other tabs ---------- */
function PlaceholderContent({ tabName }: { tabName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{tabName}</h3>
      <p className="mt-1 text-sm text-gray-500">
        This configuration is available in the full product.
      </p>
      <Link
        href="/signup"
        className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        Get Started
      </Link>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function DemoSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('org-profile');

  function renderTab(tab: TabId) {
    switch (tab) {
      case 'org-profile':
        return <OrgProfileContent />;
      case 'webhooks':
        return <WebhooksContent />;
      case 'sla-policies':
        return <SlaPoliciesContent />;
      default:
        return <PlaceholderContent tabName={tabLabels[tab]} />;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <svg
          className="h-4 w-4 shrink-0 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <span className="text-sm font-medium text-blue-800">
          Viewing demo settings. Data shown is simulated.
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your organization, security, integrations, and policies.
        </p>
      </div>

      {/* Mobile: dropdown selector */}
      <div className="md:hidden">
        <label htmlFor="demo-settings-tab" className="sr-only">
          Settings section
        </label>
        <select
          id="demo-settings-tab"
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

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Left sidebar tabs */}
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
                        className={`w-full rounded-r-md border-l-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-transparent text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
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

        {/* Right content area */}
        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            {renderTab(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}
