import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@cveriskpilot/shared";

const logger = createLogger("api.partners.apply");

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const ApplicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactName: z.string().min(1, "Contact name is required").max(200),
  email: z.string().email("Invalid email address").max(320),
  phone: z.string().max(50).optional(),
  companyType: z.string().min(1, "Company type is required").max(100),
  clientCount: z.string().min(1, "Client count is required").max(20),
  message: z.string().max(2000).optional(),
});

/* ------------------------------------------------------------------ */
/*  Simple in-memory rate limiter (per IP, 3 submissions per hour)     */
/* ------------------------------------------------------------------ */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale entries periodically (every 10 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 10 * 60 * 1000);
}

/* ------------------------------------------------------------------ */
/*  POST /api/partners/apply                                           */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const result = ApplicationSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = result.data;

    // Log the application (structured logging for Cloud Logging)
    logger.info("Partner application received", {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      companyType: data.companyType,
      clientCount: data.clientCount,
      ip,
    });

    // Send notification email to partnerships team
    // Uses the notification package if available, otherwise falls back to logging
    try {
      const { sendEmail } = await import("@cveriskpilot/notifications");
      await sendEmail({
        to: "partners@cveriskpilot.com",
        subject: `[Partner Application] ${data.companyName} — ${data.companyType}`,
        html: `
          <h2>New Partner Application</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:6px 12px;font-weight:bold;">Company</td><td style="padding:6px 12px;">${escapeHtml(data.companyName)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Contact</td><td style="padding:6px 12px;">${escapeHtml(data.contactName)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Phone</td><td style="padding:6px 12px;">${escapeHtml(data.phone || "Not provided")}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Type</td><td style="padding:6px 12px;">${escapeHtml(data.companyType)}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Clients</td><td style="padding:6px 12px;">${escapeHtml(data.clientCount)}</td></tr>
          </table>
          <h3>Message</h3>
          <p>${escapeHtml(data.message || "(No message provided)")}</p>
          <hr/>
          <p style="color:#888;font-size:12px;">IP: ${escapeHtml(ip)} | Submitted: ${new Date().toISOString()}</p>
        `,
      });
    } catch {
      // Email delivery is best-effort; the application is logged regardless
      logger.warn("Failed to send partner application notification email");
    }

    return NextResponse.json(
      { success: true, message: "Application received. We will be in touch within 48 hours." },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Partner application error", { error: String(err) });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
