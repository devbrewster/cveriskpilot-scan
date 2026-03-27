'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SeverityBadge, StatusBadge, ScannerBadge } from '@/components/ui/badges';
import {
  type Finding,
  type Asset,
  getCaseForFinding,
  getAssetById,
} from '@/lib/mock-findings';

interface FindingDetailProps {
  finding: Finding;
}

function CvssBar({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 9
      ? 'bg-red-500'
      : score >= 7
        ? 'bg-orange-500'
        : score >= 4
          ? 'bg-yellow-500'
          : score >= 0.1
            ? 'bg-blue-500'
            : 'bg-gray-300';

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-48 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-lg font-bold text-gray-900">{score.toFixed(1)}</span>
      <span className="text-sm text-gray-500">/ 10.0</span>
    </div>
  );
}

function EpssDisplay({ score, percentile }: { score: number; percentile: number }) {
  const pctStr = (score * 100).toFixed(2);
  const topPct = ((1 - percentile) * 100).toFixed(0);
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900">{pctStr}%</p>
      <p className="text-sm text-gray-500">
        Top {topPct}% of vulnerabilities (percentile: {(percentile * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

function AssetSection({ asset }: { asset: Asset }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <dt className="text-xs font-medium uppercase text-gray-500">Name</dt>
        <dd className="mt-1 text-sm font-medium text-gray-900">{asset.name}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-gray-500">Type</dt>
        <dd className="mt-1 text-sm text-gray-700">{asset.type.replace('_', ' ')}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-gray-500">Environment</dt>
        <dd className="mt-1 text-sm text-gray-700">{asset.environment}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-gray-500">Criticality</dt>
        <dd className="mt-1">
          <SeverityBadge severity={asset.criticality} />
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-gray-500">Internet Exposed</dt>
        <dd className="mt-1">
          {asset.internetExposed ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" />
              </svg>
              Exposed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              Internal
            </span>
          )}
        </dd>
      </div>
      {asset.tags.length > 0 && (
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </dd>
        </div>
      )}
    </div>
  );
}

export function FindingDetail({ finding }: FindingDetailProps) {
  const router = useRouter();
  const vulnCase = getCaseForFinding(finding);
  const asset = getAssetById(finding.assetId);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => router.push('/findings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Findings
      </button>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {vulnCase && <SeverityBadge severity={vulnCase.severity} size="lg" />}
              {vulnCase && <StatusBadge status={vulnCase.status} />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {vulnCase?.title ?? 'Uncategorized Finding'}
            </h1>
            {vulnCase && vulnCase.cveIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {vulnCase.cveIds.map((cve) => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-mono font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100"
                  >
                    {cve}
                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
          <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">
            {finding.id}
          </span>
        </div>
      </div>

      {/* Scoring Section */}
      {vulnCase && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Vulnerability Scoring</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* CVSS */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">CVSS Score</h3>
              {vulnCase.cvssScore !== null ? (
                <>
                  <CvssBar score={vulnCase.cvssScore} />
                  {vulnCase.cvssVector && (
                    <p className="break-all font-mono text-xs text-gray-500">{vulnCase.cvssVector}</p>
                  )}
                  {vulnCase.cvssVersion && (
                    <p className="text-xs text-gray-400">Version: {vulnCase.cvssVersion}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">No CVSS score available</p>
              )}
            </div>

            {/* EPSS */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">EPSS Score</h3>
              {vulnCase.epssScore !== null && vulnCase.epssPercentile !== null ? (
                <EpssDisplay score={vulnCase.epssScore} percentile={vulnCase.epssPercentile} />
              ) : (
                <p className="text-sm text-gray-400">No EPSS data available</p>
              )}
            </div>

            {/* KEV */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">KEV Status</h3>
              {vulnCase.kevListed ? (
                <div className="rounded-md bg-red-50 p-3 ring-1 ring-inset ring-red-200">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="font-semibold text-red-800">CISA KEV Listed</span>
                  </div>
                  {vulnCase.kevDueDate && (
                    <p className="mt-1 text-sm text-red-700">
                      Remediation due: {new Date(vulnCase.kevDueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md bg-green-50 p-3 ring-1 ring-inset ring-green-200">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-green-800">Not KEV-listed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Section */}
      {asset && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Asset Information</h2>
          <AssetSection asset={asset} />
        </div>
      )}

      {/* Evidence Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Evidence</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ScannerBadge scannerType={finding.scannerType} />
            <span className="text-sm text-gray-700">{finding.scannerName}</span>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-500">Raw Observations</h3>
            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
              {JSON.stringify(finding.observations, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Related Case */}
      {vulnCase && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Related Vulnerability Case</h2>
          <Link
            href={`/cases/${vulnCase.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 ring-1 ring-inset ring-primary-200 hover:bg-primary-100"
          >
            <SeverityBadge severity={vulnCase.severity} />
            <span>{vulnCase.title}</span>
            <StatusBadge status={vulnCase.status} />
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Timeline</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Discovered</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(finding.discoveredAt).toLocaleString()}
            </dd>
          </div>
          {vulnCase && (
            <>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">First Seen</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(vulnCase.firstSeenAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">Last Seen</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(vulnCase.lastSeenAt).toLocaleString()}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
