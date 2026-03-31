'use client';

import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface VerificationBadgeProps {
  auditEntryId: string;
  /** Pre-fetched verification status (optional — if not provided, fetches on click) */
  status?: 'verified' | 'unsigned' | 'failed' | null;
}

interface VerificationResult {
  verified: boolean;
  signatureValid: boolean;
  merkleValid: boolean | null;
  signatureExists?: boolean;
  signature?: {
    keyVersion: string;
    signedAt: string;
    leafIndex: number | null;
  };
  merkleProof?: {
    root: string;
    leafIndex: number;
    treeSize: number;
  } | null;
  message?: string;
}

export function VerificationBadge({ auditEntryId, status: initialStatus }: VerificationBadgeProps) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayStatus = result
    ? result.verified
      ? 'verified'
      : result.signatureExists === false
        ? 'unsigned'
        : 'failed'
    : initialStatus ?? null;

  async function verify() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/audit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditEntryId }),
      });
      if (res.ok) {
        const data = (await res.json()) as VerificationResult;
        setResult(data);
        setExpanded(true);
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const badgeColor =
    displayStatus === 'verified'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : displayStatus === 'failed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : displayStatus === 'unsigned'
          ? 'bg-gray-50 text-gray-500 border-gray-200'
          : 'bg-gray-50 text-gray-400 border-gray-200';

  const icon =
    displayStatus === 'verified' ? (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ) : displayStatus === 'failed' ? (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

  return (
    <div className="inline-flex flex-col gap-1">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={verify}
              disabled={loading}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${badgeColor}`}
            >
              {loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                icon
              )}
              {displayStatus === 'verified'
                ? 'Verified'
                : displayStatus === 'failed'
                  ? 'Failed'
                  : displayStatus === 'unsigned'
                    ? 'Unsigned'
                    : 'Verify'}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content
            className="max-w-xs rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            sideOffset={5}
          >
            {displayStatus === 'verified'
              ? 'Cryptographically verified — Ed25519 signature and Merkle proof valid'
              : displayStatus === 'failed'
                ? 'Verification failed — entry may have been tampered with'
                : displayStatus === 'unsigned'
                  ? 'No cryptographic signature (free tier)'
                  : 'Click to verify cryptographic signature'}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      {expanded && result && (
        <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs font-mono">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Signature</span>
              <span className={result.signatureValid ? 'text-emerald-600' : 'text-red-600'}>
                {result.signatureValid ? 'Valid' : 'Invalid'}
              </span>
            </div>
            {result.merkleValid !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Merkle Proof</span>
                <span className={result.merkleValid ? 'text-emerald-600' : 'text-red-600'}>
                  {result.merkleValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
            )}
            {result.signature && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Key</span>
                  <span className="text-gray-700 truncate ml-2 max-w-[200px]">
                    {result.signature.keyVersion === 'local' ? 'Local Ed25519' : 'Cloud KMS'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Signed</span>
                  <span className="text-gray-700">
                    {new Date(result.signature.signedAt).toLocaleString()}
                  </span>
                </div>
                {result.signature.leafIndex !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Leaf #</span>
                    <span className="text-gray-700">{result.signature.leafIndex}</span>
                  </div>
                )}
              </>
            )}
            {result.merkleProof && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tree Root</span>
                <span className="text-gray-700 truncate ml-2 max-w-[180px]" title={result.merkleProof.root}>
                  {result.merkleProof.root.slice(0, 16)}...
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="mt-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
