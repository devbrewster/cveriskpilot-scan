'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingFormData {
  orgName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  tier: string;
  features: string[];
  defaultClientName: string;
}

interface OnboardingResult {
  orgId: string;
  userId: string;
  clientId: string;
  slug: string;
  apiKey: string;
}

const TIERS = [
  { value: 'FREE', label: 'Free', price: '$0/mo' },
  { value: 'FOUNDERS_BETA', label: 'Founders Beta', price: '$29/mo' },
  { value: 'PRO', label: 'Pro', price: '$49/mo' },
  { value: 'ENTERPRISE', label: 'Enterprise', price: '$199/mo' },
  { value: 'MSSP', label: 'MSSP', price: '$499/mo' },
];

const AVAILABLE_FEATURES = [
  { value: 'SSO', label: 'Single Sign-On' },
  { value: 'JIRA_SYNC', label: 'Jira Integration' },
  { value: 'CUSTOM_SLA', label: 'Custom SLA Policies' },
  { value: 'WEBHOOKS', label: 'Webhooks' },
  { value: 'PORTFOLIO_VIEW', label: 'Portfolio Dashboard' },
  { value: 'API_ACCESS', label: 'API Access' },
  { value: 'CUSTOM_PARSERS', label: 'Custom Parsers' },
  { value: 'WHITE_LABEL', label: 'White Labeling' },
];

const STEPS = ['Organization', 'Tier', 'Owner Account', 'Integrations', 'Review'];

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepOrganization({
  data,
  onChange,
}: {
  data: OnboardingFormData;
  onChange: (d: Partial<OnboardingFormData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Organization Name *
        </label>
        <input
          type="text"
          value={data.orgName}
          onChange={(e) => onChange({ orgName: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Acme Security Inc."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Default Client Name
        </label>
        <input
          type="text"
          value={data.defaultClientName}
          onChange={(e) => onChange({ defaultClientName: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Leave blank to use org name"
        />
      </div>
    </div>
  );
}

function StepTier({
  data,
  onChange,
}: {
  data: OnboardingFormData;
  onChange: (d: Partial<OnboardingFormData>) => void;
}) {
  return (
    <div className="space-y-3">
      {TIERS.map((tier) => (
        <label
          key={tier.value}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
            data.tier === tier.value
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
          }`}
        >
          <input
            type="radio"
            name="tier"
            value={tier.value}
            checked={data.tier === tier.value}
            onChange={() => onChange({ tier: tier.value })}
            className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div className="flex-1">
            <span className="font-medium text-gray-900 dark:text-white">{tier.label}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{tier.price}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

function StepOwner({
  data,
  onChange,
}: {
  data: OnboardingFormData;
  onChange: (d: Partial<OnboardingFormData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Owner Name *
        </label>
        <input
          type="text"
          value={data.ownerName}
          onChange={(e) => onChange({ ownerName: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Owner Email *
        </label>
        <input
          type="email"
          value={data.ownerEmail}
          onChange={(e) => onChange({ ownerEmail: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="jane@acme.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input
          type="password"
          value={data.ownerPassword}
          onChange={(e) => onChange({ ownerPassword: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Leave blank for SSO-only account"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Optional. If empty, the user must sign in via SSO or magic link.
        </p>
      </div>
    </div>
  );
}

function StepIntegrations({
  data,
  onChange,
}: {
  data: OnboardingFormData;
  onChange: (d: Partial<OnboardingFormData>) => void;
}) {
  const toggleFeature = (feature: string) => {
    const features = data.features.includes(feature)
      ? data.features.filter((f) => f !== feature)
      : [...data.features, feature];
    onChange({ features });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Select additional feature overrides for this tenant (beyond tier defaults).
      </p>
      {AVAILABLE_FEATURES.map((feature) => (
        <label
          key={feature.value}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <input
            type="checkbox"
            checked={data.features.includes(feature.value)}
            onChange={() => toggleFeature(feature.value)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{feature.label}</span>
        </label>
      ))}
    </div>
  );
}

function StepReview({ data }: { data: OnboardingFormData }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white">Confirm Onboarding Details</h4>
      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        <div className="flex justify-between px-4 py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Organization</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{data.orgName}</span>
        </div>
        <div className="flex justify-between px-4 py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Tier</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{data.tier}</span>
        </div>
        <div className="flex justify-between px-4 py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Owner</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{data.ownerName} ({data.ownerEmail})</span>
        </div>
        <div className="flex justify-between px-4 py-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Default Client</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{data.defaultClientName || data.orgName}</span>
        </div>
        {data.features.length > 0 && (
          <div className="flex justify-between px-4 py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Feature Overrides</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{data.features.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<OnboardingFormData>({
    orgName: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
    tier: 'PRO',
    features: [],
    defaultClientName: '',
  });

  const updateForm = (partial: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return formData.orgName.trim().length > 0;
      case 1: return formData.tier.length > 0;
      case 2: return formData.ownerEmail.trim().length > 0 && formData.ownerName.trim().length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Onboarding failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Tenant Onboarded</h3>
        </div>
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 text-sm dark:divide-gray-700 dark:border-gray-700">
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-500 dark:text-gray-400">Org ID</span>
            <code className="text-gray-900 dark:text-white">{result.orgId}</code>
          </div>
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-500 dark:text-gray-400">User ID</span>
            <code className="text-gray-900 dark:text-white">{result.userId}</code>
          </div>
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-500 dark:text-gray-400">Client ID</span>
            <code className="text-gray-900 dark:text-white">{result.clientId}</code>
          </div>
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-500 dark:text-gray-400">API Key</span>
            <code className="max-w-[200px] truncate text-gray-900 dark:text-white">{result.apiKey}</code>
          </div>
        </div>
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          Save the API key now. It will not be shown again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
      {/* Progress stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? 'bg-primary-600 text-white'
                    : i === step
                    ? 'border-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-2 border-gray-300 text-gray-400 dark:border-gray-600'
                }`}
              >
                {i < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-1 rounded-full bg-primary-600 transition-all"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[240px]">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {STEPS[step]}
        </h3>
        {step === 0 && <StepOrganization data={formData} onChange={updateForm} />}
        {step === 1 && <StepTier data={formData} onChange={updateForm} />}
        {step === 2 && <StepOwner data={formData} onChange={updateForm} />}
        {step === 3 && <StepIntegrations data={formData} onChange={updateForm} />}
        {step === 4 && <StepReview data={formData} />}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Onboarding...' : 'Onboard Tenant'}
          </button>
        )}
      </div>
    </div>
  );
}
