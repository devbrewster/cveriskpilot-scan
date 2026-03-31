import type { Metadata } from 'next';
import { NavBar } from '@/components/landing/nav-bar';
import { Footer } from '@/components/landing/footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Developer Portal | CVERiskPilot',
  description:
    'API documentation, SDKs, webhooks, and integration guides for CVERiskPilot. Build vulnerability management workflows with our REST API.',
  alternates: { canonical: 'https://cveriskpilot.com/developers' },
  openGraph: {
    title: 'Developer Portal | CVERiskPilot',
    description: 'API docs, SDKs, and webhook integration guides.',
    url: 'https://cveriskpilot.com/developers',
    type: 'website',
  },
};

// ---------------------------------------------------------------------------
// API endpoint reference
// ---------------------------------------------------------------------------

const API_SECTIONS = [
  {
    title: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/api/auth/signup', description: 'Create a new account' },
      { method: 'POST', path: '/api/auth/login', description: 'Authenticate and get session' },
      { method: 'POST', path: '/api/auth/logout', description: 'End current session' },
    ],
  },
  {
    title: 'Scan Uploads',
    endpoints: [
      { method: 'POST', path: '/api/upload', description: 'Upload a scanner report (11 formats supported)' },
      { method: 'GET', path: '/api/upload/[id]', description: 'Get upload job status' },
    ],
  },
  {
    title: 'Cases',
    endpoints: [
      { method: 'GET', path: '/api/cases', description: 'List vulnerability cases with filters' },
      { method: 'POST', path: '/api/cases', description: 'Create a new case' },
      { method: 'PATCH', path: '/api/cases/[id]', description: 'Update case status, severity, or assignment' },
      { method: 'PUT', path: '/api/cases/[id]/assign', description: 'Assign case to a user' },
      { method: 'POST', path: '/api/cases/[id]/comments', description: 'Add a comment to a case' },
    ],
  },
  {
    title: 'Findings',
    endpoints: [
      { method: 'GET', path: '/api/findings', description: 'List raw findings across all scans' },
      { method: 'POST', path: '/api/findings/enrich', description: 'Enrich findings with NVD/EPSS/KEV data' },
    ],
  },
  {
    title: 'AI Intelligence',
    endpoints: [
      { method: 'POST', path: '/api/ai/triage', description: 'AI-powered vulnerability triage' },
      { method: 'POST', path: '/api/ai/remediation', description: 'Get AI remediation guidance' },
      { method: 'POST', path: '/api/ai/query', description: 'Natural language query over your data' },
      { method: 'POST', path: '/api/ai/executive-summary', description: 'Generate executive security summary' },
    ],
  },
  {
    title: 'Compliance',
    endpoints: [
      { method: 'GET', path: '/api/dashboard', description: 'Dashboard with severity counts, compliance scores' },
      { method: 'GET', path: '/api/dashboard/trends', description: 'Trend data for compliance and findings' },
      { method: 'GET', path: '/api/reports/generate', description: 'Generate compliance report (PDF/CSV)' },
    ],
  },
  {
    title: 'Audit Trail (Vault Protocol)',
    endpoints: [
      { method: 'POST', path: '/api/audit/verify', description: 'Verify cryptographic signature of an audit entry' },
      { method: 'GET', path: '/api/audit/root', description: 'Get current Merkle root hash' },
      { method: 'GET', path: '/api/audit/export-signed', description: 'Export signed audit package' },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-amber-100 text-amber-700',
  PUT: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const SNIPPETS = {
  curl: `# Upload a Nessus scan
curl -X POST https://cveriskpilot.com/api/upload \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "file=@scan-results.nessus" \\
  -F "format=nessus"

# List cases sorted by EPSS score
curl https://cveriskpilot.com/api/cases?sort=epss_desc \\
  -H "X-API-Key: YOUR_API_KEY"

# AI triage a case
curl -X POST https://cveriskpilot.com/api/ai/triage \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"caseId": "case_abc123"}'`,

  typescript: `import { CveRiskPilotClient } from '@cveriskpilot/sdk';

const client = new CveRiskPilotClient({
  apiKey: process.env.CVERISKPILOT_API_KEY!,
});

// Upload a scan
const upload = await client.uploads.create({
  file: fs.readFileSync('./scan.nessus'),
  format: 'nessus',
});

// List critical cases with high EPSS
const cases = await client.cases.list({
  severity: 'CRITICAL',
  minEpss: 0.7,
  kevOnly: true,
});

// AI triage
const triage = await client.ai.triage({
  caseId: cases.data[0].id,
});
console.log(triage.verdict, triage.confidence);`,

  python: `import requests

API_KEY = "your_api_key"
BASE = "https://cveriskpilot.com/api"
headers = {"X-API-Key": API_KEY}

# Upload a scan
with open("scan.nessus", "rb") as f:
    resp = requests.post(
        f"{BASE}/upload",
        headers=headers,
        files={"file": f},
        data={"format": "nessus"},
    )
    print(resp.json())

# List cases
cases = requests.get(
    f"{BASE}/cases",
    headers=headers,
    params={"severity": "CRITICAL"},
).json()

# AI query
answer = requests.post(
    f"{BASE}/ai/query",
    headers=headers,
    json={"question": "Show me all KEV-listed findings"},
).json()
print(answer["answer"])`,
};

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

const RATE_LIMITS = [
  { tier: 'Free', rpm: '60', ai: '50/mo', uploads: '10/mo' },
  { tier: 'Founders Beta', rpm: '200', ai: '250/mo', uploads: '100/mo' },
  { tier: 'Pro', rpm: '500', ai: '1,000/mo', uploads: '500/mo' },
  { tier: 'Enterprise', rpm: '2,000', ai: 'Unlimited', uploads: 'Unlimited' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DevelopersPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Developer Portal
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            Build vulnerability management workflows with the CVERiskPilot REST API.
            Upload scans, query findings, trigger AI triage, and export compliance
            reports — all programmatically.
          </p>
          <div className="mt-6 flex gap-4">
            <Link
              href="/signup?plan=founders_beta"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Get API Key
            </Link>
            <Link
              href="/developers/webhooks"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Webhook Events
            </Link>
          </div>
        </div>

        {/* Authentication Guide */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Authentication</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600 mb-4">
              All API requests require authentication. Three methods are supported:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-800 shrink-0">
                  X-API-Key
                </code>
                <p className="text-sm text-gray-600">
                  Header-based API key authentication. Generate keys in{' '}
                  <Link href="/settings?tab=api-keys" className="text-blue-600 hover:underline">
                    Settings → API Keys
                  </Link>.
                  Best for server-to-server integrations.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-800 shrink-0">
                  Bearer JWT
                </code>
                <p className="text-sm text-gray-600">
                  OAuth 2.0 bearer token. Obtained via the login endpoint.
                  Best for user-facing applications.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-800 shrink-0">
                  Cookie
                </code>
                <p className="text-sm text-gray-600">
                  Session cookie set by the login flow.
                  Used automatically by the web dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Code Snippets */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start</h2>
          <div className="space-y-6">
            {Object.entries(SNIPPETS).map(([lang, code]) => (
              <div key={lang} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {lang}
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-sm leading-relaxed bg-gray-900 text-gray-100">
                  <code>{code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Reference</h2>
          <div className="space-y-8">
            {API_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h3>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                  {section.endpoints.map((ep) => (
                    <div
                      key={`${ep.method}-${ep.path}`}
                      className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono text-gray-800">{ep.path}</code>
                      <span className="ml-auto text-sm text-gray-500 hidden sm:inline">
                        {ep.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate Limits</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    API Requests
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    AI Calls
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Uploads
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {RATE_LIMITS.map((rl) => (
                  <tr key={rl.tier}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{rl.tier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rl.rpm}/min</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rl.ai}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rl.uploads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Rate limit headers are included in every response: <code className="text-gray-700">X-RateLimit-Limit</code>,{' '}
            <code className="text-gray-700">X-RateLimit-Remaining</code>,{' '}
            <code className="text-gray-700">X-RateLimit-Reset</code>.
            When exceeded, you'll receive a <code className="text-gray-700">429</code> with a{' '}
            <code className="text-gray-700">Retry-After</code> header.
          </p>
        </section>

        {/* Scanner Formats */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Supported Scanner Formats</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[
              'Nessus (.nessus)',
              'Qualys (XML)',
              'OpenVAS (XML)',
              'SARIF (JSON)',
              'CycloneDX (JSON/XML)',
              'SPDX (JSON)',
              'OSV (JSON)',
              'CSAF (JSON)',
              'CSV',
              'XLSX',
              'Generic JSON',
            ].map((fmt) => (
              <div
                key={fmt}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
              >
                {fmt}
              </div>
            ))}
          </div>
        </section>

        {/* SDKs */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">SDKs &amp; Tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">TypeScript SDK</h3>
              <p className="mt-1 text-sm text-gray-500">Typed client for Node.js and browsers</p>
              <code className="mt-3 block rounded bg-gray-100 px-3 py-2 text-xs font-mono text-gray-800">
                npm install @cveriskpilot/sdk
              </code>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">CLI Scanner</h3>
              <p className="mt-1 text-sm text-gray-500">Scan repos for vulns, secrets, IaC issues</p>
              <code className="mt-3 block rounded bg-gray-100 px-3 py-2 text-xs font-mono text-gray-800">
                npx @cveriskpilot/scan --path .
              </code>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">Webhooks</h3>
              <p className="mt-1 text-sm text-gray-500">Real-time events via CloudEvents 1.0</p>
              <Link
                href="/developers/webhooks"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                View event catalog &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
