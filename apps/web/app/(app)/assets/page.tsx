'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterSearch, FilterToggle } from '@/components/ui/filters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetType = 'HOST' | 'REPOSITORY' | 'CONTAINER_IMAGE' | 'CLOUD_ACCOUNT' | 'APPLICATION';

interface Asset {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  type: AssetType;
  environment: string;
  criticality: number;
  internetExposed: boolean;
  tags: string[];
  deploymentRefs: Record<string, unknown>;
  findingCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AssetsApiResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'HOST', label: 'Host' },
  { value: 'REPOSITORY', label: 'Repository' },
  { value: 'CONTAINER_IMAGE', label: 'Container Image' },
  { value: 'CLOUD_ACCOUNT', label: 'Cloud Account' },
  { value: 'APPLICATION', label: 'Application' },
];

const CRITICALITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Criticality' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5 only' },
];

const typeStyles: Record<AssetType, { bg: string; text: string; label: string }> = {
  HOST: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Host' },
  REPOSITORY: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Repository' },
  CONTAINER_IMAGE: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Container' },
  CLOUD_ACCOUNT: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Cloud' },
  APPLICATION: { bg: 'bg-green-100', text: 'text-green-800', label: 'Application' },
};

const typeIcons: Record<AssetType, React.ReactNode> = {
  HOST: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  REPOSITORY: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  CONTAINER_IMAGE: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  CLOUD_ACCOUNT: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  APPLICATION: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: AssetType }) {
  const style = typeStyles[type];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      {typeIcons[type]}
      {style.label}
    </span>
  );
}

function CriticalityIndicator({ level }: { level: number }) {
  const colors = ['bg-green-400', 'bg-lime-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500'];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-4 rounded-sm ${n <= level ? colors[level - 1] : 'bg-gray-200'}`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-600">{level}/5</span>
    </div>
  );
}

function InternetExposedBadge({ exposed }: { exposed: boolean }) {
  if (!exposed) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Internet-exposed
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add Asset Modal
// ---------------------------------------------------------------------------

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function AddAssetModal({ open, onClose, onCreated }: AddAssetModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('HOST');
  const [environment, setEnvironment] = useState('production');
  const [criticality, setCriticality] = useState(3);
  const [internetExposed, setInternetExposed] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setType('HOST');
    setEnvironment('production');
    setCriticality(3);
    setInternetExposed(false);
    setTagsInput('');
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, environment, criticality, internetExposed, tags }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create asset');
      }

      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Asset</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. prod-web-server-01"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="HOST">Host</option>
              <option value="REPOSITORY">Repository</option>
              <option value="CONTAINER_IMAGE">Container Image</option>
              <option value="CLOUD_ACCOUNT">Cloud Account</option>
              <option value="APPLICATION">Application</option>
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Environment</label>
            <input
              type="text"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="e.g. production, staging, development"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Criticality */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Criticality: {criticality}/5
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={criticality}
              onChange={(e) => setCriticality(Number(e.target.value))}
              className="mt-1 w-full cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Low</span>
              <span>Critical</span>
            </div>
          </div>

          {/* Internet-Exposed */}
          <div className="flex items-center gap-3">
            <input
              id="internet-exposed"
              type="checkbox"
              checked={internetExposed}
              onChange={(e) => setInternetExposed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="internet-exposed" className="text-sm font-medium text-gray-700">
              Internet-exposed
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated, e.g. pci-scope, linux, dmz"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AssetInventoryPage() {
  const [data, setData] = useState<AssetsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [internetExposedFilter, setInternetExposedFilter] = useState(false);
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '12');
    if (typeFilter) params.set('type', typeFilter);
    if (envFilter) params.set('environment', envFilter);
    if (criticalityFilter) params.set('criticality', criticalityFilter);
    if (internetExposedFilter) params.set('internetExposed', 'true');

    fetch(`/api/assets?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load assets');
        return res.json();
      })
      .then((json: AssetsApiResponse) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, typeFilter, envFilter, criticalityFilter, internetExposedFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, envFilter, criticalityFilter, internetExposedFilter]);

  // Derived stats (computed from full dataset without pagination; for mock we use current page)
  const stats = useMemo(() => {
    if (!data) return { total: 0, internetExposed: 0, critical: 0 };
    return {
      total: data.total,
      internetExposed: data.items.filter((a) => a.internetExposed).length,
      critical: data.items.filter((a) => a.criticality >= 5).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage all assets across your organization.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Asset
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Assets" value={stats.total} />
        <StatCard
          label="Internet-Exposed"
          value={stats.internetExposed}
          accent="text-red-600"
        />
        <StatCard
          label="Critical (5/5)"
          value={stats.critical}
          accent="text-orange-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <FilterDropdown
            label="Type"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <FilterSearch
            value={envFilter}
            onChange={setEnvFilter}
            placeholder="Filter by environment..."
          />
          <FilterDropdown
            label="Criticality"
            options={CRITICALITY_OPTIONS}
            value={criticalityFilter}
            onChange={setCriticalityFilter}
          />
          <FilterToggle
            label="Internet-exposed only"
            checked={internetExposedFilter}
            onChange={setInternetExposedFilter}
          />
        </div>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Asset Grid */}
      {!loading && !error && data && (
        <>
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {typeFilter || envFilter || criticalityFilter || internetExposedFilter
                  ? 'No matching assets'
                  : 'No assets yet'}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                {typeFilter || envFilter || criticalityFilter || internetExposedFilter
                  ? 'Try adjusting your filters to find what you are looking for.'
                  : 'Assets will appear here once you upload a scan or add them manually.'}
              </p>
              {!(typeFilter || envFilter || criticalityFilter || internetExposedFilter) && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Asset
                  </button>
                  <a
                    href="/upload"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload a Scan
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((asset) => (
                <div
                  key={asset.id}
                  className="group rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Header: name + type badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{asset.name}</h3>
                    <TypeBadge type={asset.type} />
                  </div>

                  {/* Environment + Internet-exposed */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {asset.environment}
                    </span>
                    <InternetExposedBadge exposed={asset.internetExposed} />
                  </div>

                  {/* Criticality */}
                  <div className="mt-3">
                    <CriticalityIndicator level={asset.criticality} />
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

                  {/* Footer: finding count + updated date */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{asset.findingCount}</span>{' '}
                      findings
                    </span>
                    <span className="text-xs text-gray-400">
                      Updated {new Date(asset.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Add Asset Modal */}
      <AddAssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchAssets}
      />
    </div>
  );
}
