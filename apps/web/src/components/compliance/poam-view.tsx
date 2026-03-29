'use client';

import { useState, useEffect, useCallback } from 'react';

interface POAMItem {
  id: string;
  weaknessId: string;
  controlFamily: string;
  securityControl: string;
  weaknessDescription: string;
  severity: string;
  responsibleEntity: string;
  scheduledCompletionDate: string;
  status: string;
  cveIds: string[];
  cweIds: string[];
  resources: string;
  comments: string;
  milestones: { id: string; description: string; scheduledDate: string; status: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  ONGOING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DELAYED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-800',
};

export function POAMView({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId?: string;
}) {
  const [items, setItems] = useState<POAMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterControlFamily, setFilterControlFamily] = useState<string>('ALL');

  const orgId = organizationId ?? '';

  const fetchPOAM = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/compliance/poam?clientId=${clientId}&organizationId=${orgId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch POAM data');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [clientId, orgId]);

  useEffect(() => {
    fetchPOAM();
  }, [fetchPOAM]);

  const handleExport = async (format: 'csv' | 'json-download') => {
    try {
      const url = `/api/compliance/poam?clientId=${clientId}&organizationId=${orgId}&format=${format}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError(`Failed to export POAM as ${format === 'csv' ? 'CSV' : 'JSON'}`);
        return;
      }
      const blob = await res.blob();
      const ext = format === 'csv' ? 'csv' : 'json';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `poam-${clientId}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError(`Failed to export POAM as ${format === 'csv' ? 'CSV' : 'JSON'}`);
    }
  };

  const [xlsxExporting, setXlsxExporting] = useState(false);

  const handleExportXlsx = async () => {
    setXlsxExporting(true);
    try {
      const params = new URLSearchParams({ clientId });
      if (filterSeverity !== 'ALL') params.set('severity', filterSeverity);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const url = `/api/export/poam?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError('Failed to export POAM as XLSX');
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `FedRAMP-POAM-${clientId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('Failed to export POAM as XLSX');
    } finally {
      setXlsxExporting(false);
    }
  };

  // Derive filter options
  const controlFamilies = [...new Set(items.map((i) => i.controlFamily))].sort();
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const statuses = ['ALL', 'PENDING', 'ONGOING', 'COMPLETED', 'DELAYED', 'CANCELLED'];

  const filtered = items.filter((item) => {
    if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (filterControlFamily !== 'ALL' && item.controlFamily !== filterControlFamily)
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            POAM — Plan of Action and Milestones
          </h2>
          <p className="text-sm text-gray-500">
            NIST 800-171 compliant POAM generated from open vulnerability cases.{' '}
            {items.length} item{items.length !== 1 ? 's' : ''} total.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json-download')}
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportXlsx}
            disabled={xlsxExporting}
            className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {xlsxExporting ? 'Exporting...' : 'Export XLSX (FedRAMP)'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterControlFamily}
          onChange={(e) => setFilterControlFamily(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="ALL">All Control Families</option>
          {controlFamilies.map((cf) => (
            <option key={cf} value={cf}>
              {cf}
            </option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {severities.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All Severities' : s}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All Statuses' : s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500">
          {items.length === 0
            ? 'No open vulnerability cases found for POAM generation.'
            : 'No items match the current filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Weakness
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Control
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Severity
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Responsible
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Scheduled Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {item.weaknessId}
                    </div>
                    <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                      {item.weaknessDescription}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{item.securityControl}</div>
                    <div className="text-xs text-gray-500">
                      {item.controlFamily}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[item.severity] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.responsibleEntity}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.scheduledCompletionDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
