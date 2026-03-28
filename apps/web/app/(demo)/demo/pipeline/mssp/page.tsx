'use client';

import { useState } from 'react';
import Link from 'next/link';
import { demoPipelineMSSPClients } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-700';
  if (score >= 75) return 'text-yellow-700';
  return 'text-red-700';
}

function scoreBg(score: number): string {
  if (score >= 90) return 'bg-green-100';
  if (score >= 75) return 'bg-yellow-100';
  return 'bg-red-100';
}

function barColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoMSSPPage() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const client = selectedClient
    ? demoPipelineMSSPClients.find((c) => c.id === selectedClient) ?? null
    : null;

  // Aggregate stats
  const totalScans = demoPipelineMSSPClients.reduce((sum, c) => sum + c.scanCount, 0);
  const totalFindings = demoPipelineMSSPClients.reduce((sum, c) => sum + c.openFindings, 0);
  const totalPoams = demoPipelineMSSPClients.reduce((sum, c) => sum + c.poamItems, 0);
  const avgCompliance = Math.round(
    demoPipelineMSSPClients.reduce((sum, c) => sum + c.complianceScore, 0) / demoPipelineMSSPClients.length,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/demo/pipeline" className="hover:text-blue-600">Pipeline Scanner</Link>
        <span>/</span>
        <span className="text-gray-900">MSSP View</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">MSSP Client Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Multi-client compliance monitoring for managed security service providers &mdash; Demo Mode
        </p>
      </div>

      {/* Aggregate stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total Clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{demoPipelineMSSPClients.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total Scans</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalScans.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Open Findings</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">{totalFindings}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Avg Compliance</p>
          <p className={`mt-1 text-2xl font-bold ${scoreColor(avgCompliance)}`}>{avgCompliance}%</p>
        </div>
      </div>

      {/* Client table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Client Portfolio</h2>
          <p className="mt-0.5 text-sm text-gray-500">Click a client for detailed compliance metrics</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Industry</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Frameworks</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Scans</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Open Findings</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">POAM Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {demoPipelineMSSPClients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedClient(selectedClient === c.id ? null : c.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedClient === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">{c.industry}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.frameworks.map((fw) => (
                        <span key={fw} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{fw}</span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-700">{c.scanCount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className={c.openFindings > 30 ? 'font-semibold text-red-600' : 'text-gray-700'}>
                      {c.openFindings}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-700">{c.poamItems}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreBg(c.complianceScore)} ${scoreColor(c.complianceScore)}`}>
                      {c.complianceScore}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client detail panel */}
      {client && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
              <p className="text-sm text-gray-500">{client.industry}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClient(null)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{client.scanCount.toLocaleString()}</p>
              <p className="text-[10px] font-medium text-gray-500">Total Scans</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <p className="text-xl font-bold text-orange-700">{client.openFindings}</p>
              <p className="text-[10px] font-medium text-gray-500">Open Findings</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{client.poamItems}</p>
              <p className="text-[10px] font-medium text-gray-500">POAM Items</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
              <p className={`text-xl font-bold ${scoreColor(client.complianceScore)}`}>{client.complianceScore}%</p>
              <p className="text-[10px] font-medium text-gray-500">Compliance Score</p>
            </div>
          </div>

          {/* Framework badges with simulated scores */}
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Active Frameworks</h3>
          <div className="space-y-3">
            {client.frameworks.map((fw) => {
              // Simulate per-framework scores based on overall score with variance
              // Deterministic variance based on framework name length
              const variance = ((fw.charCodeAt(0) + fw.length) % 20) - 10;
              const fwScore = Math.min(100, Math.max(50, client.complianceScore + variance));
              return (
                <div key={fw}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{fw}</span>
                    <span className={`text-sm font-bold ${scoreColor(fwScore)}`}>{fwScore}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-full rounded-full transition-all ${barColor(fwScore)}`} style={{ width: `${fwScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
