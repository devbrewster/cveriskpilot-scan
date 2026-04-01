'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceStatus = 'CURRENT' | 'STALE' | 'MISSING' | 'EXPIRED';
type EvidenceSource =
  | 'AUTO_SCAN'
  | 'AUTO_ASSESSMENT'
  | 'MANUAL_UPLOAD'
  | 'MANUAL_ENTRY'
  | 'API_CONNECTOR'
  | 'CLI_SCAN';

interface EvidenceRecord {
  id: string;
  organizationId: string;
  clientId: string | null;
  frameworkId: string;
  controlId: string;
  controlTitle: string;
  title: string;
  description: string | null;
  body: string | null;
  status: EvidenceStatus;
  freshnessDays: number;
  expiresAt: string | null;
  verifiedAt: string | null;
  source: EvidenceSource;
  collectorId: string | null;
  collectorName: string | null;
  sourceSystem: string | null;
  sourceRef: string | null;
  sourceQuery: string | null;
  contentHash: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  caseId: string | null;
  findingId: string | null;
  exceptionId: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  CURRENT: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  STALE: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  MISSING: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  AUTO_SCAN: 'Automated Scan',
  AUTO_ASSESSMENT: 'Auto Assessment',
  MANUAL_UPLOAD: 'Manual Upload',
  MANUAL_ENTRY: 'Manual Entry',
  API_CONNECTOR: 'API Connector',
  CLI_SCAN: 'CLI Scan',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  'nist-800-53': 'NIST SP 800-53 Rev 5',
  'cmmc-level2': 'CMMC Level 2',
  'soc2-type2': 'SOC 2 Type II',
  'fedramp-moderate': 'FedRAMP Moderate',
  'owasp-asvs': 'OWASP ASVS 4.0',
  'nist-ssdf': 'NIST SSDF 1.1',
  gdpr: 'EU GDPR',
  hipaa: 'HIPAA Security Rule',
  'pci-dss': 'PCI-DSS 4.0',
  'iso-27001': 'ISO/IEC 27001:2022',
  'nist-csf': 'NIST CSF 2.0',
  'eu-cra': 'EU Cyber Resilience Act',
  nis2: 'NIS2 Directive',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Detail Row Component
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <dt className="w-40 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd
        className={`text-sm text-gray-900 dark:text-gray-100 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/evidence/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Evidence record not found');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      setRecord(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  async function handleDelete() {
    if (!confirm('Delete this evidence record? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/compliance/evidence/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/evidence');
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleVerify() {
    try {
      const res = await fetch(`/api/compliance/evidence/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedAt: new Date().toISOString(), status: 'CURRENT' }),
      });
      if (res.ok) {
        setRecord(await res.json());
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-24">
          <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            {error ?? 'Evidence not found'}
          </p>
          <Link
            href="/evidence"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Back to Evidence
          </Link>
        </div>
      </div>
    );
  }

  const age = daysSince(record.verifiedAt);
  const freshnessPercent =
    age !== null
      ? Math.max(0, Math.min(100, 100 - (age / record.freshnessDays) * 100))
      : 0;
  const freshnessColor =
    freshnessPercent > 60 ? 'bg-green-500' : freshnessPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/evidence" className="hover:text-blue-600 dark:hover:text-blue-400">
          Evidence
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">{record.controlId}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {record.controlId}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[record.status]}`}
            >
              {record.status}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {record.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {FRAMEWORK_LABELS[record.frameworkId] ?? record.frameworkId} — {record.controlTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
          >
            Mark Verified
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {record.description && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Description
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {record.description}
              </p>
            </div>
          )}

          {/* Evidence Body */}
          {record.body && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Evidence Content
              </h2>
              <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {record.body}
                </pre>
              </div>
            </div>
          )}

          {/* Provenance Chain */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Provenance Chain
            </h2>
            <dl>
              <DetailRow label="Source" value={SOURCE_LABELS[record.source]} />
              <DetailRow label="Collected By" value={record.collectorName} />
              <DetailRow label="Source System" value={record.sourceSystem} />
              <DetailRow label="Source Reference" value={record.sourceRef} mono />
              <DetailRow label="Source Query" value={record.sourceQuery} mono />
              <DetailRow label="Content Hash" value={record.contentHash} mono />
              <DetailRow label="Created" value={formatDate(record.createdAt)} />
              <DetailRow label="Last Updated" value={formatDate(record.updatedAt)} />
            </dl>
          </div>

          {/* Linked Entities */}
          {(record.caseId || record.findingId || record.exceptionId) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Linked Records
              </h2>
              <div className="space-y-2">
                {record.caseId && (
                  <Link
                    href={`/cases/${record.caseId}`}
                    className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <span className="text-gray-500">Case:</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {record.caseId}
                    </span>
                  </Link>
                )}
                {record.findingId && (
                  <Link
                    href={`/findings/${record.findingId}`}
                    className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <span className="text-gray-500">Finding:</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {record.findingId}
                    </span>
                  </Link>
                )}
                {record.exceptionId && (
                  <Link
                    href={`/risk-exceptions`}
                    className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <span className="text-gray-500">Exception:</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {record.exceptionId}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-6">
          {/* Freshness Gauge */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Freshness
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={freshnessPercent > 60 ? 'text-green-500' : freshnessPercent > 30 ? 'text-yellow-500' : 'text-red-500'}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${freshnessPercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
                  {Math.round(freshnessPercent)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {age !== null ? `${age} days old` : 'Not verified'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Threshold: {record.freshnessDays} days
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${freshnessColor} transition-all`}
                style={{ width: `${freshnessPercent}%` }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Details
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Framework</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {FRAMEWORK_LABELS[record.frameworkId] ?? record.frameworkId}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Control</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {record.controlId} — {record.controlTitle}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Last Verified</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDate(record.verifiedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Expires</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDate(record.expiresAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Attachment */}
          {record.attachmentName && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Attachment
              </h2>
              <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {record.attachmentName}
                  </p>
                  <p className="text-xs text-gray-500">{formatBytes(record.attachmentSize)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {record.tags.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {record.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
