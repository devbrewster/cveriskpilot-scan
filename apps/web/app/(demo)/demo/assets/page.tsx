'use client';

import { useState, useMemo } from 'react';
import { demoDetailAssets } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

const TYPE_OPTIONS = ['All', 'HOST', 'REPOSITORY', 'CONTAINER_IMAGE', 'CLOUD_ACCOUNT', 'APPLICATION'] as const;
const ENV_OPTIONS = ['All', 'Production', 'Staging', 'Development'] as const;

type AssetType = 'HOST' | 'REPOSITORY' | 'CONTAINER_IMAGE' | 'CLOUD_ACCOUNT' | 'APPLICATION';

const typeConfig: Record<AssetType, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  HOST: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Host',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  REPOSITORY: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    label: 'Repository',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  CONTAINER_IMAGE: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    label: 'Container',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  CLOUD_ACCOUNT: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    label: 'Cloud Account',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  APPLICATION: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Application',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
};

const envColors: Record<string, string> = {
  Production: 'bg-red-100 text-red-700',
  Staging: 'bg-yellow-100 text-yellow-700',
  Development: 'bg-green-100 text-green-700',
};

const critBarColors: Record<number, string> = {
  1: 'bg-green-400',
  2: 'bg-blue-400',
  3: 'bg-yellow-400',
  4: 'bg-orange-400',
  5: 'bg-red-500',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemoAssetsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [envFilter, setEnvFilter] = useState<string>('All');
  const [exposedOnly, setExposedOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Filtered results
  const filtered = useMemo(() => {
    let items = demoDetailAssets;

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (typeFilter !== 'All') {
      items = items.filter((a) => a.type === typeFilter);
    }
    if (envFilter !== 'All') {
      items = items.filter((a) => a.environment === envFilter);
    }
    if (exposedOnly) {
      items = items.filter((a) => a.internetExposed);
    }

    return items;
  }, [search, typeFilter, envFilter, exposedOnly]);

  // Stats (computed from full dataset, not filtered)
  const stats = useMemo(() => ({
    total: demoDetailAssets.length,
    internetExposed: demoDetailAssets.filter((a) => a.internetExposed).length,
    critical: demoDetailAssets.filter((a) => a.criticality === '5').length,
  }), []);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  // Reset page when filters change
  const updateFilter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span className="text-sm font-medium text-blue-800">
          Viewing demo asset inventory. Data shown is simulated.
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} asset{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Assets</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Internet-Exposed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.internetExposed}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Critical Assets</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{stats.critical}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => updateFilter(setTypeFilter, e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Types' : opt.replace('_', ' ')}</option>
            ))}
          </select>

          {/* Environment dropdown */}
          <select
            value={envFilter}
            onChange={(e) => updateFilter(setEnvFilter, e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ENV_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Environments' : opt}</option>
            ))}
          </select>

          {/* Internet-exposed toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={exposedOnly}
              onChange={(e) => updateFilter(setExposedOnly, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Internet-exposed only
          </label>
        </div>
      </div>

      {/* Asset grid */}
      {paginatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
          <svg className="h-8 w-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">No matching assets</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to find what you are looking for.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedItems.map((asset) => {
            const cfg = typeConfig[asset.type as AssetType] ?? typeConfig.HOST;
            const critLevel = parseInt(asset.criticality, 10) || 1;

            return (
              <div
                key={asset.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Name + type badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-gray-900">{asset.name}</h3>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>

                {/* Environment + Internet-exposed */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${envColors[asset.environment] ?? 'bg-gray-100 text-gray-600'}`}>
                    {asset.environment}
                  </span>
                  {asset.internetExposed ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                      Exposed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Internal
                    </span>
                  )}
                </div>

                {/* Criticality bar */}
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-2 w-4 rounded-sm ${n <= critLevel ? (critBarColors[critLevel] ?? 'bg-gray-300') : 'bg-gray-200'}`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-medium text-gray-600">{critLevel}/5</span>
                </div>

                {/* Tags */}
                {asset.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Finding count */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{asset.findingCount ?? 0}</span>{' '}
                    findings
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filtered.length)} of {filtered.length} assets
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
