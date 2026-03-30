import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GitHub Action — CVERiskPilot Compliance Scan",
  description:
    "Add one-line compliance scanning to any GitHub workflow. The CVERiskPilot GitHub Action scans for vulnerabilities, maps to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF, and posts results as PR comments.",
  keywords: [
    "GitHub Action",
    "compliance scanning",
    "CI/CD security",
    "NIST 800-53",
    "SOC 2 compliance",
    "CMMC scanning",
    "FedRAMP",
    "SARIF",
    "PR comment",
    "cveriskpilot-scan",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/docs/github-action",
  },
  openGraph: {
    title: "GitHub Action — CVERiskPilot Compliance Scan",
    description:
      "One-line CI/CD compliance scanning. Map vulnerabilities to 6 compliance frameworks and get results as PR comments.",
    images: [{ url: "/graphics/og-pipeline.svg", width: 1200, height: 675, alt: "CVERiskPilot GitHub Action" }],
    siteName: "CVERiskPilot",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Action — CVERiskPilot Compliance Scan",
    description: "One-line compliance scanning in GitHub Actions — NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF.",
    images: ["/graphics/og-pipeline.svg"],
    creator: "@cveriskpilot",
  },
};

const actionInputs = [
  {
    name: "preset",
    description: "Framework preset to use for compliance mapping.",
    options: "federal, defense, enterprise, startup, devsecops, all",
    default: "all",
    required: false,
  },
  {
    name: "fail-on",
    description: "Severity threshold that causes the action to fail. Any finding at or above this level triggers a non-zero exit code.",
    options: "critical, high, medium, low",
    default: "critical",
    required: false,
  },
  {
    name: "format",
    description: "Additional output format written to disk alongside the default table output.",
    options: "json, sarif, markdown",
    default: "(none)",
    required: false,
  },
  {
    name: "scanners",
    description: "Limit which scanners run. Comma-separated list.",
    options: "deps, secrets, iac",
    default: "(all scanners)",
    required: false,
  },
  {
    name: "exclude",
    description: "Glob patterns to exclude from scanning. Comma-separated.",
    options: "Any valid glob pattern",
    default: "(none)",
    required: false,
  },
  {
    name: "api-key",
    description: "CVERiskPilot API key for uploading results to the platform dashboard. Use a GitHub secret.",
    options: "API key string",
    default: "(none)",
    required: false,
  },
  {
    name: "comment",
    description: "Whether to post scan results as a PR comment.",
    options: "true, false",
    default: "true",
    required: false,
  },
  {
    name: "github-token",
    description: "GitHub token used for posting PR comments. The default token works for most cases.",
    options: "GitHub token string",
    default: "github.token",
    required: false,
  },
];

const actionOutputs = [
  {
    name: "exit-code",
    description: "0 = pass, 1 = fail (findings met threshold), 2 = error (scan could not complete).",
  },
  {
    name: "total-findings",
    description: "Total number of findings discovered across all scanners.",
  },
  {
    name: "critical-count",
    description: "Number of findings with CRITICAL severity.",
  },
  {
    name: "high-count",
    description: "Number of findings with HIGH severity.",
  },
  {
    name: "controls-affected",
    description: "Number of unique compliance controls affected by the findings.",
  },
  {
    name: "comment-id",
    description: "GitHub comment ID if a PR comment was posted. Empty if comment was not posted.",
  },
];

function CodeBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-800">
      {title && (
        <div className="border-b border-gray-800 bg-gray-900/80 px-4 py-2">
          <span className="text-xs font-medium text-gray-400">{title}</span>
        </div>
      )}
      <div className="bg-gray-900 p-4">
        <pre className="overflow-x-auto text-sm leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

export default function GitHubActionPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/docs"
          className="transition-colors hover:text-gray-300"
        >
          Docs
        </Link>
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
        <span className="text-gray-400">GitHub Action</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        GitHub Action
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        <code className="rounded bg-gray-800 px-2 py-1 font-mono text-base text-primary-400">
          CVERiskPilot Compliance Scan
        </code>
      </p>
      <p className="mt-4 text-base leading-relaxed text-gray-400">
        Add one-line compliance scanning to any GitHub workflow. The action runs{" "}
        <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">
          @cveriskpilot/scan
        </code>{" "}
        against your codebase, maps every finding to compliance controls across NIST 800-53,
        SOC 2, CMMC, FedRAMP, ASVS, and SSDF, and optionally posts results as a PR comment.
        Composite action powered by Node.js 20. Zero external dependencies beyond the scanner itself.
      </p>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Quick Start</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Add this step to any workflow file. The action installs the scanner via{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">
            npx --yes @cveriskpilot/scan@latest
          </code>{" "}
          and runs it with your chosen preset.
        </p>

        <div className="mt-6">
          <CodeBlock title=".github/workflows/compliance.yml">
            <span className="text-gray-500"># Minimal workflow</span>{"\n"}
            <span className="text-primary-400">name</span><span className="text-gray-300">: Compliance Scan</span>{"\n"}
            <span className="text-primary-400">on</span><span className="text-gray-300">: [push, pull_request]</span>{"\n"}
            <span className="text-primary-400">jobs</span><span className="text-gray-300">:</span>{"\n"}
            {"  "}<span className="text-primary-400">scan</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">runs-on</span><span className="text-gray-300">: ubuntu-latest</span>{"\n"}
            {"    "}<span className="text-primary-400">steps</span><span className="text-gray-300">:</span>{"\n"}
            {"      "}<span className="text-gray-300">- uses: actions/checkout@v4</span>{"\n"}
            {"      "}<span className="text-gray-300">- uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
          </CodeBlock>
        </div>
      </section>

      {/* Full Workflow Example */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Full Workflow Example</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          A complete workflow using all available options, including SARIF upload to GitHub Code Scanning
          and platform dashboard upload.
        </p>

        <div className="mt-6">
          <CodeBlock title=".github/workflows/compliance-full.yml">
            <span className="text-primary-400">name</span><span className="text-gray-300">: Compliance Scan</span>{"\n"}
            <span className="text-primary-400">on</span><span className="text-gray-300">:</span>{"\n"}
            {"  "}<span className="text-primary-400">pull_request</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">branches</span><span className="text-gray-300">: [main]</span>{"\n"}
            {"  "}<span className="text-primary-400">push</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">branches</span><span className="text-gray-300">: [main]</span>{"\n"}
            {"\n"}
            <span className="text-primary-400">permissions</span><span className="text-gray-300">:</span>{"\n"}
            {"  "}<span className="text-primary-400">contents</span><span className="text-gray-300">: read</span>{"\n"}
            {"  "}<span className="text-primary-400">pull-requests</span><span className="text-gray-300">: write</span>{"\n"}
            {"  "}<span className="text-primary-400">security-events</span><span className="text-gray-300">: write</span>{"\n"}
            {"\n"}
            <span className="text-primary-400">jobs</span><span className="text-gray-300">:</span>{"\n"}
            {"  "}<span className="text-primary-400">compliance</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">runs-on</span><span className="text-gray-300">: ubuntu-latest</span>{"\n"}
            {"    "}<span className="text-primary-400">steps</span><span className="text-gray-300">:</span>{"\n"}
            {"      "}<span className="text-gray-300">- uses: actions/checkout@v4</span>{"\n"}
            {"\n"}
            {"      "}<span className="text-gray-300">- name: Run CVERiskPilot Compliance Scan</span>{"\n"}
            {"        "}<span className="text-gray-300">id: scan</span>{"\n"}
            {"        "}<span className="text-gray-300">uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"        "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"          "}<span className="text-primary-400">preset</span><span className="text-gray-300">: enterprise</span>{"\n"}
            {"          "}<span className="text-primary-400">fail-on</span><span className="text-gray-300">: high</span>{"\n"}
            {"          "}<span className="text-primary-400">format</span><span className="text-gray-300">: sarif</span>{"\n"}
            {"          "}<span className="text-primary-400">comment</span><span className="text-gray-300">: &apos;true&apos;</span>{"\n"}
            {"          "}<span className="text-primary-400">api-key</span><span className="text-gray-300">: $&#123;&#123; secrets.CRP_API_KEY &#125;&#125;</span>{"\n"}
            {"\n"}
            {"      "}<span className="text-gray-500"># Upload SARIF to GitHub Code Scanning</span>{"\n"}
            {"      "}<span className="text-gray-300">- name: Upload SARIF</span>{"\n"}
            {"        "}<span className="text-gray-300">if: always()</span>{"\n"}
            {"        "}<span className="text-gray-300">uses: github/codeql-action/upload-sarif@v3</span>{"\n"}
            {"        "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"          "}<span className="text-primary-400">sarif_file</span><span className="text-gray-300">: crp-scan-results.sarif</span>{"\n"}
          </CodeBlock>
        </div>
      </section>

      {/* Inputs Table */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Inputs</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          All inputs are optional. Configure them under the{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">with:</code>{" "}
          key in your workflow step.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Input</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Options</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Default</th>
              </tr>
            </thead>
            <tbody>
              {actionInputs.map((input) => (
                <tr key={input.name} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {input.name}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{input.description}</td>
                  <td className="px-4 py-3 text-gray-400">{input.options}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300">
                      {input.default}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Outputs Table */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Outputs</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Access outputs from subsequent steps using{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">
            steps.&lt;step-id&gt;.outputs.&lt;name&gt;
          </code>.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Output</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {actionOutputs.map((output) => (
                <tr key={output.name} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {output.name}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{output.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PR Comments */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">PR Comments</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          When{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-primary-400">comment: &apos;true&apos;</code>{" "}
          (the default), the action posts a detailed summary comment on the pull request. The comment includes:
        </p>
        <ul className="mt-4 space-y-2 text-gray-400">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <span>Severity summary with color-coded counts (critical, high, medium, low)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <span>Findings table with file paths, CWE identifiers, and matched compliance controls</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <span>Compliance impact breakdown showing which framework controls are affected</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <span>AI-powered triage verdicts with remediation suggestions</span>
          </li>
        </ul>
        <p className="mt-4 text-gray-400 leading-relaxed">
          The action uses a hidden HTML marker{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">
            &lt;!-- crp-scan-comment --&gt;
          </code>{" "}
          to identify its comments. On subsequent runs, it updates the existing comment instead of
          posting a new one, keeping your PR clean and free of duplicate reports.
        </p>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Internally, the action uses{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">actions/github-script@v7</code>{" "}
          to interact with the GitHub API for comment management.
        </p>
      </section>

      {/* Common Workflow Examples */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Common Workflow Examples</h2>

        <div className="mt-6 space-y-6">
          <CodeBlock title="Basic: Startup preset, fail on critical">
            <span className="text-gray-300">- uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">preset</span><span className="text-gray-300">: startup</span>{"\n"}
            {"    "}<span className="text-primary-400">fail-on</span><span className="text-gray-300">: critical</span>{"\n"}
          </CodeBlock>

          <CodeBlock title="Defense contractor: Defense preset, fail on high">
            <span className="text-gray-300">- name: CMMC Compliance Scan</span>{"\n"}
            {"  "}<span className="text-gray-300">uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">preset</span><span className="text-gray-300">: defense</span>{"\n"}
            {"    "}<span className="text-primary-400">fail-on</span><span className="text-gray-300">: high</span>{"\n"}
          </CodeBlock>

          <CodeBlock title="SARIF upload to GitHub Code Scanning">
            <span className="text-gray-300">- name: Compliance Scan</span>{"\n"}
            {"  "}<span className="text-gray-300">id: scan</span>{"\n"}
            {"  "}<span className="text-gray-300">uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">format</span><span className="text-gray-300">: sarif</span>{"\n"}
            {"\n"}
            <span className="text-gray-300">- name: Upload SARIF</span>{"\n"}
            {"  "}<span className="text-gray-300">if: always()</span>{"\n"}
            {"  "}<span className="text-gray-300">uses: github/codeql-action/upload-sarif@v3</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">sarif_file</span><span className="text-gray-300">: crp-scan-results.sarif</span>{"\n"}
          </CodeBlock>

          <CodeBlock title="Dependencies only scan">
            <span className="text-gray-300">- uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">scanners</span><span className="text-gray-300">: deps</span>{"\n"}
            {"    "}<span className="text-primary-400">fail-on</span><span className="text-gray-300">: high</span>{"\n"}
          </CodeBlock>

          <CodeBlock title="Custom exclusions">
            <span className="text-gray-300">- uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"  "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"    "}<span className="text-primary-400">preset</span><span className="text-gray-300">: enterprise</span>{"\n"}
            {"    "}<span className="text-primary-400">exclude</span><span className="text-gray-300">: &apos;**/test/**,**/fixtures/**,docs/**&apos;</span>{"\n"}
          </CodeBlock>
        </div>
      </section>

      {/* Using Outputs */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Using Outputs</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Reference outputs from the scan step in subsequent steps to build conditional workflows,
          send notifications, or gate deployments.
        </p>

        <div className="mt-6">
          <CodeBlock title="Using step outputs in subsequent steps">
            <span className="text-primary-400">steps</span><span className="text-gray-300">:</span>{"\n"}
            {"  "}<span className="text-gray-300">- uses: actions/checkout@v4</span>{"\n"}
            {"\n"}
            {"  "}<span className="text-gray-300">- name: Run Compliance Scan</span>{"\n"}
            {"    "}<span className="text-gray-300">id: scan</span>{"\n"}
            {"    "}<span className="text-gray-300">uses: devbrewster/cveriskpilot-scan@v1</span>{"\n"}
            {"    "}<span className="text-primary-400">with</span><span className="text-gray-300">:</span>{"\n"}
            {"      "}<span className="text-primary-400">preset</span><span className="text-gray-300">: enterprise</span>{"\n"}
            {"      "}<span className="text-primary-400">fail-on</span><span className="text-gray-300">: high</span>{"\n"}
            {"\n"}
            {"  "}<span className="text-gray-300">- name: Check Results</span>{"\n"}
            {"    "}<span className="text-gray-300">if: always()</span>{"\n"}
            {"    "}<span className="text-gray-300">run: |</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;Exit code: $&#123;&#123; steps.scan.outputs.exit-code &#125;&#125;&quot;</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;Total findings: $&#123;&#123; steps.scan.outputs.total-findings &#125;&#125;&quot;</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;Critical: $&#123;&#123; steps.scan.outputs.critical-count &#125;&#125;&quot;</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;High: $&#123;&#123; steps.scan.outputs.high-count &#125;&#125;&quot;</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;Controls affected: $&#123;&#123; steps.scan.outputs.controls-affected &#125;&#125;&quot;</span>{"\n"}
            {"\n"}
            {"  "}<span className="text-gray-300">- name: Block Deploy on Critical</span>{"\n"}
            {"    "}<span className="text-gray-300">if: steps.scan.outputs.critical-count != &apos;0&apos;</span>{"\n"}
            {"    "}<span className="text-gray-300">run: |</span>{"\n"}
            {"      "}<span className="text-gray-300">echo &quot;Blocking deployment: $&#123;&#123; steps.scan.outputs.critical-count &#125;&#125; critical findings&quot;</span>{"\n"}
            {"      "}<span className="text-gray-300">exit 1</span>{"\n"}
          </CodeBlock>
        </div>
      </section>

      {/* Action Internals */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">How It Works</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          The GitHub Action is a composite action that orchestrates three steps internally:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/10 text-sm font-bold text-primary-400">
              1
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Setup Node.js</h3>
            <p className="mt-2 text-sm text-gray-400">
              Uses{" "}
              <code className="font-mono text-xs text-gray-300">actions/setup-node@v4</code>{" "}
              to ensure Node.js 20 is available in the runner environment.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/10 text-sm font-bold text-primary-400">
              2
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Run Scanner</h3>
            <p className="mt-2 text-sm text-gray-400">
              Executes{" "}
              <code className="font-mono text-xs text-gray-300">npx --yes @cveriskpilot/scan@latest</code>{" "}
              with the configured preset, scanners, and output options.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600/10 text-sm font-bold text-primary-400">
              3
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Post Comment</h3>
            <p className="mt-2 text-sm text-gray-400">
              Uses{" "}
              <code className="font-mono text-xs text-gray-300">actions/github-script@v7</code>{" "}
              to post or update the PR comment with scan results.
            </p>
          </div>
        </div>
        <p className="mt-6 text-gray-400 leading-relaxed">
          The action outputs SARIF 2.1.0 format when{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">format: sarif</code>{" "}
          is specified, making it compatible with GitHub Code Scanning and other SARIF-compatible tools.
          Branding uses a shield icon with blue color in the GitHub Marketplace listing.
        </p>
      </section>

      {/* Next Steps */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Next Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/docs/cli"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">CLI Reference</h3>
            <p className="mt-1 text-sm text-gray-400">
              Full flag reference for the underlying crp-scan CLI.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
              View reference
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
          <Link
            href="/docs/pipeline"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">Pipeline Setup Guide</h3>
            <p className="mt-1 text-sm text-gray-400">
              Step-by-step guide for CI/CD integration beyond GitHub Actions.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
              Read guide
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
          <Link
            href="/signup"
            className="group rounded-xl border border-primary-800 bg-primary-600/10 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-600 hover:bg-primary-600/20"
          >
            <h3 className="text-sm font-semibold text-white">Sign Up Free</h3>
            <p className="mt-1 text-sm text-gray-400">
              Get your API key and upload scan results to the platform.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
              Create account
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </Link>
        </div>
      </section>

      {/* Back to docs */}
      <div className="mt-16 border-t border-gray-800 pt-8">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Documentation
        </Link>
      </div>
    </div>
  );
}
