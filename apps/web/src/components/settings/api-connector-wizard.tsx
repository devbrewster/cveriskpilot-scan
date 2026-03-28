'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiScannerType = 'TENABLE_IO' | 'QUALYS_VMDR' | 'CROWDSTRIKE_SPOTLIGHT' | 'RAPID7_INSIGHTVM' | 'SNYK';
type WizardStep = 1 | 2 | 3 | 4 | 5;
type SyncInterval = 15 | 30 | 60 | 240 | 720 | 1440;
type SeverityFilter = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface ScannerOption {
  type: ApiScannerType;
  name: string;
  description: string;
  authMethod: string;
}

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'password' | 'text' | 'select';
  options?: { value: string; label: string }[];
}

interface WizardData {
  scannerType: ApiScannerType | null;
  name: string;
  credentials: Record<string, string>;
  syncIntervalMinutes: SyncInterval;
  severityFilter: SeverityFilter[];
  clientId: string;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
}

interface ApiConnectorWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
  clients?: { id: string; name: string }[];
  isMssp?: boolean;
}

// ---------------------------------------------------------------------------
// Scanner definitions
// ---------------------------------------------------------------------------

const SCANNER_OPTIONS: ScannerOption[] = [
  {
    type: 'TENABLE_IO',
    name: 'Tenable.io',
    description: 'Cloud-based vulnerability management. Export-based sync with chunked downloads.',
    authMethod: 'API Key Pair',
  },
  {
    type: 'QUALYS_VMDR',
    name: 'Qualys VMDR',
    description: 'Enterprise vulnerability management with host detection. XML API with cursor pagination.',
    authMethod: 'Basic Auth',
  },
  {
    type: 'CROWDSTRIKE_SPOTLIGHT',
    name: 'CrowdStrike Falcon',
    description: 'Endpoint vulnerability assessment via Falcon Spotlight. OAuth2 with FQL queries.',
    authMethod: 'OAuth2 Client Credentials',
  },
  {
    type: 'RAPID7_INSIGHTVM',
    name: 'Rapid7 InsightVM',
    description: 'On-prem and cloud vulnerability management. REST API with page-based pagination.',
    authMethod: 'API Key',
  },
  {
    type: 'SNYK',
    name: 'Snyk',
    description: 'Developer-first SCA and container scanning. REST API with webhook push support.',
    authMethod: 'API Token',
  },
];

const CREDENTIAL_FIELDS: Record<ApiScannerType, CredentialField[]> = {
  TENABLE_IO: [
    { key: 'accessKey', label: 'Access Key', placeholder: 'Enter your Tenable.io access key', required: true, type: 'password' },
    { key: 'secretKey', label: 'Secret Key', placeholder: 'Enter your Tenable.io secret key', required: true, type: 'password' },
  ],
  QUALYS_VMDR: [
    { key: 'username', label: 'Username', placeholder: 'Enter your Qualys username', required: true, type: 'text' },
    { key: 'password', label: 'Password', placeholder: 'Enter your Qualys password', required: true, type: 'password' },
    {
      key: 'apiUrl', label: 'API Platform', placeholder: 'Select your Qualys platform', required: true, type: 'select',
      options: [
        { value: 'https://qualysapi.qualys.com', label: 'US Platform 1 (qualysapi.qualys.com)' },
        { value: 'https://qualysapi.qg2.apps.qualys.com', label: 'US Platform 2 (qg2)' },
        { value: 'https://qualysapi.qg3.apps.qualys.com', label: 'US Platform 3 (qg3)' },
        { value: 'https://qualysapi.qg1.apps.qualys.eu', label: 'EU Platform 1 (qg1.eu)' },
        { value: 'https://qualysapi.qg2.apps.qualys.eu', label: 'EU Platform 2 (qg2.eu)' },
      ],
    },
  ],
  CROWDSTRIKE_SPOTLIGHT: [
    { key: 'clientId', label: 'Client ID', placeholder: 'Enter your CrowdStrike client ID', required: true, type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'Enter your CrowdStrike client secret', required: true, type: 'password' },
    {
      key: 'baseUrl', label: 'Base URL', placeholder: 'Select your CrowdStrike cloud', required: true, type: 'select',
      options: [
        { value: 'https://api.crowdstrike.com', label: 'US-1 (api.crowdstrike.com)' },
        { value: 'https://api.us-2.crowdstrike.com', label: 'US-2 (api.us-2.crowdstrike.com)' },
        { value: 'https://api.eu-1.crowdstrike.com', label: 'EU-1 (api.eu-1.crowdstrike.com)' },
        { value: 'https://api.laggar.gcw.crowdstrike.com', label: 'GOV (laggar.gcw)' },
      ],
    },
  ],
  RAPID7_INSIGHTVM: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Enter your Rapid7 API key', required: true, type: 'password' },
    {
      key: 'region', label: 'Region', placeholder: 'Select your region', required: true, type: 'select',
      options: [
        { value: 'https://us.api.insight.rapid7.com', label: 'United States (us.api.insight.rapid7.com)' },
        { value: 'https://eu.api.insight.rapid7.com', label: 'Europe (eu.api.insight.rapid7.com)' },
        { value: 'https://ap.api.insight.rapid7.com', label: 'Asia Pacific (ap.api.insight.rapid7.com)' },
      ],
    },
  ],
  SNYK: [
    { key: 'apiToken', label: 'API Token', placeholder: 'Enter your Snyk API token', required: true, type: 'password' },
    { key: 'orgId', label: 'Organization ID', placeholder: 'Enter your Snyk organization ID', required: true, type: 'text' },
  ],
};

const SYNC_INTERVALS: { value: SyncInterval; label: string }[] = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 240, label: 'Every 4 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours' },
];

const SEVERITY_OPTIONS: SeverityFilter[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_COLORS: Record<SeverityFilter, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  LOW: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  INFO: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
};

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function ShieldIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function XCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function EyeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

// ---------------------------------------------------------------------------
// Password field with toggle
// ---------------------------------------------------------------------------

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label} *</label>
      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {visible ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Scanner', 'Credentials', 'Configure', 'Test', 'Confirm'];

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 pb-4">
      {STEP_LABELS.map((label, idx) => {
        const step = (idx + 1) as WizardStep;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {idx > 0 && (
              <div className={`h-px w-6 ${isCompleted ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : isCompleted
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className={`mt-1 text-[10px] font-medium ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export function ApiConnectorWizard({
  open,
  onClose,
  onCreated,
  organizationId,
  clients = [],
  isMssp = false,
}: ApiConnectorWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>({
    scannerType: null,
    name: '',
    credentials: {},
    syncIntervalMinutes: 60,
    severityFilter: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    clientId: '',
  });
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const resetWizard = useCallback(() => {
    setStep(1);
    setData({
      scannerType: null,
      name: '',
      credentials: {},
      syncIntervalMinutes: 60,
      severityFilter: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      clientId: '',
    });
    setTestResult({ status: 'idle', message: '' });
    setCreating(false);
    setCreateError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [onClose, resetWizard]);

  const updateData = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateCredential = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, credentials: { ...prev.credentials, [key]: value } }));
  }, []);

  const toggleSeverity = useCallback((severity: SeverityFilter) => {
    setData((prev) => {
      const current = prev.severityFilter;
      const next = current.includes(severity)
        ? current.filter((s) => s !== severity)
        : [...current, severity];
      return { ...prev, severityFilter: next };
    });
  }, []);

  // Step validation
  const canProceedStep1 = data.scannerType !== null;
  const canProceedStep2 = data.scannerType !== null && data.name.trim() !== '' &&
    CREDENTIAL_FIELDS[data.scannerType].every((f) => !f.required || (data.credentials[f.key] ?? '').trim() !== '');
  const canProceedStep3 = data.severityFilter.length > 0 && (!isMssp || data.clientId !== '');
  const canProceedStep4 = testResult.status === 'success';

  // Test connection
  const handleTestConnection = async () => {
    if (!data.scannerType) return;
    setTestResult({ status: 'testing', message: 'Testing connection...' });

    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          type: data.scannerType,
          credentials: data.credentials,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        setTestResult({ status: 'success', message: body.message || 'Connection successful.' });
      } else {
        const body = await res.json().catch(() => ({ error: 'Connection test failed.' }));
        setTestResult({ status: 'error', message: body.error || 'Connection test failed.' });
      }
    } catch {
      setTestResult({ status: 'error', message: 'Network error. Could not reach the API.' });
    }
  };

  // Create connector
  const handleCreate = async () => {
    if (!data.scannerType) return;
    setCreating(true);
    setCreateError(null);

    const scannerOption = SCANNER_OPTIONS.find((s) => s.type === data.scannerType);

    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: data.name,
          type: data.scannerType,
          isApiConnector: true,
          endpoint: getEndpointFromCredentials(data.scannerType, data.credentials),
          authConfig: data.credentials,
          scannerConfig: {
            severityFilter: data.severityFilter,
          },
          syncIntervalMinutes: data.syncIntervalMinutes,
          clientId: data.clientId || undefined,
        }),
      });

      if (res.ok) {
        onCreated();
        handleClose();
      } else {
        const body = await res.json().catch(() => ({ error: 'Failed to create connector.' }));
        setCreateError(body.error || 'Failed to create connector.');
      }
    } catch {
      setCreateError('Network error. Could not reach the API.');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  const scannerOption = data.scannerType ? SCANNER_OPTIONS.find((s) => s.type === data.scannerType) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

      {/* Dialog panel */}
      <div className="relative z-10 mx-4 flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 pt-6 pb-2 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 id="wizard-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Add API Connector
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <StepIndicator currentStep={step} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Select Scanner */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Select the scanner platform to connect.</p>
              <div className="space-y-2">
                {SCANNER_OPTIONS.map((scanner) => {
                  const isSelected = data.scannerType === scanner.type;
                  return (
                    <button
                      key={scanner.type}
                      type="button"
                      onClick={() => updateData('scannerType', scanner.type)}
                      className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <ShieldIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                            {scanner.name}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {scanner.authMethod}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{scanner.description}</p>
                      </div>
                      <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && data.scannerType && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter your {scannerOption?.name} credentials. These will be encrypted at rest.
              </p>
              <div>
                <label className={labelCls}>Connector Name *</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateData('name', e.target.value)}
                  className={inputCls}
                  placeholder={`e.g., Production ${scannerOption?.name}`}
                />
              </div>
              {CREDENTIAL_FIELDS[data.scannerType].map((field) => {
                if (field.type === 'select') {
                  return (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label} *</label>
                      <select
                        value={data.credentials[field.key] ?? ''}
                        onChange={(e) => updateCredential(field.key, e.target.value)}
                        className={inputCls}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (field.type === 'password') {
                  return (
                    <PasswordField
                      key={field.key}
                      label={field.label}
                      value={data.credentials[field.key] ?? ''}
                      onChange={(v) => updateCredential(field.key, v)}
                      placeholder={field.placeholder}
                    />
                  );
                }
                return (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label} *</label>
                    <input
                      type="text"
                      value={data.credentials[field.key] ?? ''}
                      onChange={(e) => updateCredential(field.key, e.target.value)}
                      className={inputCls}
                      placeholder={field.placeholder}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure sync behavior for this connector.
              </p>

              {/* Sync interval */}
              <div>
                <label className={labelCls}>Sync Interval</label>
                <select
                  value={data.syncIntervalMinutes}
                  onChange={(e) => updateData('syncIntervalMinutes', Number(e.target.value) as SyncInterval)}
                  className={inputCls}
                >
                  {SYNC_INTERVALS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">How often to pull new findings from the scanner.</p>
              </div>

              {/* Severity filter */}
              <div>
                <label className={labelCls}>Severity Filter</label>
                <p className="mt-0.5 mb-2 text-xs text-gray-400">Only sync findings matching selected severity levels.</p>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map((severity) => {
                    const isChecked = data.severityFilter.includes(severity);
                    return (
                      <button
                        key={severity}
                        type="button"
                        onClick={() => toggleSeverity(severity)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          isChecked
                            ? SEVERITY_COLORS[severity]
                            : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSeverity(severity)}
                          className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {severity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client assignment (MSSP) */}
              {isMssp && clients.length > 0 && (
                <div>
                  <label className={labelCls}>Assign to Client *</label>
                  <select
                    value={data.clientId}
                    onChange={(e) => updateData('clientId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">All synced findings will be scoped to this client.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Test Connection */}
          {step === 4 && (
            <div className="flex flex-col items-center py-6">
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                Test the connection to {scannerOption?.name} before saving.
              </p>

              {testResult.status === 'idle' && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Test Connection
                </button>
              )}

              {testResult.status === 'testing' && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <SpinnerIcon className="h-5 w-5 text-primary-500" />
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              {testResult.status === 'success' && (
                <div className="w-full max-w-sm">
                  <div className="flex flex-col items-center rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
                    <CheckCircleIcon className="h-10 w-10 text-green-500" />
                    <p className="mt-3 text-sm font-medium text-green-800 dark:text-green-400">{testResult.message}</p>
                  </div>
                </div>
              )}

              {testResult.status === 'error' && (
                <div className="w-full max-w-sm space-y-4">
                  <div className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <XCircleIcon className="h-10 w-10 text-red-500" />
                    <p className="mt-3 text-sm font-medium text-red-800 dark:text-red-400">{testResult.message}</p>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Confirm & Save */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Review your connector configuration.</p>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Scanner</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{scannerOption?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{data.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Sync Interval</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {SYNC_INTERVALS.find((i) => i.value === data.syncIntervalMinutes)?.label}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Severity Filter</dt>
                    <dd className="flex flex-wrap gap-1 justify-end">
                      {data.severityFilter.map((s) => (
                        <span key={s} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[s]}`}>
                          {s}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {data.clientId && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Client</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {clients.find((c) => c.id === data.clientId)?.name ?? data.clientId}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Connection</dt>
                    <dd className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="font-medium">Verified</span>
                    </dd>
                  </div>
                </dl>
              </div>

              {createError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {createError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={step === 1 ? handleClose : () => {
              if (step === 4) setTestResult({ status: 'idle', message: '' });
              setStep((step - 1) as WizardStep);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Step {step} of 5</span>
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3) ||
                  (step === 4 && !canProceedStep4)
                }
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === 4 ? 'Next' : 'Continue'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <SpinnerIcon className="h-4 w-4" />
                    Creating...
                  </span>
                ) : (
                  'Create Connector'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: derive endpoint URL from credentials based on scanner type
// ---------------------------------------------------------------------------

function getEndpointFromCredentials(type: ApiScannerType, credentials: Record<string, string>): string {
  switch (type) {
    case 'TENABLE_IO':
      return 'https://cloud.tenable.com';
    case 'QUALYS_VMDR':
      return credentials.apiUrl || 'https://qualysapi.qualys.com';
    case 'CROWDSTRIKE_SPOTLIGHT':
      return credentials.baseUrl || 'https://api.crowdstrike.com';
    case 'RAPID7_INSIGHTVM':
      return credentials.region || 'https://us.api.insight.rapid7.com';
    case 'SNYK':
      return 'https://api.snyk.io';
    default:
      return '';
  }
}
