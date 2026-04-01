// ---------------------------------------------------------------------------
// Conversion Funnel Event Tracker
// ---------------------------------------------------------------------------
// Emits structured JSON events to stdout for Cloud Logging pickup.
// Fire-and-forget — never blocks the calling request.
// ---------------------------------------------------------------------------

/**
 * Funnel step names representing the signup-to-paid conversion funnel.
 */
export type FunnelStep =
  | 'visit'
  | 'signup'
  | 'first_upload'
  | 'first_triage'
  | 'paid_conversion';

export interface FunnelEvent {
  /** Which step in the conversion funnel. */
  step: FunnelStep;
  /** Organization ID (available after signup). */
  orgId?: string;
  /** User ID (available after signup). */
  userId?: string;
  /** Arbitrary key-value metadata (UTM source, plan name, etc.). */
  metadata?: Record<string, string>;
}

/**
 * Emit a structured funnel event to stdout.
 *
 * In production (Cloud Run), Cloud Logging automatically ingests structured
 * JSON from stdout. In development, a human-readable line is printed instead.
 *
 * This function is synchronous and never throws — safe for fire-and-forget use.
 */
export function trackFunnelEvent(event: FunnelEvent): void {
  try {
    const entry = {
      severity: 'INFO',
      message: `funnel:${event.step}`,
      'logging.googleapis.com/labels': {
        event_type: 'funnel',
        funnel_step: event.step,
      },
      timestamp: new Date().toISOString(),
      funnel: {
        step: event.step,
        orgId: event.orgId ?? null,
        userId: event.userId ?? null,
        metadata: event.metadata ?? {},
      },
    };

    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      (!process.env.NODE_ENV && !process.env.K_SERVICE);

    if (isDev) {
      const meta = event.metadata ? ` ${JSON.stringify(event.metadata)}` : '';
      const org = event.orgId ? ` org=${event.orgId}` : '';
      console.log(
        `\x1b[35m[FUNNEL]\x1b[0m ${event.step}${org}${meta}`,
      );
    } else {
      // Structured JSON — Cloud Logging parses this automatically
      console.log(JSON.stringify(entry));
    }
  } catch {
    // Never throw — fire-and-forget
  }
}
