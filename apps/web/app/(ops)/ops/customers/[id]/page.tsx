'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OpsUser {
  email: string;
  role: string;
  lastLogin: string;
  mfaEnabled: boolean;
}

interface RecentScan {
  id: string;
  date: string;
  format: string;
  findingCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PARSING';
}

interface CustomerDetail {
  org: {
    id: string;
    name: string;
    tier: string;
    status: 'active' | 'churned' | 'trial' | 'suspended';
    signupDate: string;
    stripeCustomerId: string;
  };
  users: OpsUser[];
  usage: {
    scansThisMonth: number;
    totalFindings: number;
    openCases: number;
    storageUsedMB: number;
  };
  billing: {
    plan: string;
    mrr: number;
    nextInvoiceDate: string;
    paymentMethod: string;
  };
  recentScans: RecentScan[];
}

type Tab = 'overview' | 'users' | 'billing' | 'scans';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const tierColors: Record<string, string> = {
  FREE: 'bg-gray-700 text-gray-300',
  FOUNDERS_BETA: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
  PRO: 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30',
  ENTERPRISE: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
  MSSP: 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
  trial: 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30',
  churned: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30',
};

const scanStatusColors: Record<string, string> = {
  COMPLETED: 'text-green-400',
  FAILED: 'text-red-400',
  PARSING: 'text-yellow-400',
};

function formatDate(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(cents: number): string {
  return `$${cents.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function OverviewTab({ data }: { data: CustomerDetail }) {
  return (
    <div className="space-y-6">
      {/* Org profile card */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Organization Profile
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Organization ID</dt>
            <dd className="mt-0.5 text-sm font-mono text-gray-300">{data.org.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Signup Date</dt>
            <dd className="mt-0.5 text-sm text-gray-300">{formatDate(data.org.signupDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Stripe Customer</dt>
            <dd className="mt-0.5 text-sm font-mono text-gray-300">{data.org.stripeCustomerId}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Users</dt>
            <dd className="mt-0.5 text-sm text-gray-300">{data.users.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">MFA Adoption</dt>
            <dd className="mt-0.5 text-sm text-gray-300">
              {data.users.filter((u) => u.mfaEnabled).length}/{data.users.length}
            </dd>
          </div>
        </dl>
      </div>

      {/* Usage stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Scans This Month" value={data.usage.scansThisMonth} />
        <StatCard label="Total Findings" value={data.usage.totalFindings.toLocaleString()} />
        <StatCard label="Open Cases" value={data.usage.openCases} />
        <StatCard label="Storage Used" value={`${data.usage.storageUsedMB} MB`} />
      </div>

      {/* MRR highlight */}
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400">Monthly Recurring Revenue</p>
            <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(data.billing.mrr)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Plan</p>
            <p className="text-sm font-medium text-gray-300">{data.billing.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users }: { users: OpsUser[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Last Login
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              MFA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {users.map((user) => (
            <tr key={user.email} className="hover:bg-gray-900/50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-300">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                {user.role.replace(/_/g, ' ')}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                {formatDateTime(user.lastLogin)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {user.mfaEnabled ? (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Enabled
                  </span>
                ) : (
                  <span className="text-gray-600">Disabled</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillingTab({ data }: { data: CustomerDetail }) {
  const stripeUrl = `https://dashboard.stripe.com/customers/${data.org.stripeCustomerId}`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Billing Details
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs text-gray-500">Plan</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-300">{data.billing.plan}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">MRR</dt>
            <dd className="mt-0.5 text-lg font-bold text-white">{formatCurrency(data.billing.mrr)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Next Invoice</dt>
            <dd className="mt-0.5 text-sm text-gray-300">{formatDate(data.billing.nextInvoiceDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Payment Method</dt>
            <dd className="mt-0.5 text-sm text-gray-300">{data.billing.paymentMethod}</dd>
          </div>
        </dl>
      </div>

      <a
        href={stripeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-400 transition hover:bg-violet-500/20"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        View in Stripe Dashboard
      </a>
    </div>
  );
}

function ScansTab({ scans }: { scans: RecentScan[] }) {
  if (scans.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500">No scans recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Format
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
              Findings
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {scans.map((scan) => (
            <tr key={scan.id} className="hover:bg-gray-900/50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">
                {formatDateTime(scan.date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
                  {scan.format}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-300">
                {scan.findingCount.toLocaleString()}
              </td>
              <td className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${scanStatusColors[scan.status] ?? 'text-gray-400'}`}>
                {scan.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const res = await fetch(`/api/ops/customers/${params.id}`);
        if (!res.ok) throw new Error(`Failed to load customer (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [params.id]);

  /* Loading state */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  /* Error state */
  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-sm text-red-400">{error ?? 'Customer not found'}</p>
        <Link href="/ops/customers" className="mt-2 inline-block text-sm text-violet-400 hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: `Users (${data.users.length})` },
    { key: 'billing', label: 'Billing' },
    { key: 'scans', label: 'Scan History' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back link */}
      <Link
        href="/ops/customers"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-300"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Customers
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{data.org.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tierColors[data.org.tier] ?? 'bg-gray-700 text-gray-400'}`}
          >
            {data.org.tier}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[data.org.status] ?? 'bg-gray-700 text-gray-400'}`}
          >
            {data.org.status}
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-400 transition hover:bg-violet-500/20"
          title="Impersonation - requires database-backed sessions"
          disabled
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View as Customer
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-500 hover:border-gray-700 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'users' && <UsersTab users={data.users} />}
        {activeTab === 'billing' && <BillingTab data={data} />}
        {activeTab === 'scans' && <ScansTab scans={data.recentScans} />}
      </div>
    </div>
  );
}
