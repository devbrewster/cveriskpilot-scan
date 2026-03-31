'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function TrialBanner() {
  const { trialEndsAt, tier } = useAuth();

  if (!trialEndsAt) return null;

  const endsAt = new Date(trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isExpired = endsAt <= now;

  // If trial expired and tier already downgraded, the session will refresh
  // and trialEndsAt will be null. This handles the brief window before refresh.
  if (isExpired || (tier !== 'PRO' && daysRemaining === 0)) {
    return (
      <div className="relative z-50 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
        Your Pro trial has ended.{' '}
        <Link href="/buy" className="underline underline-offset-2 hover:text-red-100">
          Subscribe to continue using Pro features
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-50 bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white">
      Pro trial: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining{' '}
      <span className="mx-2 opacity-50">|</span>
      <Link href="/buy" className="underline underline-offset-2 hover:text-primary-100">
        Subscribe now
      </Link>
    </div>
  );
}
