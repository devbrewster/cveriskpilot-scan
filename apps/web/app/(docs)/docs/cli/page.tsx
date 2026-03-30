import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CLI Reference — crp-scan",
  description:
    "Complete CLI reference for @cveriskpilot/scan. All flags, framework presets, output formats, and exit codes for the CVERiskPilot pipeline compliance scanner.",
  keywords: [
    "crp-scan CLI",
    "cveriskpilot-scan",
    "pipeline compliance scanner",
    "CLI reference",
    "NIST 800-53",
    "SOC 2 compliance",
    "CMMC scanning",
    "FedRAMP",
    "SBOM scanner",
    "secrets detection",
    "IaC security",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/docs/cli",
  },
  openGraph: {
    title: "CLI Reference — crp-scan | CVERiskPilot",
    description:
      "Complete CLI reference for @cveriskpilot/scan. All flags, framework presets, output formats, and exit codes.",
    images: [{ url: "/graphics/og-pipeline.svg", width: 1200, height: 675, alt: "CVERiskPilot CLI Reference" }],
    siteName: "CVERiskPilot",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLI Reference — crp-scan",
    description: "Complete CLI reference for @cveriskpilot/scan — all flags, presets, output formats, and exit codes.",
    images: ["/graphics/og-pipeline.svg"],
    creator: "@cveriskpilot",
  },
};

const scannerControlFlags = [
  { flag: "--deps-only", description: "Run dependency (SBOM) scan only. Skips secrets and IaC checks." },
  { flag: "--secrets-only", description: "Run secrets scan only. Detects API keys, tokens, and credentials using 30+ regex patterns and entropy detection." },
  { flag: "--iac-only", description: "Run Infrastructure as Code scan only. Checks Terraform, Dockerfile, Kubernetes YAML, and CloudFormation." },
];

const frameworkFlags = [
  { flag: "--frameworks <list>", description: "Comma-separated list of frameworks to map findings against. Options: nist, soc2, cmmc, fedramp, asvs, ssdf." },
  { flag: "--preset <name>", description: "Load a predefined set of frameworks. See framework presets table below." },
  { flag: "--list-frameworks", description: "Print all available frameworks and presets, then exit." },
];

const filteringFlags = [
  { flag: "--severity <level>", description: "Minimum severity threshold. Options: LOW, MEDIUM, HIGH, CRITICAL. Findings below this level are excluded from output." },
  { flag: "--exclude <glob>", description: "Exclude file paths matching the glob pattern. Repeatable (e.g., --exclude node_modules --exclude dist)." },
  { flag: "--exclude-cwe <list>", description: "Comma-separated list of CWE IDs to exclude from results (e.g., --exclude-cwe CWE-79,CWE-89)." },
];

const outputFlags = [
  { flag: "--format <type>", description: "Output format. Options: table (default), json, sarif, markdown." },
  { flag: "--fail-on <level>", description: "Exit with code 1 if any finding meets or exceeds this severity. Options: LOW, MEDIUM, HIGH, CRITICAL." },
  { flag: "--ci", description: "CI mode. Non-interactive output, no color, deterministic exit codes. Recommended for automated pipelines." },
  { flag: "--verbose", description: "Enable verbose output. Shows detailed scan progress, file-by-file results, and timing information." },
];

const uploadFlags = [
  { flag: "--api-key <key>", description: "CVERiskPilot API key for uploading results to the platform. Can also be set via CRP_API_KEY environment variable." },
  { flag: "--api-url <url>", description: "API endpoint URL. Defaults to https://api.cveriskpilot.com. Override for self-hosted or staging environments." },
  { flag: "--no-upload", description: "Skip uploading results to CVERiskPilot. Scan results are printed locally only." },
];

const frameworkPresets = [
  { name: "federal", frameworks: "NIST 800-53, FedRAMP, SSDF", description: "Federal agencies and contractors subject to FISMA and FedRAMP requirements." },
  { name: "defense", frameworks: "NIST 800-53, CMMC, SSDF", description: "Defense Industrial Base (DIB) contractors pursuing CMMC certification." },
  { name: "enterprise", frameworks: "NIST 800-53, SOC 2, ASVS, SSDF", description: "Enterprise organizations with SOC 2 audit requirements and secure development practices." },
  { name: "startup", frameworks: "SOC 2, ASVS", description: "Startups and SaaS companies building toward SOC 2 compliance." },
  { name: "devsecops", frameworks: "ASVS, SSDF", description: "Development teams focused on secure coding standards and software supply chain security." },
  { name: "all", frameworks: "NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF", description: "Map findings against all six supported frameworks." },
];

const outputFormats = [
  { format: "table", description: "Human-readable table with color-coded severity. Default format for terminal output." },
  { format: "json", description: "Structured JSON output with full finding details, compliance mappings, and metadata. Ideal for programmatic consumption." },
  { format: "sarif", description: "SARIF 2.1.0 format for integration with GitHub Code Scanning, Azure DevOps, and other SARIF-compatible tools." },
  { format: "markdown", description: "Markdown-formatted report suitable for PR comments, wiki pages, and documentation." },
];

const exitCodes = [
  { code: "0", label: "PASS", description: "Scan completed successfully. No findings met the --fail-on threshold (or no threshold was set)." },
  { code: "1", label: "FAIL", description: "Scan completed but one or more findings met or exceeded the --fail-on severity threshold." },
  { code: "2", label: "ERROR", description: "Scan could not complete due to an error (invalid arguments, missing files, runtime failure)." },
];

const complianceMappings = [
  { finding: "Known Vulnerable Dependency", cwe: "CWE-1395", nist: "SI-2, RA-5", soc2: "CC7.1", cmmc: "SI.L2-3.14.1" },
  { finding: "Hardcoded API Key", cwe: "CWE-798", nist: "IA-5", soc2: "CC6.1", cmmc: "IA.L2-3.5.10" },
  { finding: "SQL Injection", cwe: "CWE-89", nist: "SI-10", soc2: "CC6.1", cmmc: "SI.L2-3.14.2" },
  { finding: "Insecure Dockerfile (root user)", cwe: "CWE-250", nist: "AC-6, CM-7", soc2: "CC6.3", cmmc: "AC.L2-3.1.5" },
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

function FlagTable({
  title,
  flags,
}: {
  title: string;
  flags: { flag: string; description: string }[];
}) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80">
              <th className="px-4 py-3 text-left font-medium text-gray-400">Flag</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((opt) => (
              <tr key={opt.flag} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                    {opt.flag}
                  </code>
                </td>
                <td className="px-4 py-3 text-gray-300">{opt.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CliReferencePage() {
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
        <span className="text-gray-400">CLI Reference</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        CLI Reference
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        <code className="rounded bg-gray-800 px-2 py-1 font-mono text-base text-primary-400">crp-scan</code>{" "}
        / <code className="rounded bg-gray-800 px-2 py-1 font-mono text-base text-primary-400">cveriskpilot-scan</code>
      </p>
      <p className="mt-4 text-base leading-relaxed text-gray-400">
        Complete reference for the{" "}
        <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">@cveriskpilot/scan</code>{" "}
        CLI (v0.1.7). Scans your codebase for vulnerable dependencies, leaked secrets, and
        IaC misconfigurations, then maps every finding to compliance controls across NIST 800-53,
        SOC 2, CMMC, FedRAMP, ASVS, and SSDF. Zero external dependencies. Requires Node.js 20+.
      </p>

      {/* Installation */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Installation</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Install globally, run with npx, or clone from GitHub.
        </p>

        <div className="mt-6 space-y-4">
          <CodeBlock title="npm (global install)">
            <span className="text-primary-400">npm install -g</span>{" "}
            <span className="text-gray-200">@cveriskpilot/scan</span>
          </CodeBlock>

          <CodeBlock title="npx (no install required)">
            <span className="text-primary-400">npx</span>{" "}
            <span className="text-gray-200">@cveriskpilot/scan@latest</span>{" "}
            <span className="text-gray-400">--preset startup</span>
          </CodeBlock>

          <CodeBlock title="GitHub (clone and link)">
            <span className="text-primary-400">git clone</span>{" "}
            <span className="text-gray-200">https://github.com/devbrewster/cveriskpilot-scan.git</span>
            {"\n"}
            <span className="text-primary-400">cd</span>{" "}
            <span className="text-gray-200">cveriskpilot-scan</span>
            {"\n"}
            <span className="text-primary-400">npm link</span>
          </CodeBlock>
        </div>
      </section>

      {/* Quick Start */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Quick Start</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Common commands to get started quickly. Both{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-primary-400">crp-scan</code>{" "}
          and{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-primary-400">cveriskpilot-scan</code>{" "}
          are valid binary names.
        </p>

        <div className="mt-6 space-y-4">
          <CodeBlock title="Scan current directory with startup preset">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--preset</span>{" "}
            <span className="text-gray-200">startup</span>
          </CodeBlock>

          <CodeBlock title="Full scan with all six frameworks">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--preset</span>{" "}
            <span className="text-gray-200">all</span>{" "}
            <span className="text-gray-400">--verbose</span>
          </CodeBlock>

          <CodeBlock title="Dependencies only, fail on CRITICAL in CI">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--deps-only --ci --fail-on</span>{" "}
            <span className="text-gray-200">CRITICAL</span>
          </CodeBlock>

          <CodeBlock title="Secrets scan with JSON output">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--secrets-only --format</span>{" "}
            <span className="text-gray-200">json</span>
          </CodeBlock>

          <CodeBlock title="Defense preset, exclude test files, SARIF output">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--preset</span>{" "}
            <span className="text-gray-200">defense</span>{" "}
            <span className="text-gray-400">--exclude</span>{" "}
            <span className="text-gray-200">&quot;**/test/**&quot;</span>{" "}
            <span className="text-gray-400">--format</span>{" "}
            <span className="text-gray-200">sarif</span>
          </CodeBlock>

          <CodeBlock title="Upload results to CVERiskPilot platform">
            <span className="text-primary-400">crp-scan</span>{" "}
            <span className="text-gray-400">--preset</span>{" "}
            <span className="text-gray-200">enterprise</span>{" "}
            <span className="text-gray-400">--api-key</span>{" "}
            <span className="text-gray-200">$CRP_API_KEY</span>
          </CodeBlock>
        </div>
      </section>

      {/* CLI Flags */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">CLI Flags</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          All available flags organized by category.
        </p>

        <FlagTable title="Scanner Control" flags={scannerControlFlags} />
        <FlagTable title="Framework Selection" flags={frameworkFlags} />
        <FlagTable title="Filtering" flags={filteringFlags} />
        <FlagTable title="Output" flags={outputFlags} />
        <FlagTable title="Upload" flags={uploadFlags} />
      </section>

      {/* Framework Presets */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Framework Presets</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Presets bundle multiple frameworks into a single{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">--preset</code>{" "}
          flag. Use{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">--list-frameworks</code>{" "}
          to see all available options.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Preset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Frameworks</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Use Case</th>
              </tr>
            </thead>
            <tbody>
              {frameworkPresets.map((preset) => (
                <tr key={preset.name} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {preset.name}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{preset.frameworks}</td>
                  <td className="px-4 py-3 text-gray-400">{preset.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Output Formats */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Output Formats</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Set the output format with{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">--format &lt;type&gt;</code>.
          The default is{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-primary-400">table</code>.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Format</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {outputFormats.map((fmt) => (
                <tr key={fmt.format} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {fmt.format}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fmt.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Exit Codes */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Exit Codes</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Use exit codes to gate CI/CD pipelines. Combine with{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">--fail-on</code>{" "}
          and{" "}
          <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-gray-300">--ci</code>{" "}
          for deterministic behavior.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {exitCodes.map((ec) => (
                <tr key={ec.code} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-primary-400">
                      {ec.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ec.label === "PASS"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : ec.label === "FAIL"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {ec.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{ec.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How Compliance Mapping Works */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">How Compliance Mapping Works</h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Every finding follows a deterministic mapping chain from vulnerability to compliance control.
          The scanner maintains 80+ CWE entries that map to 135 total controls across all six frameworks.
        </p>

        {/* Chain visualization */}
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 font-medium text-gray-200">
            Finding
          </span>
          <svg className="h-4 w-4 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="rounded-lg border border-primary-800 bg-primary-600/10 px-4 py-2 font-medium text-primary-400">
            CWE
          </span>
          <svg className="h-4 w-4 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 font-medium text-gray-200">
            NIST 800-53
          </span>
          <svg className="h-4 w-4 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-2 font-medium text-gray-200">
            SOC 2 / CMMC / FedRAMP / ASVS / SSDF
          </span>
        </div>

        <p className="mt-6 text-gray-400 leading-relaxed">
          For example, a hardcoded API key (CWE-798) maps to NIST 800-53 control IA-5 (Authenticator Management),
          which then maps to SOC 2 CC6.1, CMMC IA.L2-3.5.10, and corresponding FedRAMP, ASVS, and SSDF controls.
          This chain is fully offline and deterministic — no network calls required.
        </p>

        {/* Example mappings table */}
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Finding</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">CWE</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">NIST 800-53</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">SOC 2</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">CMMC</th>
              </tr>
            </thead>
            <tbody>
              {complianceMappings.map((row) => (
                <tr key={row.cwe} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3 text-gray-300">{row.finding}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-400">{row.cwe}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.nist}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.soc2}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.cmmc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Supported scan targets detail */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h3 className="text-sm font-semibold text-white">Dependencies (SBOM)</h3>
            <p className="mt-2 text-sm text-gray-400">
              Supported lockfiles: package-lock.json, yarn.lock, requirements.txt, Cargo.lock, go.sum
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h3 className="text-sm font-semibold text-white">Secrets Detection</h3>
            <p className="mt-2 text-sm text-gray-400">
              30+ regex patterns plus entropy detection for API keys, tokens, passwords, and credentials
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h3 className="text-sm font-semibold text-white">Infrastructure as Code</h3>
            <p className="mt-2 text-sm text-gray-400">
              Terraform, Dockerfile, Kubernetes YAML, and CloudFormation template scanning
            </p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Next Steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/docs/pipeline"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">Pipeline Setup Guide</h3>
            <p className="mt-1 text-sm text-gray-400">
              Step-by-step guide to integrate crp-scan into your CI/CD pipeline.
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
            href="/demo/pipeline"
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
          >
            <h3 className="text-sm font-semibold text-white">GitHub Action</h3>
            <p className="mt-1 text-sm text-gray-400">
              See the scanner in action with a live demo and sample repository.
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
