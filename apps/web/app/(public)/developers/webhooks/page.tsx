import type { Metadata } from 'next';
import { NavBar } from '@/components/landing/nav-bar';
import { Footer } from '@/components/landing/footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Webhook Events | CVERiskPilot Developer Portal',
  description:
    'CloudEvents 1.0 webhook reference for CVERiskPilot. Event types, payload schemas, HMAC verification, and retry behavior.',
  alternates: { canonical: 'https://cveriskpilot.com/developers/webhooks' },
};

// ---------------------------------------------------------------------------
// Webhook event catalog
// ---------------------------------------------------------------------------

const EVENTS = [
  {
    type: 'case.created',
    description: 'A new vulnerability case was created from ingested findings.',
    payload: `{
  "id": "case_abc123",
  "title": "CVE-2024-21762 — Fortinet FortiOS RCE",
  "severity": "CRITICAL",
  "cveIds": ["CVE-2024-21762"],
  "epssScore": 0.972,
  "kevListed": true,
  "status": "NEW",
  "findingCount": 3,
  "createdAt": "2026-03-31T10:00:00Z"
}`,
  },
  {
    type: 'case.updated',
    description: 'A case was modified (severity, assignment, remediation notes, etc.).',
    payload: `{
  "id": "case_abc123",
  "changes": {
    "severity": { "from": "HIGH", "to": "CRITICAL" },
    "assignedToId": { "from": null, "to": "user_xyz" }
  },
  "updatedBy": "user_admin",
  "updatedAt": "2026-03-31T12:30:00Z"
}`,
  },
  {
    type: 'case.status_changed',
    description: 'A case transitioned to a new status (e.g., NEW → TRIAGE → IN_REMEDIATION).',
    payload: `{
  "id": "case_abc123",
  "fromStatus": "NEW",
  "toStatus": "TRIAGE",
  "changedBy": "user_analyst",
  "reason": "AI triage flagged as TRUE_POSITIVE",
  "changedAt": "2026-03-31T14:00:00Z"
}`,
  },
  {
    type: 'finding.created',
    description: 'A new raw finding was ingested from a scan upload.',
    payload: `{
  "id": "finding_def456",
  "scannerType": "NESSUS",
  "dedupKey": "CVE-2024-21762:192.168.1.10:443",
  "assetId": "asset_web01",
  "vulnerabilityCaseId": "case_abc123",
  "discoveredAt": "2026-03-31T10:00:00Z"
}`,
  },
  {
    type: 'sla.breached',
    description: 'A case exceeded its SLA policy due date without resolution.',
    payload: `{
  "caseId": "case_abc123",
  "slaPolicyId": "sla_critical_7d",
  "dueAt": "2026-03-28T00:00:00Z",
  "severity": "CRITICAL",
  "daysOverdue": 3
}`,
  },
  {
    type: 'comment.created',
    description: 'A comment was added to a vulnerability case.',
    payload: `{
  "caseId": "case_abc123",
  "commentId": "comment_ghi789",
  "userId": "user_analyst",
  "content": "Patch available in FortiOS 7.4.3. Scheduling maintenance window.",
  "createdAt": "2026-03-31T15:00:00Z"
}`,
  },
  {
    type: 'pipeline.scan.completed',
    description: 'A CLI pipeline scan completed successfully.',
    payload: `{
  "scanId": "scan_jkl012",
  "repoUrl": "https://github.com/acme/app",
  "branch": "main",
  "verdict": "FAIL",
  "totalFindings": 12,
  "criticalCount": 2,
  "highCount": 4,
  "frameworks": ["nist-800-53", "soc2"]
}`,
  },
  {
    type: 'pipeline.compliance.violation',
    description: 'A pipeline scan found a compliance framework violation.',
    payload: `{
  "scanId": "scan_jkl012",
  "framework": "nist-800-53",
  "control": "SI-2",
  "controlTitle": "Flaw Remediation",
  "violation": "3 critical CVEs without patches applied",
  "severity": "HIGH"
}`,
  },
];

export default function WebhooksPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/developers"
            className="text-sm text-blue-600 hover:underline mb-4 inline-block"
          >
            &larr; Developer Portal
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Webhook Events</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            CVERiskPilot sends real-time webhook notifications using the{' '}
            <a
              href="https://cloudevents.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              CloudEvents 1.0
            </a>{' '}
            specification. Configure endpoints in{' '}
            <Link href="/settings?tab=webhooks" className="text-blue-600 hover:underline">
              Settings → Webhooks
            </Link>.
          </p>
        </div>

        {/* Envelope format */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Envelope Format</h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                CloudEvents 1.0 Envelope
              </span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed bg-gray-900 text-gray-100">
              <code>{`{
  "specversion": "1.0",
  "type": "com.cveriskpilot.case.created",
  "source": "/orgs/org_abc123",
  "id": "delivery_unique_id",
  "time": "2026-03-31T10:00:00Z",
  "datacontenttype": "application/json",
  "data": { ... event payload ... }
}`}</code>
            </pre>
          </div>
        </section>

        {/* Signature verification */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Signature Verification</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Every webhook delivery includes an HMAC-SHA256 signature for verification.
              Your webhook secret is generated when you create the endpoint.
            </p>
            <div className="text-sm space-y-2">
              <p className="font-medium text-gray-900">Headers sent with each delivery:</p>
              <ul className="space-y-1 text-gray-600">
                <li>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">X-Webhook-Signature</code>{' '}
                  — HMAC-SHA256 hex digest of the request body
                </li>
                <li>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">X-Webhook-Event</code>{' '}
                  — Event type (e.g., <code>case.created</code>)
                </li>
                <li>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">X-Webhook-Timestamp</code>{' '}
                  — ISO 8601 timestamp
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Node.js verification example
                </span>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-relaxed bg-gray-900 text-gray-100">
                <code>{`import crypto from 'node:crypto';

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Retry behavior */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Retry Behavior</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600 mb-3">
              Failed deliveries (non-2xx response or timeout) are retried with exponential backoff:
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded bg-gray-50 p-3 text-center">
                <p className="font-semibold text-gray-900">Attempt 1</p>
                <p className="text-gray-500">Immediate</p>
              </div>
              <div className="rounded bg-gray-50 p-3 text-center">
                <p className="font-semibold text-gray-900">Attempt 2</p>
                <p className="text-gray-500">After 1 min</p>
              </div>
              <div className="rounded bg-gray-50 p-3 text-center">
                <p className="font-semibold text-gray-900">Attempt 3</p>
                <p className="text-gray-500">After 5 min</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              After 3 failed attempts, the delivery is marked as failed. Your endpoint must respond
              within 10 seconds. View delivery history in Settings → Webhooks.
            </p>
          </div>
        </section>

        {/* Event catalog */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Catalog</h2>
          <div className="space-y-8">
            {EVENTS.map((event) => (
              <div key={event.type} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <code className="text-base font-semibold text-blue-700">{event.type}</code>
                  <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                </div>
                <pre className="overflow-x-auto p-4 text-sm leading-relaxed bg-gray-900 text-gray-100">
                  <code>{event.payload}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
