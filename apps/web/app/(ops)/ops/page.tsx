'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OpsOverviewData {
  totalOrgs: number;
  activeUsers30d: number;
  mrr: number;
  totalScans: number;
  openCases: number;
  avgMttrDays: number;
}

const quickLinks = [
  { label: 'Customers', href: '/ops/customers', description: 'Manage orgs and subscriptions' },
  { label: 'Analytics', href: '/ops/analytics', description: 'Platform usage and trends' },
  { label: 'Billing Ops', href: '/ops/billing', description: 'Revenue, invoices, refunds' },
  { label: 'Platform Health', href: '/ops/health', description: 'Services, queues, errors' },
  { label: 'Feature Flags', href: '/ops/flags', description: 'Ring rollout management' },
  { label: 'Announcements', href: '/ops/announcements', description: 'In-app banners and notices' },
  { label: 'Staff Audit Log', href: '/ops/audit', description: 'Internal action history' },
];

export default function OpsOverviewPage() {
  const [data, setData] = useState<OpsOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ops/overview')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        Failed to load ops overview: {error}
      </div>
    );
  }

  const stats = data
    ? [
        { label: 'Total Orgs', value: data.totalOrgs.toLocaleString() },
        { label: 'Active Users (30d)', value: data.activeUsers30d.toLocaleString() },
        { label: 'MRR', value: `$${data.mrr.toLocaleString()}` },
        { label: 'Total Scans', value: data.totalScans.toLocaleString() },
        { label: 'Open Cases', value: data.openCases.toLocaleString() },
        { label: 'Avg MTTR', value: `${data.avgMttrDays}d` },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-white">Ops Overview</h2>
        <p className="mt-1 text-sm text-gray-400">Platform-wide statistics and quick navigation for internal staff.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {!data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-700" />
                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-gray-700" />
              </div>
            ))
          : stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
      </div>

      {/* Quick links */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Quick Links
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-violet-500/40 hover:bg-gray-800"
            >
              <p className="font-medium text-white group-hover:text-violet-300 transition-colors">
                {link.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
