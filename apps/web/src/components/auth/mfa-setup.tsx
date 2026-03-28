'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type SetupStep = 'loading' | 'scan' | 'verify' | 'complete';

interface MfaSetupData {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export function MfaSetup() {
  const [step, setStep] = useState<SetupStep>('loading');
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch setup data on mount
  useEffect(() => {
    async function fetchSetup() {
      try {
        const res = await fetch('/api/auth/mfa/setup');
        if (!res.ok) throw new Error('Failed to fetch MFA setup data');
        const data = await res.json();
        setSetupData(data);
        setStep('scan');
      } catch {
        setError('Failed to load MFA setup. Please try again.');
        setStep('scan');
      }
    }
    fetchSetup();
  }, []);

  const handleInput = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setCode(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted.length) return;
    const digits = pasted.split('');
    setCode(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIndex = Math.min(digits.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.join('');
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('complete');
      } else {
        setError(data.error || 'Invalid code. Please try again.');
        setCode(Array(6).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // -- Loading --
  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading MFA setup...</div>
      </div>
    );
  }

  // -- Step 1: Scan QR / Copy Secret --
  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Set Up Two-Factor Authentication
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Scan the QR code below with your authenticator app (Google Authenticator, Authy, 1Password, etc).
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* QR Code Placeholder */}
        {setupData && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <div className="px-4 text-center">
                  <svg className="mx-auto mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                  </svg>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    QR Code
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    (Render with qrcode library)
                  </p>
                </div>
              </div>
            </div>

            {/* Manual entry secret */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Or enter this secret manually:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono tracking-wider text-gray-900 dark:bg-gray-800 dark:text-white">
                  {setupData.secret}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(setupData.secret, setCopiedSecret)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setStep('verify');
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
          }}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          I&apos;ve scanned the QR code
        </button>
      </div>
    );
  }

  // -- Step 2: Verify Code --
  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Verify Setup
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={code[i]}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={verifying}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify and Enable'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setStep('scan'); setError(''); }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Back to QR code
        </button>
      </div>
    );
  }

  // -- Step 3: Complete — Show Backup Codes --
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Two-Factor Authentication Enabled
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your account is now protected with MFA.
        </p>
      </div>

      {/* Backup Codes */}
      {setupData?.backupCodes && setupData.backupCodes.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Backup Codes
            </h4>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(setupData.backupCodes.join('\n'), setCopiedBackup)
              }
              className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {copiedBackup ? 'Copied' : 'Copy all'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Save these codes in a safe place. Each code can only be used once.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {setupData.backupCodes.map((backupCode, i) => (
              <code
                key={i}
                className="rounded bg-gray-100 px-3 py-1.5 text-center text-sm font-mono tracking-wider text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              >
                {backupCode}
              </code>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        You will not be able to see these backup codes again. Make sure you have saved them before closing this page.
      </div>
    </div>
  );
}
