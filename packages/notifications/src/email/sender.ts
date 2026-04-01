// ---------------------------------------------------------------------------
// Email sender using Resend HTTP API with SMTP fallback.
// Falls back to console logging when neither is configured.
// ---------------------------------------------------------------------------

import { createTransport, type Transporter } from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
}

/**
 * Send an email via Resend HTTP API (preferred) or SMTP fallback.
 * If neither is configured, logs the email to console for development.
 *
 * This function is designed to be fire-and-forget -- callers should not
 * await it in hot API paths unless delivery confirmation is required.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@cveriskpilot.com';
  const recipients = Array.isArray(to) ? to : [to];

  // Prefer Resend HTTP API if key is available
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `CVERiskPilot <${from}>`,
          to: recipients,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[email] Resend API error ${res.status}:`, body);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[email] Resend API request failed:', error);
      return false;
    }
  }

  // Fallback to SMTP
  const transport = getTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from,
        to: recipients.join(', '),
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('[email] SMTP send failed:', error);
      return false;
    }
  }

  // No transport configured — log for development
  console.log('[email] No email transport configured -- logging instead');
  console.log(
    JSON.stringify({
      to,
      subject,
      htmlLength: html.length,
      preview: html.slice(0, 200),
    }),
  );
  return false;
}
