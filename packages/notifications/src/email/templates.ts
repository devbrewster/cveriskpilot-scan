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
