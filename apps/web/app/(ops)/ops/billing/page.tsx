'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

interface OverdueInvoice {
  id: string;
  orgName: string;
  amount: number;
  daysOverdue: number;
  stripeInvoiceId: string;
  email: string;
}

interface Transaction {
  id: string;
  date: string;
  orgName: string;
  amount: number;
  type: 'payment' | 'refund' | 'upgrade';
  status: 'succeeded' | 'failed' | 'pending';
}

interface BillingData {
  mrr: number;
  arr: number;
  customerCount: number;
  overdueTotal: number;
  tierDistribution: Record<string, number>;
  overdueInvoices: OverdueInvoice[];
  recentTransactions: Transaction[];
}

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-gray-500',
  FOUNDERS_BETA: 'bg-amber-500',
  PRO: 'bg-violet-500',
  ENTERPRISE: 'bg-blue-500',
  MSSP: 'bg-emerald-500',
};

const TIER_TEXT_COLORS: Record<string, string> = {
  FREE: 'text-gray-400',
  FOUNDERS_BETA: 'text-amber-400',
  PRO: 'text-violet-400',
  ENTERPRISE: 'text-blue-400',
  MSSP: 'text-emerald-400',
};

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  payment: { bg: 'bg-green-500/15 ring-green-500/30', text: 'text-green-400' },
  refund: { bg: 'bg-red-500/15 ring-red-500/30', text: 'text-red-400' },
  upgrade: { bg: 'bg-violet-500/15 ring-violet-500/30', text: 'text-violet-400' },
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  succeeded: { bg: 'bg-green-500/15 ring-green-500/30', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/15 ring-red-500/30', text: 'text-red-400' },
  pending: { bg: 'bg-yellow-500/15 ring-yellow-500/30', text: 'text-yellow-400' },
};

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return cents < 0 ? `-${formatted}` : formatted;
}

export default function OpsBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ops/billing')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-800" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-80 animate-pulse rounded-lg bg-gray-800" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        Failed to load billing data.
      </div>
    );
  }

  const totalCustomers = Object.values(data.tierDistribution).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing Operations</h1>
        <p className="mt-1 text-sm text-gray-400">Revenue metrics, invoices, and transaction history</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OpsKpiCard label="MRR" value={formatCurrency(data.mrr)} accent="text-violet-400" />
        <OpsKpiCard label="ARR" value={formatCurrency(data.arr)} accent="text-violet-400" />
        <OpsKpiCard label="Paying Customers" value={data.customerCount.toLocaleString()} />
        <OpsKpiCard
          label="Overdue Amount"
          value={formatCurrency(data.overdueTotal)}
          accent="text-red-400"
        />
      </div>

      {/* Tier Distribution */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Customer Tier Distribution</h3>

        {/* Stacked bar */}
        <div className="mb-4 flex h-8 w-full overflow-hidden rounded-md">
          {Object.entries(data.tierDistribution).map(([tier, count]) => (
            <div
              key={tier}
              className={`${TIER_COLORS[tier] ?? 'bg-gray-600'} transition-all`}
              style={{ width: `${(count / totalCustomers) * 100}%` }}
              title={`${tier}: ${count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(data.tierDistribution).map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-2 text-xs">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${TIER_COLORS[tier] ?? 'bg-gray-600'}`} />
              <span className={TIER_TEXT_COLORS[tier] ?? 'text-gray-400'}>
                {tier.replace(/_/g, ' ')}
              </span>
              <span className="text-gray-500 font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Invoices */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Overdue Invoices
            <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/30">
              {data.overdueInvoices.length}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Organization</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Days Overdue</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {data.overdueInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-800/50">
                  <td className="py-3 pr-4 text-gray-300">{inv.orgName}</td>
                  <td className="py-3 pr-4 font-mono text-white">{formatCurrency(inv.amount)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        inv.daysOverdue > 30
                          ? 'bg-red-500/15 text-red-400 ring-red-500/30'
                          : inv.daysOverdue > 14
                          ? 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30'
                          : 'bg-gray-500/15 text-gray-400 ring-gray-500/30'
                      }`}
                    >
                      {inv.daysOverdue}d
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{inv.email}</td>
                  <td className="py-3">
                    <a
                      href={`https://dashboard.stripe.com/invoices/${inv.stripeInvoiceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
                    >
                      {inv.stripeInvoiceId}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Organization</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((txn) => {
                const typeBadge = TYPE_BADGES[txn.type] ?? TYPE_BADGES.payment;
                const statusBadge = STATUS_BADGES[txn.status] ?? STATUS_BADGES.pending;
                return (
                  <tr key={txn.id} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{txn.date}</td>
                    <td className="py-3 pr-4 text-gray-300">{txn.orgName}</td>
                    <td className={`py-3 pr-4 font-mono ${txn.amount < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${typeBadge.bg} ${typeBadge.text}`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadge.bg} ${statusBadge.text}`}
                      >
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ops KPI Card (dark theme with optional accent)                             */
/* -------------------------------------------------------------------------- */
function OpsKpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}
