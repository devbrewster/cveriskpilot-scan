'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface FrameworkSummary {
  id: string;
  name: string;
  version: string;
  description: string;
  controlCount: number;
}

interface ControlWithEvidence {
  id: string;
  title: string;
  description: string;
  category: string;
  evidenceRequirements: string[];
  status: 'met' | 'partial' | 'not_met' | 'na';
  evidence: string;
  lastVerified: string | null;
  autoAssessed: boolean;
}

interface FrameworkAssessment {
  frameworkId: string;
  frameworkName: string;
  version: string;
  description: string;
  assessedAt: string;
  totalControls: number;
  metCount: number;
  partialCount: number;
  notMetCount: number;
  naCount: number;
  overallScore: number;
  controls: ControlWithEvidence[];
}

interface NistFamilyCoverage {
  family: string;
  familyLabel: string;
  controls: {
    id: string;
    title: string;
    description: string;
    affected: boolean;
  }[];
  affectedCount: number;
  totalCount: number;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  met: { label: 'Met', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  not_met: { label: 'Not Met', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  na: { label: 'N/A', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold text-gray-900 dark:text-white">{score}%</span>
    </div>
  );
}

export function FrameworkDashboard({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<FrameworkAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [nistCoverage, setNistCoverage] = useState<NistFamilyCoverage[]>([]);
  const [nistLoading, setNistLoading] = useState(false);
  const [expandedNistFamily, setExpandedNistFamily] = useState<string | null>(null);
  const [frameworkError, setFrameworkError] = useState<string | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [nistError, setNistError] = useState<string | null>(null);

  const orgId = organizationId ?? '';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/compliance/frameworks');
        if (res.ok) {
          const data = await res.json();
          setFrameworks(data.frameworks ?? []);
          if (data.frameworks?.length > 0) {
            setSelectedId(data.frameworks[0].id);
          }
        } else {
          setFrameworkError('Failed to load compliance frameworks');
        }
      } catch {
        setFrameworkError('Failed to load compliance frameworks');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchAssessment = useCallback(async (fwId: string) => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    try {
      const res = await fetch(
        `/api/compliance/frameworks/${fwId}?organizationId=${orgId}`,
      );
      if (res.ok) {
        setAssessment(await res.json());
      } else {
        setAssessmentError('Failed to load framework assessment');
      }
    } catch {
      setAssessmentError('Failed to load framework assessment');
    } finally {
      setAssessmentLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (selectedId) fetchAssessment(selectedId);
  }, [selectedId, fetchAssessment]);

  // Fetch NIST 800-53 control coverage based on CWE data from findings
  useEffect(() => {
    (async () => {
      setNistLoading(true);
      setNistError(null);
      try {
        const res = await fetch(
          `/api/compliance/frameworks/nist-800-53-mapping?organizationId=${orgId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setNistCoverage(data.families ?? []);
        } else {
          setNistError('Failed to load NIST 800-53 control mapping');
        }
      } catch {
        setNistError('Failed to load NIST 800-53 control mapping');
      } finally {
        setNistLoading(false);
      }
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-96 rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Compliance Framework Dashboards
        </h2>
        <p className="text-sm text-gray-500">
          Auto-assessed compliance posture based on your vulnerability management data.
        </p>
      </div>

      {frameworkError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {frameworkError}
        </div>
      )}

      {/* Framework Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6">
          {frameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedId(fw.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                selectedId === fw.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {fw.name}
              <span className="ml-1.5 text-xs text-gray-400">v{fw.version}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Assessment Results */}
      {assessmentLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex gap-6">
            <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="h-64 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : assessmentError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {assessmentError}
        </div>
      ) : assessment ? (
        <div className="space-y-6">
          {/* Score Summary */}
          <div className="flex flex-wrap items-center gap-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <ScoreRing score={assessment.overallScore} />
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {assessment.frameworkName}
              </h3>
              <p className="mt-1 max-w-lg text-sm text-gray-500">
                {assessment.description}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Assessed: {new Date(assessment.assessedAt).toLocaleString()}
              </p>
            </div>
            <div className="ml-auto flex gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {assessment.metCount}
                </div>
                <div className="text-gray-500">Met</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {assessment.partialCount}
                </div>
                <div className="text-gray-500">Partial</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {assessment.notMetCount}
                </div>
                <div className="text-gray-500">Not Met</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {assessment.naCount}
                </div>
                <div className="text-gray-500">N/A</div>
              </div>
            </div>
          </div>

          {/* Controls Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Control
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {assessment.controls.map((ctrl) => {
                  const badge = STATUS_BADGE[ctrl.status] ?? STATUS_BADGE.na;
                  const isExpanded = expandedControl === ctrl.id;

                  return (
                    <tr
                      key={ctrl.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() =>
                        setExpandedControl(isExpanded ? null : ctrl.id)
                      }
                    >
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-200">
                        {ctrl.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-200">
                          {ctrl.title}
                        </div>
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-gray-500">
                              {ctrl.description}
                            </p>
                            <div>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Evidence Requirements:
                              </p>
                              <ul className="ml-4 list-disc text-xs text-gray-500">
                                {ctrl.evidenceRequirements.map((req, i) => (
                                  <li key={i}>{req}</li>
                                ))}
                              </ul>
                            </div>
                            {ctrl.evidence && (
                              <div className="rounded bg-gray-50 dark:bg-gray-800 p-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Auto-assessed evidence: </span>
                                {ctrl.evidence}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{ctrl.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ctrl.lastVerified ? (
                            <>
                              {(() => {
                                const age = Math.floor(
                                  (Date.now() - new Date(ctrl.lastVerified).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                );
                                const fresh = age <= 30;
                                const stale = age > 90;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      fresh
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : stale
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        fresh ? 'bg-green-500' : stale ? 'bg-red-500' : 'bg-yellow-500'
                                      }`}
                                    />
                                    {age}d
                                  </span>
                                );
                              })()}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              None
                            </span>
                          )}
                          <Link
                            href={`/evidence?frameworkId=${assessment?.frameworkId ?? ''}&controlId=${ctrl.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Select a framework to view compliance assessment.
        </div>
      )}

      {/* NIST 800-53 Controls — CVE/CWE linkage */}
      <div className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            NIST 800-53 Controls
          </h2>
          <p className="text-sm text-gray-500">
            Controls affected by your current findings, mapped via CWE weakness
            identifiers.
          </p>
        </div>

        {nistError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {nistError}
          </div>
        ) : nistLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 rounded bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : nistCoverage.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No CWE data available from findings. Upload scan results with CWE
            identifiers to see NIST 800-53 control mapping.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary bar */}
            {(() => {
              const totalControls = nistCoverage.reduce(
                (s, f) => s + f.totalCount,
                0,
              );
              const totalAffected = nistCoverage.reduce(
                (s, f) => s + f.affectedCount,
                0,
              );
              const gapCount = totalControls - totalAffected;
              return (
                <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalControls}
                    </div>
                    <div className="text-gray-500">Total Controls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {totalAffected}
                    </div>
                    <div className="text-gray-500">Affected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {gapCount}
                    </div>
                    <div className="text-gray-500">Clear</div>
                  </div>
                </div>
              );
            })()}

            {/* Per-family breakdown */}
            {nistCoverage.map((fam) => {
              const pct =
                fam.totalCount > 0
                  ? Math.round((fam.affectedCount / fam.totalCount) * 100)
                  : 0;
              const isExpanded = expandedNistFamily === fam.family;

              return (
                <div
                  key={fam.family}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() =>
                      setExpandedNistFamily(isExpanded ? null : fam.family)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {fam.family}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {fam.familyLabel}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {fam.affectedCount}/{fam.totalCount} controls affected
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Coverage bar */}
                      <div className="hidden w-32 sm:block">
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              pct === 0
                                ? 'bg-green-500'
                                : pct <= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          fam.affectedCount === 0
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : pct <= 50
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {fam.affectedCount === 0
                          ? 'Clear'
                          : `${pct}% affected`}
                      </span>
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/30">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                              Control
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                              Title
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {fam.controls.map((ctrl) => (
                            <tr
                              key={ctrl.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            >
                              <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-200">
                                {ctrl.id}
                              </td>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900 dark:text-gray-200">
                                  {ctrl.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {ctrl.description}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {ctrl.affected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                    <svg
                                      className="h-3 w-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Affected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    <svg
                                      className="h-3 w-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Clear
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
