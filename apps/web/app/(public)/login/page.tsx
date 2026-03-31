'use client';

import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type LoginState = 'idle' | 'submitting' | 'mfa_challenge' | 'mfa_verifying' | 'success';

function getSafeCallbackUrl(url: string | null): string {
  if (!url) return '/dashboard';
  // Must start with / and not // (protocol-relative)
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl') ?? searchParams.get('redirect'));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const ERROR_MESSAGES: Record<string, string> = {
    google_state: 'Authentication session expired. Please try again.',
    google_denied: 'Google sign-in was cancelled.',
    google_invalid: 'Invalid authentication response. Please try again.',
    google_token: 'Failed to verify Google credentials. Please try again.',
    google_config: 'Google sign-in is not configured. Please use email login.',
    google_fail: 'Google sign-in failed. Please try again.',
    session_unavailable: 'Session service unavailable. Please try again in a moment.',
  };
  const urlError = searchParams.get('error');
  const [error, setError] = useState(urlError ? (ERROR_MESSAGES[urlError] ?? 'Authentication failed. Please try again.') : "");
  const [state, setState] = useState<LoginState>('idle');
  const [tempSessionId, setTempSessionId] = useState("");
  const [mfaCode, setMfaCode] = useState<string[]>(Array(6).fill(""));
  const mfaInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const loading = state === 'submitting' || state === 'mfa_verifying';

  // Handle MFA digit input
  const handleMfaInput = useCallback((index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    setMfaCode(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    // Auto-advance to next input
    if (digit && index < 5) {
      mfaInputRefs.current[index + 1]?.focus();
    }
  }, []);

  // Handle backspace in MFA inputs
  const handleMfaKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
      mfaInputRefs.current[index - 1]?.focus();
    }
  }, [mfaCode]);

  // Handle paste into MFA inputs
  const handleMfaPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const digits = pasted.split('');
    setMfaCode(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    // Focus last filled input or the next empty one
    const focusIndex = Math.min(digits.length, 5);
    mfaInputRefs.current[focusIndex]?.focus();
  }, []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState('submitting');

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Check if MFA is required
        if (data.mfaRequired) {
          setTempSessionId(data.tempSessionId || '');
          setState('mfa_challenge');
          // Focus first MFA input after render
          setTimeout(() => mfaInputRefs.current[0]?.focus(), 50);
          return;
        }
        // No MFA — login complete
        setState('success');
        router.push(callbackUrl);
      } else {
        setError(data.error || "Login failed. Please try again.");
        setState('idle');
      }
    } catch {
      setError("Network error. Please try again.");
      setState('idle');
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = mfaCode.join('');

    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setError("");
    setState('mfa_verifying');

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, tempSessionId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setState('success');
        router.push(callbackUrl);
      } else {
        setError(data.error || "Invalid code. Please try again.");
        setState('mfa_challenge');
        // Clear code and refocus
        setMfaCode(Array(6).fill(""));
        setTimeout(() => mfaInputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError("Network error. Please try again.");
      setState('mfa_challenge');
    }
  }

  // -- MFA Challenge Step --
  if (state === 'mfa_challenge' || state === 'mfa_verifying') {
    return (
      <>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleMfaSubmit} className="mt-6">
          {/* 6-digit input boxes */}
          <div className="flex justify-center gap-2" onPaste={handleMfaPaste}>
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                ref={el => { mfaInputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={mfaCode[i]}
                onChange={e => handleMfaInput(i, e.target.value)}
                onKeyDown={e => handleMfaKeyDown(i, e)}
                className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={state === 'mfa_verifying'}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={state === 'mfa_verifying'}
            className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === 'mfa_verifying' ? "Verifying..." : "Verify"}
          </button>
        </form>

        {/* Back to login */}
        <button
          type="button"
          onClick={() => {
            setState('idle');
            setError('');
            setMfaCode(Array(6).fill(""));
            setTempSessionId('');
          }}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Back to login
        </button>
      </>
    );
  }

  // -- Login Step (email/password) --
  return (
    <>
      <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        Sign in to CVERiskPilot
      </h1>
      <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        Welcome back. Sign in to continue.
      </p>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={() => { window.location.href = '/api/auth/google'; }}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </button>

      {/* GitHub Sign In */}
      <button
        type="button"
        onClick={() => { window.location.href = '/api/auth/github'; }}
        className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Sign in with GitHub
      </button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          or continue with email
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Email Form */}
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <a
              href="mailto:support@cveriskpilot.com"
              className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Forgot password?
            </a>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'submitting' ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
