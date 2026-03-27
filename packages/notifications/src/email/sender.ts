// ---------------------------------------------------------------------------
// Email sender using nodemailer with SMTP config from environment variables.
// Falls back to console logging when SMTP is not configured.
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
 * Send an email. If SMTP is not configured, logs the email content to the
 * console so development can proceed without a mail server.
 *
 * This function is designed to be fire-and-forget -- callers should not
 * await it in hot API paths unless delivery confirmation is required.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;
  const transport = getTransporter();

  if (!transport) {
    console.log('[email] SMTP not configured -- logging email instead');
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

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@cveriskpilot.com';
    await transport.sendMail({ from, to: Array.isArray(to) ? to.join(', ') : to, subject, html });
    return true;
  } catch (error) {
    console.error('[email] Failed to send email:', error);
    return false;
  }
}
