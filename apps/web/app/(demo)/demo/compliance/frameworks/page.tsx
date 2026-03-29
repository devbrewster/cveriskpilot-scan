'use client';

import { useState } from 'react';
import { demoComplianceScores } from '@/lib/demo-data';

/* ------------------------------------------------------------------ */
/* Demo framework assessment data                                     */
/* ------------------------------------------------------------------ */

interface DemoControl {
  id: string;
  title: string;
  category: string;
  status: 'met' | 'partial' | 'not_met' | 'na';
  evidence: string;
}

interface DemoFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  overallScore: number;
  metCount: number;
  partialCount: number;
  notMetCount: number;
  naCount: number;
  controls: DemoControl[];
}

const DEMO_FRAMEWORKS: DemoFramework[] = [
  {
    id: 'soc2',
    name: 'SOC 2',
    version: 'Type II',
    description: 'Service Organization Control 2 evaluates security, availability, processing integrity, confidentiality, and privacy controls.',
    overallScore: demoComplianceScores.SOC2 ?? 78,
    metCount: 32,
    partialCount: 12,
    notMetCount: 6,
    naCount: 4,
    controls: [
      { id: 'CC6.1', title: 'Logical Access Security', category: 'Common Criteria', status: 'met', evidence: 'RBAC enforced, MFA enabled for all admin accounts' },
      { id: 'CC6.2', title: 'Secure Access Provisioning', category: 'Common Criteria', status: 'met', evidence: 'Automated provisioning via SSO; deprovisioning within 24h' },
      { id: 'CC6.3', title: 'Access Removal', category: 'Common Criteria', status: 'partial', evidence: 'Automated for SSO users; manual process for service accounts' },
      { id: 'CC7.1', title: 'Vulnerability Management', category: 'Common Criteria', status: 'met', evidence: 'Weekly scans via Nessus/SARIF; MTTR under 15 days' },
      { id: 'CC7.2', title: 'Monitoring of System Components', category: 'Common Criteria', status: 'partial', evidence: 'Cloud Run monitoring active; container-level logging pending' },
      { id: 'CC8.1', title: 'Change Management', category: 'Common Criteria', status: 'met', evidence: 'PR review required; CI/CD pipeline enforces checks' },
    ],
  },
  {
    id: 'ssdf',
    name: 'NIST SSDF',
    version: 'SP 800-218 v1.1',
    description: 'Secure Software Development Framework defines practices for reducing vulnerabilities in released software.',
    overallScore: demoComplianceScores.SSDF ?? 82,
    metCount: 28,
    partialCount: 8,
    notMetCount: 4,
    naCount: 2,
    controls: [
      { id: 'PO.1', title: 'Define Security Requirements', category: 'Prepare', status: 'met', evidence: 'Security requirements in issue templates and acceptance criteria' },
      { id: 'PS.1', title: 'Protect Software', category: 'Protect', status: 'met', evidence: 'Signed commits, protected branches, artifact signing' },
      { id: 'PW.1', title: 'Design Secure Software', category: 'Produce', status: 'partial', evidence: 'Threat modeling for new features; legacy modules pending review' },
      { id: 'PW.6', title: 'Verify Third-Party Components', category: 'Produce', status: 'met', evidence: 'SCA scanning via CycloneDX SBOM; dependency pinning' },
      { id: 'RV.1', title: 'Identify Vulnerabilities', category: 'Respond', status: 'met', evidence: '11 scanner formats supported; continuous enrichment pipeline' },
      { id: 'RV.3', title: 'Analyze Vulnerabilities', category: 'Respond', status: 'met', evidence: 'AI-powered triage with EPSS/KEV correlation' },
    ],
  },
  {
    id: 'asvs',
    name: 'OWASP ASVS',
    version: 'v4.0.3',
    description: 'Application Security Verification Standard provides a basis for testing web application security controls.',
    overallScore: demoComplianceScores.ASVS ?? 71,
    metCount: 65,
    partialCount: 18,
    notMetCount: 22,
    naCount: 20,
    controls: [
      { id: 'V1.1', title: 'Secure SDLC', category: 'Architecture', status: 'met', evidence: 'CI/CD with SAST, dependency checks, and security gates' },
      { id: 'V2.1', title: 'Password Security', category: 'Authentication', status: 'met', evidence: 'HIBP checking, bcrypt hashing, password history' },
      { id: 'V3.1', title: 'Session Management', category: 'Session', status: 'met', evidence: 'Redis-backed sessions with secure cookie flags' },
      { id: 'V5.1', title: 'Input Validation', category: 'Validation', status: 'partial', evidence: 'Zod validation on API routes; frontend validation coverage at 80%' },
      { id: 'V9.1', title: 'HTTPS', category: 'Communications', status: 'met', evidence: 'TLS 1.2+ enforced via Cloud Armor; HSTS enabled' },
      { id: 'V13.1', title: 'API Security', category: 'API', status: 'partial', evidence: 'Rate limiting active; API key rotation pending implementation' },
    ],
  },
];

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
        <circle cx="44" cy="44" r={radius} fill="none" className="stroke-gray-200" strokeWidth="8" />
        <circle cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold text-gray-900">{score}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoComplianceFrameworksPage() {
  const [selectedId, setSelectedId] = useState<string>(DEMO_FRAMEWORKS[0]?.id ?? '');

  const assessment = DEMO_FRAMEWORKS.find((fw) => fw.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Frameworks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Auto-assessed compliance posture for SOC 2, NIST SSDF, and OWASP ASVS.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated compliance assessment data based on demo vulnerability posture.
        </p>
      </div>

      <div className="space-y-6">
        {/* Framework Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            {DEMO_FRAMEWORKS.map((fw) => (
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
        {assessment && (
          <div className="space-y-6">
            {/* Score Summary */}
            <div className="flex flex-wrap items-center gap-8 rounded-lg border border-gray-200 bg-white p-6">
              <ScoreRing score={assessment.overallScore} />
              <div>
                <h3 className="text-base font-semibold text-gray-900">{assessment.name}</h3>
                <p className="mt-1 max-w-lg text-sm text-gray-500">{assessment.description}</p>
              </div>
              <div className="ml-auto flex gap-4 text-center text-sm">
                <div>
                  <div className="text-2xl font-bold text-green-600">{assessment.metCount}</div>
                  <div className="text-gray-500">Met</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{assessment.partialCount}</div>
                  <div className="text-gray-500">Partial</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{assessment.notMetCount}</div>
                  <div className="text-gray-500">Not Met</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{assessment.naCount}</div>
                  <div className="text-gray-500">N/A</div>
                </div>
              </div>
            </div>

            {/* Controls Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Control</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assessment.controls.map((ctrl) => {
                    const badge = STATUS_BADGE[ctrl.status] ?? STATUS_BADGE.na;
                    return (
                      <tr key={ctrl.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">{ctrl.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{ctrl.title}</td>
                        <td className="px-4 py-3 text-gray-500">{ctrl.category}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{ctrl.evidence}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
