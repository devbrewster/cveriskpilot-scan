// Next.js instrumentation — runs once on server startup
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Register tier-aware API rate limiting hook into withAuth()
  // This wires the app-layer billing helper into the auth package's middleware
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setRateLimitHook } = await import('@cveriskpilot/auth');
    const { checkApiRateLimit } = await import('@/lib/billing');
    setRateLimitHook(checkApiRateLimit);
  }
}
