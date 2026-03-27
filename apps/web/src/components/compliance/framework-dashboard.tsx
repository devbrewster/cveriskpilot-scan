'use client';

import { useState, useEffect, useCallback } from 'react';

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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  met: { label: 'Met', className: 'bg-green-100 text-green-800' },
  partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800' },
  not_met: { label: 'Not Met', className: 'bg-red-100 text-red-800' },
  na: { label: 'N/A', className: 'bg-gray-100 text-gray-600' },
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
          stroke="#e5e7eb"
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
      <span className="absolute text-lg font-bold text-gray-900">{score}%</span>
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

  const orgId = organizationId ?? 'org-default';

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
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchAssessment = useCallback(async (fwId: string) => {
    setAssessmentLoading(true);
    try {
      const res = await fetch(
        `/api/compliance/frameworks/${fwId}?organizationId=${orgId}`,
      );
      if (res.ok) {
        setAssessment(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setAssessmentLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (selectedId) fetchAssessment(selectedId);
  }, [selectedId, fetchAssessment]);

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
        <h2 className="text-lg font-semibold text-gray-900">
          Compliance Framework Dashboards
        </h2>
        <p className="text-sm text-gray-500">
          Auto-assessed compliance posture based on your vulnerability management data.
        </p>
      </div>

      {/* Framework Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {frameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedId(fw.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                selectedId === fw.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
            <div className="h-24 w-24 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-4 w-64 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-64 rounded bg-gray-100" />
        </div>
      ) : assessment ? (
        <div className="space-y-6">
          {/* Score Summary */}
          <div className="flex flex-wrap items-center gap-8 rounded-lg border border-gray-200 bg-white p-6">
            <ScoreRing score={assessment.overallScore} />
            <div>
              <h3 className="text-base font-semibold text-gray-900">
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
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Control
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assessment.controls.map((ctrl) => {
                  const badge = STATUS_BADGE[ctrl.status] ?? STATUS_BADGE.na;
                  const isExpanded = expandedControl === ctrl.id;

                  return (
                    <tr
                      key={ctrl.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setExpandedControl(isExpanded ? null : ctrl.id)
                      }
                    >
                      <td className="px-4 py-3 font-mono text-gray-900">
                        {ctrl.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {ctrl.title}
                        </div>
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-gray-500">
                              {ctrl.description}
                            </p>
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Evidence Requirements:
                              </p>
                              <ul className="ml-4 list-disc text-xs text-gray-500">
                                {ctrl.evidenceRequirements.map((req, i) => (
                                  <li key={i}>{req}</li>
                                ))}
                              </ul>
                            </div>
                            {ctrl.evidence && (
                              <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
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
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Select a framework to view compliance assessment.
        </div>
      )}
    </div>
  );
}
