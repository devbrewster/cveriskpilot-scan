// ---------------------------------------------------------------------------
// HTML email templates for CVERiskPilot notifications
// ---------------------------------------------------------------------------

const baseWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="background:#1e293b;padding:16px 24px;">
        <span style="color:#fff;font-size:18px;font-weight:600;">CVERiskPilot</span>
      </div>
      <div style="padding:24px;">
        ${content}
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;">
      You received this because of your notification preferences in CVERiskPilot.
    </p>
  </div>
</body>
</html>`;

/**
 * Email sent when a vulnerability case is assigned to a user.
 */
export function caseAssignedTemplate(
  caseName: string,
  assignerName: string,
  caseUrl: string,
): string {
  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Case Assigned to You</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      <strong>${assignerName}</strong> assigned the following vulnerability case to you:
    </p>
    <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;">
      <p style="margin:0;font-weight:600;color:#1e293b;">${caseName}</p>
    </div>
    <a href="${caseUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      View Case
    </a>
  `);
}

/**
 * Email sent when a user is @mentioned in a comment.
 */
export function commentMentionTemplate(
  mentionerName: string,
  caseTitle: string,
  commentPreview: string,
  caseUrl: string,
): string {
  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">You Were Mentioned</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      <strong>${mentionerName}</strong> mentioned you in a comment on
      <strong>${caseTitle}</strong>:
    </p>
    <blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #8b5cf6;color:#475569;font-style:italic;">
      ${commentPreview}
    </blockquote>
    <a href="${caseUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#8b5cf6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      View Comment
    </a>
  `);
}

/**
 * SLA breach digest email listing overdue cases.
 */
export function slaBreachTemplate(
  cases: Array<{ title: string; severity: string; dueAt: string; caseUrl: string }>,
): string {
  const rows = cases
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
        <a href="${c.caseUrl}" style="color:#3b82f6;text-decoration:none;font-weight:500;">${c.title}</a>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
        <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;background:${
          c.severity === 'CRITICAL' ? '#fef2f2;color:#dc2626' : c.severity === 'HIGH' ? '#fff7ed;color:#ea580c' : '#f0fdf4;color:#16a34a'
        };">
          ${c.severity}
        </span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-size:13px;">
        Due ${c.dueAt}
      </td>
    </tr>`,
    )
    .join('');

  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">SLA Breach Alert</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      The following <strong>${cases.length}</strong> case(s) have breached or are about to breach their SLA:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Case</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">Severity</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Due Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

/**
 * Daily digest of unread notifications.
 */
export function digestTemplate(
  notifications: Array<{ title: string; message: string; createdAt: string }>,
): string {
  const items = notifications
    .map(
      (n) => `
    <div style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0;font-weight:600;font-size:14px;color:#1e293b;">${n.title}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#475569;">${n.message}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">${n.createdAt}</p>
    </div>`,
    )
    .join('');

  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Your Daily Digest</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      You have <strong>${notifications.length}</strong> unread notification(s):
    </p>
    <div style="margin:16px 0;">${items}</div>
  `);
}

/**
 * Welcome email sent after first signup.
 */
export function welcomeTemplate(
  userName: string,
  loginUrl: string,
  docsUrl: string,
): string {
  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Welcome to CVERiskPilot</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Hi <strong>${userName}</strong>, thanks for signing up! You're now ready to turn vulnerability noise into audit-ready decisions.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px;font-weight:600;">
      Get started in 3 steps:
    </p>
    <div style="margin:16px 0;">
      <div style="padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;margin-bottom:8px;">
        <p style="margin:0;font-weight:600;color:#1e293b;">1. Upload your first scan</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">Drag and drop a Nessus, SARIF, CycloneDX, or any of 11 supported formats.</p>
      </div>
      <div style="padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;margin-bottom:8px;">
        <p style="margin:0;font-weight:600;color:#1e293b;">2. Review your findings</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">See enriched CVE data with EPSS, KEV, and compliance impact at a glance.</p>
      </div>
      <div style="padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;margin-bottom:8px;">
        <p style="margin:0;font-weight:600;color:#1e293b;">3. Set up compliance frameworks</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">Select SOC 2, HIPAA, CMMC, or any of 13 frameworks to map findings to controls.</p>
      </div>
    </div>
    <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Upload Your First Scan
    </a>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px;">
      Want to scan from your CI/CD pipeline? Try our free CLI: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">npx @cveriskpilot/scan</code>
    </p>
    <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
      Need help? Check the <a href="${docsUrl}" style="color:#3b82f6;text-decoration:none;">documentation</a>.
    </p>
  `);
}

/**
 * Email warning that a Pro trial is about to expire.
 */
export function trialExpiryTemplate(
  orgName: string,
  daysRemaining: number,
  upgradeUrl: string,
  features: string[],
): string {
  const heading =
    daysRemaining === 0
      ? 'Your Trial Has Expired'
      : `Your Pro Trial Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

  const message =
    daysRemaining === 0
      ? `<strong>${orgName}</strong> has been downgraded to the Free plan. Upgrade now to restore full access.`
      : `<strong>${orgName}</strong>'s Pro trial ends in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>. After expiration, you'll lose access to:`;

  const featureList = features
    .map(
      (f) => `
    <li style="padding:4px 0;color:#475569;font-size:14px;">${f}</li>`,
    )
    .join('');

  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">${heading}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      ${message}
    </p>
    <ul style="margin:16px 0;padding-left:20px;">${featureList}</ul>
    <a href="${upgradeUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Upgrade Now
    </a>
  `);
}

/**
 * Email sent when a payment fails.
 */
export function paymentFailedTemplate(
  orgName: string,
  amount: string,
  retryUrl: string,
): string {
  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Payment Failed</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      A payment of <strong>${amount}</strong> for <strong>${orgName}</strong> could not be processed.
    </p>
    <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-radius:6px;border-left:4px solid #dc2626;">
      <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Action required</p>
      <p style="margin:4px 0 0;font-size:13px;color:#475569;">Please update your payment method to avoid service interruption. If not resolved, your account may be downgraded.</p>
    </div>
    <a href="${retryUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Update Payment Method
    </a>
  `);
}

/**
 * Email warning that a usage limit is being approached.
 */
export function usageLimitTemplate(
  orgName: string,
  metric: string,
  currentUsage: number,
  limit: number,
  upgradeUrl: string,
): string {
  const pct = Math.round((currentUsage / limit) * 100);
  const barColor = pct >= 95 ? '#dc2626' : pct >= 80 ? '#ea580c' : '#3b82f6';

  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Approaching Usage Limit</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      <strong>${orgName}</strong> has used <strong>${currentUsage}</strong> of <strong>${limit}</strong> ${metric}.
    </p>
    <div style="margin:16px 0;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px;">
        <span>${metric}</span>
        <span>${pct}%</span>
      </div>
      <div style="background:#e2e8f0;border-radius:9999px;height:8px;overflow:hidden;">
        <div style="background:${barColor};height:100%;width:${pct}%;border-radius:9999px;"></div>
      </div>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Upgrade your plan to increase your ${metric} allowance.
    </p>
    <a href="${upgradeUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Upgrade Plan
    </a>
  `);
}

/**
 * Email sent when a trial has fully expired and the org is downgraded.
 */
export function trialExpiredTemplate(
  orgName: string,
  upgradeUrl: string,
): string {
  return baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Your Trial Has Expired</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      <strong>${orgName}</strong>'s Pro trial has ended. Your organization has been downgraded to the Free plan.
    </p>
    <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:6px;border-left:4px solid #ea580c;">
      <p style="margin:0;font-weight:600;color:#1e293b;">What you no longer have access to:</p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#475569;font-size:13px;">
        <li style="padding:2px 0;">Automated AI triage on upload</li>
        <li style="padding:2px 0;">Scheduled compliance reports</li>
        <li style="padding:2px 0;">Extended asset and AI call limits</li>
        <li style="padding:2px 0;">Jira and webhook integrations</li>
        <li style="padding:2px 0;">Custom SLA policies</li>
      </ul>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Reactivate Pro to restore full access and pick up where you left off.
    </p>
    <a href="${upgradeUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Reactivate Pro
    </a>
  `);
}
