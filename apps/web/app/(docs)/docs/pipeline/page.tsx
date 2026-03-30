import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pipeline Compliance Scanner — Setup Guide",
  description:
    "Set up compliance scanning in your CI/CD pipeline in under 5 minutes. Map vulnerabilities to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF automatically. Zero config, offline-first.",
  keywords: [
    "pipeline compliance scanner",
    "CI/CD security",
    "NIST 800-53",
    "SOC 2 compliance",
    "CMMC scanning",
    "FedRAMP",
    "SBOM",
    "secrets scanner",
    "IaC security",
    "GitHub Actions security",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/docs/pipeline",
  },
  openGraph: {
    title: "Pipeline Compliance Scanner — Setup Guide | CVERiskPilot",
    description:
      "Set up compliance scanning in your CI/CD pipeline in under 5 minutes. Map vulnerabilities to 6 compliance frameworks automatically.",
    images: [{ url: "/graphics/og-pipeline.svg", width: 1200, height: 675, alt: "Pipeline Compliance Scanner" }],
    siteName: "CVERiskPilot",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pipeline Compliance Scanner — Setup Guide",
    description: "Compliance scanning in CI/CD — NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF in one command.",
    images: ["/graphics/og-pipeline.svg"],
    creator: "@cveriskpilot",
  },
};

const cliOptions = [
  {
    flag: "--preset startup",
    description: "SBOM + secrets + IaC scan",
  },
  {
    flag: "--preset enterprise",
    description: "Full scan with all rules",
  },
  {
    flag: "--framework nist",
    description: "Filter to specific framework",
  },
  {
    flag: "--severity HIGH",
    description: "Minimum severity threshold",
  },
  {
    flag: "--format json",
    description: "Output format (json, table, sarif, markdown)",
  },
  {
    flag: "--exclude <glob>",
    description: "Exclude paths from scanning (repeatable)",
  },
  {
    flag: "--ci",
    description: "CI mode (non-interactive, exit code on failures)",
  },
];

const scanTargets = [
  {
    title: "Dependencies (SBOM)",
    description: "npm, yarn, pnpm lockfiles",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    ),
  },
  {
    title: "Secrets",
    description: "API keys, tokens, credentials in source",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
        />
      </svg>
    ),
  },
  {
    title: "Infrastructure as Code",
    description: "Terraform, CloudFormation, Docker",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
  },
];

const complianceMappings = [
  {
    finding: "SQL Injection",
    cwe: "CWE-89",
    nist: "SI-10",
    soc2: "CC6.1",
    cmmc: "SI.L2-3.14.2",
  },
  {
    finding: "XSS",
    cwe: "CWE-79",
    nist: "SI-10",
    soc2: "CC6.1",
    cmmc: "SI.L2-3.14.1",
  },
  {
    finding: "Hardcoded Secret",
    cwe: "CWE-798",
    nist: "IA-5",
    soc2: "CC6.1",
    cmmc: "IA.L2-3.5.10",
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

export default function PipelinePage() {
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
        <span className="text-gray-400">Pipeline</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Pipeline Compliance Scanner
      </h1>
      <p className="mt-2 text-lg text-gray-400">Setup Guide</p>
      <p className="mt-4 text-base leading-relaxed text-gray-400">
        Add compliance scanning to your CI/CD pipeline. Every pull request
        gets vulnerability findings mapped to NIST 800-53, SOC 2, CMMC,
        FedRAMP, ASVS, and SSDF controls automatically.
      </p>

      {/* Prerequisites */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">Prerequisites</h2>
        <ul className="mt-4 space-y-2 text-gray-300">
          <li className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span>
              Node.js 20+
            </span>
          </li>
          <li className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span>
              npm, yarn, or pnpm
            </span>
          </li>
          <li className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span>
              GitHub or GitLab repository
            </span>
          </li>
        </ul>
      </section>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">
          Quick Start
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Three steps. Under five minutes.
        </p>

        {/* Step 1 */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              1
            </span>
            <h3 className="text-lg font-semibold text-white">Install</h3>
          </div>
          <div className="mt-4 ml-11">
            <CodeBlock>
              <span className="text-primary-400">npm install -g</span>{" "}
              <span className="text-gray-200">@cveriskpilot/scan</span>
            </CodeBlock>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              2
            </span>
            <h3 className="text-lg font-semibold text-white">Scan</h3>
          </div>
          <div className="mt-4 ml-11">
            <CodeBlock>
              <span className="text-primary-400">npx crp-scan</span>{" "}
              <span className="text-gray-400">--preset</span>{" "}
              <span className="text-gray-200">startup</span>
            </CodeBlock>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              3
            </span>
            <h3 className="text-lg font-semibold text-white">Review</h3>
          </div>
          <div className="mt-4 ml-11">
            <p className="text-gray-300">
              Every finding is auto-triaged as{" "}
              <span className="font-medium text-emerald-400">TRUE_POSITIVE</span>,{" "}
              <span className="font-medium text-gray-500">FALSE_POSITIVE</span>, or{" "}
              <span className="font-medium text-amber-400">NEEDS_REVIEW</span>.
              Compliance results are mapped automatically to{" "}
              <span className="font-medium text-white">NIST 800-53</span>,{" "}
              <span className="font-medium text-white">CMMC</span>,{" "}
              <span className="font-medium text-white">SOC 2</span>,{" "}
              <span className="font-medium text-white">FedRAMP</span>,{" "}
              <span className="font-medium text-white">ASVS</span>, and{" "}
              <span className="font-medium text-white">SSDF</span>.
            </p>
          </div>
        </div>
      </section>

      {/* CLI Options */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">CLI Options</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  Flag
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {cliOptions.map((opt) => (
                <tr
                  key={opt.flag}
                  className="border-b border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {opt.flag}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {opt.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* GitHub Actions Integration */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">
          GitHub Actions Integration
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Add this workflow to your repository at{" "}
          <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300">
            .github/workflows/compliance.yml
          </code>
        </p>

        {/* Option 1: GitHub Action (recommended) */}
        <h3 className="mt-6 text-base font-semibold text-white">
          Option 1: GitHub Action (recommended)
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Scans your code, posts a compliance summary as a PR comment, and fails the check on severity threshold.
        </p>
        <div className="mt-3">
          <CodeBlock title=".github/workflows/compliance.yml">
            <span className="text-gray-400"># CVERiskPilot Compliance Scan with PR Comment</span>
            {"\n"}
            <span className="text-primary-400">name</span>
            <span className="text-gray-300">: Compliance Scan</span>
            {"\n"}
            <span className="text-primary-400">on</span>
            <span className="text-gray-300">: [pull_request]</span>
            {"\n"}
            <span className="text-primary-400">jobs</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"  "}
            <span className="text-primary-400">compliance</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"    "}
            <span className="text-primary-400">runs-on</span>
            <span className="text-gray-300">: ubuntu-latest</span>
            {"\n"}
            {"    "}
            <span className="text-primary-400">steps</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"      "}
            <span className="text-gray-300">- </span>
            <span className="text-primary-400">uses</span>
            <span className="text-gray-300">: actions/checkout@v4</span>
            {"\n"}
            {"      "}
            <span className="text-gray-300">- </span>
            <span className="text-primary-400">uses</span>
            <span className="text-gray-300">: devbrewster/cveriskpilot-scan/action@main</span>
            {"\n"}
            {"        "}
            <span className="text-primary-400">with</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"          "}
            <span className="text-primary-400">preset</span>
            <span className="text-gray-300">: &apos;startup&apos;</span>
            {"\n"}
            {"          "}
            <span className="text-primary-400">fail-on</span>
            <span className="text-gray-300">: &apos;critical&apos;</span>
            {"\n"}
            {"          "}
            <span className="text-primary-400">api-key</span>
            <span className="text-gray-300">
              : {"${{ secrets.CRP_API_KEY }}"}
            </span>
          </CodeBlock>
        </div>

        {/* Option 2: npx (manual) */}
        <h3 className="mt-8 text-base font-semibold text-white">
          Option 2: npx (manual setup)
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Run the CLI directly if you want full control over the workflow steps.
        </p>
        <div className="mt-3">
          <CodeBlock title=".github/workflows/compliance.yml">
            <span className="text-primary-400">name</span>
            <span className="text-gray-300">: Compliance Scan</span>
            {"\n"}
            <span className="text-primary-400">on</span>
            <span className="text-gray-300">: [pull_request]</span>
            {"\n"}
            <span className="text-primary-400">jobs</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"  "}
            <span className="text-primary-400">compliance</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"    "}
            <span className="text-primary-400">runs-on</span>
            <span className="text-gray-300">: ubuntu-latest</span>
            {"\n"}
            {"    "}
            <span className="text-primary-400">steps</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"      "}
            <span className="text-gray-300">- </span>
            <span className="text-primary-400">uses</span>
            <span className="text-gray-300">: actions/checkout@v4</span>
            {"\n"}
            {"      "}
            <span className="text-gray-300">- </span>
            <span className="text-primary-400">uses</span>
            <span className="text-gray-300">: actions/setup-node@v4</span>
            {"\n"}
            {"        "}
            <span className="text-primary-400">with</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"          "}
            <span className="text-primary-400">node-version</span>
            <span className="text-gray-300">: &apos;20&apos;</span>
            {"\n"}
            {"      "}
            <span className="text-gray-300">- </span>
            <span className="text-primary-400">run</span>
            <span className="text-gray-300">
              : npx @cveriskpilot/scan@latest --ci --preset startup
            </span>
            {"\n"}
            {"        "}
            <span className="text-primary-400">env</span>
            <span className="text-gray-300">:</span>
            {"\n"}
            {"          "}
            <span className="text-primary-400">CRP_API_KEY</span>
            <span className="text-gray-300">
              : {"${{ secrets.CRP_API_KEY }}"}
            </span>
          </CodeBlock>
        </div>
      </section>

      {/* What Gets Scanned */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">What Gets Scanned</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {scanTargets.map((target) => (
            <div
              key={target.title}
              className="rounded-xl border border-gray-800 bg-gray-900/50 p-5"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary-500/10 p-2.5 text-primary-400">
                {target.icon}
              </div>
              <h3 className="text-sm font-semibold text-white">
                {target.title}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {target.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Auto-Triage */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">Auto-Triage</h2>
        <p className="mt-2 text-sm text-gray-400">
          Every finding is automatically classified to cut through noise.
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                TRUE_POSITIVE
              </span>
              <span className="text-sm text-gray-300">Actionable finding that requires attention</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-400">
                FALSE_POSITIVE
              </span>
              <span className="text-sm text-gray-300">Auto-dismissed: test fixtures, .env.example, regex definitions, charset constants, sample data</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                NEEDS_REVIEW
              </span>
              <span className="text-sm text-gray-300">Requires human review: gitignored secrets, unknown package versions, test files with non-obvious values</span>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Mapping */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">
          Compliance Mapping
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Each finding maps through{" "}
          <span className="text-gray-300">CWE</span> to{" "}
          <span className="text-gray-300">NIST 800-53</span> to framework
          controls. One vulnerability, multiple compliance impacts surfaced
          automatically.
        </p>
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  Finding
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  CWE
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  NIST 800-53
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  SOC 2
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">
                  CMMC
                </th>
              </tr>
            </thead>
            <tbody>
              {complianceMappings.map((row) => (
                <tr
                  key={row.cwe}
                  className="border-b border-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-300">{row.finding}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-400">
                    {row.cwe}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">
                    {row.nist}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">
                    {row.soc2}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">
                    {row.cmmc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Next Steps */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">Next Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/demo/pipeline"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">
              Try the Live Demo
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              See the pipeline scanner in action with a sample repository.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
              Launch demo
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>
          <Link
            href="/#pricing"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">View Pricing</h3>
            <p className="mt-1 text-sm text-gray-400">
              Local scans are free and unlimited. No credit card
              required.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
              See plans
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>
          <Link
            href="/signup"
            className="group rounded-xl border border-primary-800 bg-primary-600/10 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-600 hover:bg-primary-600/20"
          >
            <h3 className="text-sm font-semibold text-white">Sign Up Free</h3>
            <p className="mt-1 text-sm text-gray-400">
              Get your API key and start scanning in minutes.
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
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
