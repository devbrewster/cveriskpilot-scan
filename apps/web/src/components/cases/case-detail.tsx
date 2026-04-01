'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SeverityBadge, StatusBadge, ScannerBadge, KevBadge } from '@/components/ui/badges';
import { StatusWorkflow } from '@/components/cases/status-workflow';
import { AiRemediation } from '@/components/cases/ai-remediation';
import { CommentThread } from '@/components/cases/comment-thread';
import { AssignDropdown } from '@/components/cases/assign-dropdown';
import { RiskExceptionForm } from '@/components/cases/risk-exception-form';
import { useAuth } from '@/lib/auth-context';
import { AiTriagePanel } from '@/components/cases/ai-triage-panel';
import { useToast } from '@/components/ui/toast';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type CaseStatus =
  | 'NEW' | 'TRIAGE' | 'IN_REMEDIATION' | 'FIXED_PENDING_VERIFICATION'
  | 'VERIFIED_CLOSED' | 'REOPENED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE'
  | 'NOT_APPLICABLE' | 'DUPLICATE';
type ScannerType = 'SCA' | 'SAST' | 'DAST' | 'IAC' | 'CONTAINER' | 'VM' | 'BUG_BOUNTY';

interface VulnerabilityCase {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  description: string;
  cveIds: string[];
  cweIds: string[];
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  cvssVersion: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
  status: CaseStatus;
  assignedToId: string | null;
  dueAt: string | null;
  aiAdvisory: Record<string, unknown> | null;
  triageVerdict: string | null;
  triageConfidence: number | null;
  triageModel: string | null;
  triageAt: string | null;
  severityOverride: string | null;
  remediationNotes: string;
  findingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface Finding {
  id: string;
  organizationId: string;
  clientId: string;
  assetId: string;
  scannerType: ScannerType;
  scannerName: string;
  observations: Record<string, unknown>;
  dedupKey: string;
  vulnerabilityCaseId: string | null;
  discoveredAt: string;
}

interface StatusChange {
  id: string;
  caseId: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
}

interface ComplianceControl {
  framework: string;
  controlId: string;
  controlTitle: string;
  cweIds: string[];
}

interface ComplianceImpact {
  totalAffectedControls: number;
  frameworks: { name: string; count: number; controlIds: string[] }[];
  controls: ComplianceControl[];
}

interface CaseDetailProps {
  vulnCase: VulnerabilityCase;
  findings: Finding[];
  assignedUserName: string | null;
  basePath?: string;
  complianceImpact?: ComplianceImpact | null;
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

const FRAMEWORK_COLORS: Record<string, string> = {
  'NIST 800-53': 'bg-blue-50 text-blue-700 ring-blue-700/10',
  'SOC 2 Type II': 'bg-purple-50 text-purple-700 ring-purple-700/10',
  'CMMC Level 2': 'bg-green-50 text-green-700 ring-green-700/10',
  'FedRAMP Moderate': 'bg-red-50 text-red-700 ring-red-700/10',
  'OWASP ASVS': 'bg-orange-50 text-orange-700 ring-orange-700/10',
  'HIPAA Security Rule': 'bg-pink-50 text-pink-700 ring-pink-700/10',
  'PCI-DSS': 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
  'ISO 27001:2022': 'bg-teal-50 text-teal-700 ring-teal-700/10',
  'GDPR': 'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
};

function ComplianceImpactPanel({ impact }: { impact: ComplianceImpact }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Impact</h2>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {impact.totalAffectedControls} control{impact.totalAffectedControls !== 1 ? 's' : ''} affected
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          {expanded ? 'Collapse' : 'Show details'}
        </button>
      </div>

      {/* Framework summary badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        {impact.frameworks.map((fw) => {
          const colorClass = FRAMEWORK_COLORS[fw.name] ?? 'bg-gray-50 text-gray-700 ring-gray-700/10';
          return (
            <span
              key={fw.name}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset ${colorClass}`}
            >
              {fw.name}
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold">
                {fw.count}
              </span>
            </span>
          );
        })}
      </div>

      {/* Expanded control list */}
      {expanded && (
        <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Framework</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Control</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">CWEs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {impact.controls.map((ctrl) => {
                const colorClass = FRAMEWORK_COLORS[ctrl.framework] ?? 'bg-gray-50 text-gray-700 ring-gray-700/10';
                return (
                  <tr key={`${ctrl.framework}:${ctrl.controlId}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colorClass}`}>
                        {ctrl.framework}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-900">{ctrl.controlId}</td>
                    <td className="px-4 py-2 text-gray-600">{ctrl.controlTitle}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {ctrl.cweIds.map((cwe) => (
                          <span key={cwe} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                            CWE-{cwe}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FindingsTab({ findings, basePath = '' }: { findings: Finding[]; basePath?: string }) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {findings.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">No findings linked to this case.</p>
      ) : (
        findings.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => router.push(`${basePath}/findings/${f.id}`)}
              className="flex w-full items-center justify-between rounded-md border border-gray-200 p-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <ScannerBadge scannerType={f.scannerType} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.scannerName}</p>
                  <p className="text-xs text-gray-500">Asset: {f.assetId}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(f.discoveredAt).toLocaleDateString()}
                </p>
                <p className="font-mono text-xs text-gray-400">{f.id}</p>
              </div>
            </button>
          ))
      )}
    </div>
  );
}

export function CaseDetail({ vulnCase: initialCase, findings, assignedUserName, basePath = '', complianceImpact }: CaseDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { userId, organizationId, role } = useAuth();
  const [caseData, setCaseData] = useState(initialCase);
  const [remediationNotes, setRemediationNotes] = useState(initialCase.remediationNotes);
  const [activeTab, setActiveTab] = useState<'findings' | 'remediation' | 'activity'>('findings');
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(initialCase.assignedToId);

  // Status changes are not yet available from the API; show empty timeline
  const statusChanges: StatusChange[] = [];
  const assignedUser = assignedUserName;

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

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push(basePath + '/cases')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Cases
      </button>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
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
            <div className="flex items-center gap-3">
              {assignedUser && (
                <p className="text-sm text-gray-500">
                  Assigned to: <span className="font-medium text-gray-700">{assignedUser}</span>
                </p>
              )}
              {userId && (
                <AssignDropdown
                  caseId={caseData.id}
                  currentAssigneeId={currentAssigneeId}
                  currentUserId={userId}
                  onAssigned={(assignee) => setCurrentAssigneeId(assignee?.id ?? null)}
                />
              )}
            </div>
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
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
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

      {/* Compliance Impact */}
      {complianceImpact && complianceImpact.totalAffectedControls > 0 && (
        <ComplianceImpactPanel impact={complianceImpact} />
      )}

      {/* AI Triage */}
      <AiTriagePanel
        caseId={caseData.id}
        currentSeverity={caseData.severity}
        existingVerdict={caseData.triageVerdict}
        existingConfidence={caseData.triageConfidence}
        existingModel={caseData.triageModel}
        existingTriageAt={caseData.triageAt}
      />

      {/* SLA */}
      <SlaSection dueAt={caseData.dueAt} />

      {/* Status Workflow */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6">
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
          {activeTab === 'findings' && <FindingsTab findings={findings} basePath={basePath} />}

          {/* Remediation Tab */}
          {activeTab === 'remediation' && (
            <div className="space-y-6">
              {/* AI Advisory */}
              <AiRemediation
                caseId={caseData.id}
                caseData={{
                  title: caseData.title,
                  description: caseData.description || undefined,
                  cveIds: caseData.cveIds,
                  cweIds: caseData.cweIds,
                  severity: caseData.severity,
                  cvssScore: caseData.cvssScore,
                  cvssVector: caseData.cvssVector,
                  epssScore: caseData.epssScore,
                  epssPercentile: caseData.epssPercentile,
                  kevListed: caseData.kevListed,
                  kevDueDate: caseData.kevDueDate,
                }}
                existingAdvisory={null}
              />

              {/* Risk Exception */}
              {userId && organizationId && (
                <RiskExceptionForm
                  caseId={caseData.id}
                  caseSeverity={caseData.severity}
                  organizationId={organizationId}
                  currentUserId={userId}
                  currentUserRole={role ?? 'VIEWER'}
                />
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
            <div className="space-y-6">
              {/* Comment Thread */}
              {userId && (
                <CommentThread caseId={caseData.id} currentUserId={userId} />
              )}

              {/* Status Change Timeline */}
              {statusChanges.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">No status changes recorded.</p>
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
                        <div className="flex-1 rounded-md border border-gray-200 bg-white dark:bg-gray-900 p-3">
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
