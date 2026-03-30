'use client';

import { useState, useEffect, useCallback } from 'react';

interface SSOConnection {
  id: string;
  type: string;
  state: 'active' | 'inactive' | 'validating';
  name: string;
  domain?: string;
  createdAt: string;
}

interface SsoSettingsProps {
  organizationId: string;
  tier: string;
}

export function SsoSettings({ organizationId, tier }: SsoSettingsProps) {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [connections, setConnections] = useState<SSOConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEnterprise = tier === 'ENTERPRISE' || tier === 'MSSP';

  const fetchSSOStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings/ip-allowlist?type=sso&organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setSsoEnabled(data.enabled ?? false);
        setConnections(data.connections ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SSO settings');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSSOStatus();
  }, [fetchSSOStatus]);

  const handleToggleSSO = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/settings/ip-allowlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ssoEnabled: !ssoEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update SSO setting');
      }

      setSsoEnabled(!ssoEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update SSO');
    } finally {
      setSaving(false);
    }
  };

  const initiateSSO = () => {
    window.location.href = `/api/auth/sso?organizationId=${organizationId}`;
  };

  if (!isEnterprise) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Single Sign-On (SSO)</h2>
          <p className="text-sm text-gray-500">
            Configure SAML SSO for your organization.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">
            SSO is available on Enterprise and MSSP plans.
          </p>
          <p className="mt-1 text-xs text-amber-600">
            Upgrade your plan to enable SAML SSO for your organization.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Single Sign-On (SSO)</h2>
          <p className="text-sm text-gray-500">
            Configure SAML SSO for your organization. Members will sign in through your Identity Provider.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading SSO configuration...</div>
      ) : (
        <>
          {/* SSO Toggle */}
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">SSO Authentication</h3>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, organization members authenticate through your SAML Identity Provider.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleSSO}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  ssoEnabled ? 'bg-primary-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={ssoEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${
                    ssoEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">SSO Connections</h3>

            {connections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.01l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No SSO connections configured.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Contact support to set up a SAML connection with your Identity Provider.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{conn.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{conn.type}</span>
                        {conn.domain && (
                          <span className="text-xs text-gray-400">({conn.domain})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          conn.state === 'active'
                            ? 'bg-green-100 text-green-800'
                            : conn.state === 'validating'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {conn.state === 'active' ? 'Active' : conn.state === 'validating' ? 'Validating' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test SSO */}
          {ssoEnabled && (
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
              <h3 className="text-sm font-medium text-gray-900">Test SSO Login</h3>
              <p className="mt-1 text-xs text-gray-500">
                Test the SSO flow to verify your IdP configuration is working correctly.
              </p>
              <button
                type="button"
                onClick={initiateSSO}
                className="mt-3 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Test SSO Login
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
