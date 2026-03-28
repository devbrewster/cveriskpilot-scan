'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ---------- Types ----------

type Tier = 'FREE' | 'PRO' | 'ENTERPRISE' | 'MSSP';
type OrgStatus = 'active' | 'churned' | 'trial';

interface CustomerOrg {
  id: string;
  name: string;
  tier: Tier;
  status: OrgStatus;
  signupDate: string;
  mrr: number;
  userCount: number;
  scanCount: number;
  lastActiveAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

type SortField = 'name' | 'tier' | 'status' | 'signupDate' | 'mrr' | 'userCount' | 'scanCount' | 'lastActiveAt';

// ---------- Constants ----------

const TIER_BADGE_STYLES: Record<Tier, string> = {
  FREE: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  PRO: 'bg-blue-100 text-blue-700 ring-blue-500/20',
  ENTERPRISE: 'bg-purple-100 text-purple-700 ring-purple-500/20',
  MSSP: 'bg-indigo-100 text-indigo-700 ring-indigo-500/20',
};

const STATUS_DOT_STYLES: Record<OrgStatus, string> = {
  active: 'bg-green-500',
  trial: 'bg-yellow-500',
  churned: 'bg-red-500',
};

const STATUS_LABELS: Record<OrgStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  churned: 'Churned',
};

const COLUMNS: { key: SortField; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Org Name' },
  { key: 'tier', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'mrr', label: 'MRR', align: 'right' },
  { key: 'userCount', label: 'Users', align: 'right' },
  { key: 'scanCount', label: 'Scans', align: 'right' },
  { key: 'signupDate', label: 'Signup Date' },
  { key: 'lastActiveAt', label: 'Last Active' },
];

// ---------- Helpers ----------

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function exportCsv(customers: CustomerOrg[]) {
  const header = 'ID,Name,Tier,Status,MRR,Users,Scans,Signup Date,Last Active';
  const rows = customers.map(
    (c) =>
      `${c.id},"${c.name}",${c.tier},${c.status},${(c.mrr / 100).toFixed(2)},${c.userCount},${c.scanCount},${c.signupDate},${c.lastActiveAt}`,
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Component ----------

export default function OpsCustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOrg[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerOrg[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sort
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Page
  const [page, setPage] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tierFilter) params.set('tier', tierFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '25');

      const res = await fetch(`/api/ops/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, sortBy, sortOrder, page]);

  // Fetch all (unfiltered) for CSV export
  const fetchAllForExport = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/customers?limit=100');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAllCustomers(data.customers);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchAllForExport();
  }, [fetchAllForExport]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, tierFilter, statusFilter]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) {
      return (
        <svg className="ml-1 inline h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="ml-1 inline h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 inline h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pagination.totalCount} organization{pagination.totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => exportCsv(allCustomers.length > 0 ? allCustomers : customers)}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Tier dropdown */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All Tiers</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="MSSP">MSSP</option>
        </select>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-violet-700 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-gray-400">
                    <svg className="mx-auto mb-2 h-6 w-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-gray-400">
                    No customers found matching your filters.
                  </td>
                </tr>
              ) : (
                customers.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => router.push(`/ops/customers/${org.id}`)}
                    className="cursor-pointer transition-colors hover:bg-violet-50/50"
                  >
                    {/* Name */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-400">{org.id}</div>
                    </td>

                    {/* Tier badge */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_BADGE_STYLES[org.tier]}`}
                      >
                        {org.tier}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_STYLES[org.status]}`} />
                        {STATUS_LABELS[org.status]}
                      </span>
                    </td>

                    {/* MRR */}
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {org.mrr > 0 ? formatCents(org.mrr) : <span className="text-gray-400">--</span>}
                    </td>

                    {/* Users */}
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {org.userCount.toLocaleString()}
                    </td>

                    {/* Scans */}
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {org.scanCount.toLocaleString()}
                    </td>

                    {/* Signup Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(org.signupDate)}
                    </td>

                    {/* Last Active */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatRelative(org.lastActiveAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
              </span>{' '}
              of <span className="font-medium">{pagination.totalCount}</span> results
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                    p === page
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
