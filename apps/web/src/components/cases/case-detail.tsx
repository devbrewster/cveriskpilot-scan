'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SeverityBadge, StatusBadge, ScannerBadge, KevBadge } from '@/components/ui/badges';
import { StatusWorkflow } from '@/components/cases/status-workflow';
import { useToast } from '@/components/ui/toast';
import {
  type VulnerabilityCase,
  type CaseStatus,
  type Finding,
  getFindingsForCase,
  getAssetById,
  getStatusChangesForCase,
  mockUsers,
} from '@/lib/mock-findings';

interface CaseDetailProps {
  vulnCase: VulnerabilityCase;
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

function SlaSection({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) {
    return (
      <div className="rounded-md bg-gray-50 p-4">
        <p className="text-sm text-gray-500">No SLA due date set</p>
      </div>
    );
  }

  const dueDate = new Date(dueAt);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let colorClass: string;
  let label: string;
  if (diffDays < 0) {
    colorClass = 'bg-red-50 border-red-200 text-red-800';
    label = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  } else if (diffDays <= 7) {
    colorClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
    label = `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
  } else {
    colorClass = 'bg-green-50 border-green-200 text-green-800';
    label = `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
  }

  return (
    <div className={`rounded-md border p-4 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">SLA Due Date</p>
          <p className="text-lg font-bold">{dueDate.toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FindingsTab({ findings }: { findings: Finding[] }) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {findings.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">No findings linked to this case.</p>
      ) : (
        findings.map((f) => {
          const asset = getAssetById(f.assetId);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => router.push(`/findings/${f.id}`)}
              className="flex w-full items-center justify-between rounded-md border border-gray-200 p-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <ScannerBadge scannerType={f.scannerType} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.scannerName}</p>
                  <p className="text-xs text-gray-500">{asset?.name ?? 'Unknown Asset'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(f.discoveredAt).toLocaleDateString()}
                </p>
                <p className="font-mono text-xs text-gray-400">{f.id}</p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

export function CaseDetail({ vulnCase: initialCase }: CaseDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [caseData, setCaseData] = useState(initialCase);
  const [remediationNotes, setRemediationNotes] = useState(initialCase.remediationNotes);
  const [activeTab, setActiveTab] = useState<'findings' | 'remediation' | 'activity'>('findings');

  const findings = useMemo(() => getFindingsForCase(caseData.id), [caseData.id]);
  const statusChanges = useMemo(() => getStatusChangesForCase(caseData.id), [caseData.id]);
  const assignedUser = caseData.assignedToId ? mockUsers[caseData.assignedToId] : null;

  const handleStatusChange = useCallback(
    (newStatus: CaseStatus, _reason: string) => {
      setCaseData((prev) => ({ ...prev, status: newStatus }));
    },
    [],
  );

  const handleSaveNotes = useCallback(() => {
    setCaseData((prev) => ({ ...prev, remediationNotes }));
    addToast('success', 'Remediation notes saved.');
  }, [remediationNotes, addToast]);

  const handleGetAiRemediation = useCallback(() => {
    addToast('info', 'AI-powered remediation guidance coming soon.');
  }, [addToast]);

  const advisory = caseData.aiAdvisory as { summary?: string; recommendation?: string; references?: string[]; generatedAt?: string } | null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push('/cases')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Cases
      </button>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SeverityBadge severity={caseData.severity} size="lg" />
              <StatusBadge status={caseData.status} size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            {caseData.cveIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {caseData.cveIds.map((cve) => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-mono font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100"
                  >
                    {cve}
                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
            {assignedUser && (
              <p className="text-sm text-gray-500">
                Assigned to: <span className="font-medium text-gray-700">{assignedUser}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">{caseData.id}</span>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
              {caseData.findingCount} finding{caseData.findingCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {caseData.description && (
          <p className="mt-4 text-sm text-gray-600">{caseData.description}</p>
        )}
      </div>

      {/* Scoring Panel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Vulnerability Scoring</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* CVSS */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">CVSS Score</h3>
            {caseData.cvssScore !== null ? (
              <>
                <CvssBar score={caseData.cvssScore} />
                {caseData.cvssVector && (
                  <p className="break-all font-mono text-xs text-gray-500">{caseData.cvssVector}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No CVSS score</p>
            )}
          </div>

          {/* EPSS */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">EPSS Score</h3>
            {caseData.epssScore !== null && caseData.epssPercentile !== null ? (
              <div>
                <p className="text-2xl font-bold text-gray-900">{(caseData.epssScore * 100).toFixed(2)}%</p>
                <p className="text-sm text-gray-500">
                  Top {((1 - caseData.epssPercentile) * 100).toFixed(0)}% of vulnerabilities
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No EPSS data</p>
            )}
          </div>

          {/* KEV */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">KEV Status</h3>
            <KevBadge listed={caseData.kevListed} dueDate={caseData.kevDueDate} />
          </div>
        </div>
      </div>

      {/* SLA */}
      <SlaSection dueAt={caseData.dueAt} />

      {/* Status Workflow */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Status Workflow</h2>
        <StatusWorkflow currentStatus={caseData.status} onStatusChange={handleStatusChange} />
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['findings', 'remediation', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab === 'findings'
                  ? `Findings (${findings.length})`
                  : tab === 'remediation'
                    ? 'Remediation'
                    : 'Activity'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Findings Tab */}
          {activeTab === 'findings' && <FindingsTab findings={findings} />}

          {/* Remediation Tab */}
          {activeTab === 'remediation' && (
            <div className="space-y-6">
              {/* AI Advisory */}
              {advisory ? (
                <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-3a1 1 0 01-1-1V6a1 1 0 112 0v3a1 1 0 01-1 1z" />
                      </svg>
                      Generated by Claude
                    </span>
                    {advisory.generatedAt && (
                      <span className="text-xs text-purple-600">
                        {new Date(advisory.generatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {advisory.summary && (
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-purple-900">Summary</h4>
                      <p className="mt-1 text-sm text-purple-800">{advisory.summary}</p>
                    </div>
                  )}
                  {advisory.recommendation && (
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-purple-900">Recommendation</h4>
                      <p className="mt-1 text-sm text-purple-800">{advisory.recommendation}</p>
                    </div>
                  )}
                  {advisory.references && advisory.references.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-purple-900">References</h4>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {advisory.references.map((ref: string) => (
                          <li key={ref}>
                            <a
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-purple-700 underline hover:text-purple-900"
                            >
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No AI advisory available yet.</p>
                  <button
                    type="button"
                    onClick={handleGetAiRemediation}
                    className="mt-3 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    Get AI Remediation
                  </button>
                </div>
              )}

              {/* Manual notes */}
              <div>
                <label htmlFor="remediation-notes" className="block text-sm font-medium text-gray-700">
                  Remediation Notes
                </label>
                <textarea
                  id="remediation-notes"
                  value={remediationNotes}
                  onChange={(e) => setRemediationNotes(e.target.value)}
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Add remediation notes..."
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-0">
              {statusChanges.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">No activity recorded.</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {statusChanges.map((sc, idx) => (
                      <div key={sc.id} className="relative flex gap-4 pl-10">
                        {/* Dot */}
                        <div
                          className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                            idx === statusChanges.length - 1 ? 'bg-primary-500' : 'bg-gray-400'
                          }`}
                        />
                        <div className="flex-1 rounded-md border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {sc.fromStatus && (
                                <>
                                  <StatusBadge status={sc.fromStatus} />
                                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </>
                              )}
                              <StatusBadge status={sc.toStatus} />
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(sc.changedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{sc.reason}</p>
                          <p className="mt-1 text-xs text-gray-400">by {sc.changedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
