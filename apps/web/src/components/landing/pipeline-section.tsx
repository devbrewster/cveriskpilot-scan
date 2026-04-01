import Link from "next/link";

const steps = [
  {
    number: "01",
    label: "Scan",
    description: "Semgrep, Trivy, or Snyk runs in your pipeline",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    number: "02",
    label: "Map",
    description: "CWE findings map to 135 compliance controls across 6 frameworks",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    number: "03",
    label: "Triage",
    description: "Auto-classify findings as true positive, false positive, or needs review",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    number: "04",
    label: "POAM",
    description: "Critical findings auto-generate auditor-ready POAM entries",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
      </svg>
    ),
  },
];

const featureCards = [
  {
    title: "GitHub & GitLab Native",
    description:
      "One-line setup. PR comments with compliance impact on every push. Native integration with GitHub Actions and GitLab CI.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    title: "Multi-Framework Mapping",
    description:
      "CWE findings chain through NIST 800-53 to CMMC, SOC 2, FedRAMP, HIPAA, PCI-DSS, ISO 27001, GDPR, ASVS, and SSDF. One scan, ten frameworks.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: "Auto-POAM Generation",
    description:
      "Pipeline failures automatically become tracked remediation items with milestones, due dates, and audit trails.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
      </svg>
    ),
  },
  {
    title: "Developer CLI",
    description:
      "npx @cveriskpilot/scan with built-in auto-triage. Test fixtures, .env.example, and charset constants auto-dismissed. Real secrets flagged.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

const frameworks = [
  { name: "NIST 800-53", count: 45, label: "controls" },
  { name: "SOC 2", count: 7, label: "criteria" },
  { name: "CMMC L2", count: 33, label: "practices" },
  { name: "FedRAMP", count: 35, label: "controls" },
  { name: "OWASP ASVS", count: 7, label: "requirements" },
  { name: "NIST SSDF", count: 8, label: "practices" },
];

const comparisonRows = [
  { feature: "Finds vulnerabilities", crp: true, snyk: true, sonar: true, ghas: true },
  { feature: "Auto-triage (TP / FP / Review)", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Maps to NIST 800-53", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Maps to SOC 2 / CMMC / FedRAMP", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Auto-generates POAM", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Compliance verdict in CI/CD", crp: true, snyk: false, sonar: "partial", ghas: false },
  { feature: "AI fix guidance per finding", crp: true, snyk: "partial", sonar: false, ghas: "partial" },
];

const prFindings = [
  { severity: "Critical", cwe: "CWE-89", verdict: "TP", title: "SQL Injection in query builder", location: "src/db/query.ts:42" },
  { severity: "High", cwe: "CWE-79", verdict: "TP", title: "Reflected XSS in search handler", location: "src/api/search.ts:18" },
  { severity: "Medium", cwe: "CWE-327", verdict: "REVIEW", title: "Weak crypto algorithm (MD5)", location: "src/utils/hash.ts:7" },
];

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function renderCell(value: boolean | string) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <XIcon />;
  return <span className="text-xs text-gray-500">Quality gate only</span>;
}

export function PipelineSection() {
  return (
    <section
      id="pipeline"
      className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 sm:py-28"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-48 h-[500px] w-[500px] rounded-full bg-primary-600/8 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-800/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            Pipeline Compliance Scanner
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Your CI/CD pipeline now speaks{" "}
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              compliance
            </span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-400">
            Every pull request maps vulnerabilities to NIST 800-53, SOC 2, CMMC,
            FedRAMP, ASVS, and SSDF controls automatically. No spreadsheets. No
            quarterly mapping sprints.
          </p>
        </div>

        {/* How It Works — 4-Step Flow */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.label} className="relative flex flex-col items-center text-center">
                {/* Arrow connector (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute top-10 left-[calc(50%+3rem)] hidden w-[calc(100%-6rem)] lg:block">
                    <div className="h-px w-full bg-gradient-to-r from-primary-500/40 to-primary-500/10" />
                    <svg className="absolute -right-1.5 -top-1.5 h-3 w-3 text-primary-500/40" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M0 0l12 6-12 6z" />
                    </svg>
                  </div>
                )}
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10 text-primary-400">
                  {step.icon}
                </div>
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-primary-500">
                  Step {step.number}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.label}</h3>
                <p className="mt-1 max-w-[200px] text-sm leading-relaxed text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Compliance-Aware CI/CD Scanning
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray-400">
              The only pipeline scanner that maps code vulnerabilities to compliance
              frameworks. NIST 800-53, CMMC, SOC2, FedRAMP — automatically.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary-500/10 p-3 text-primary-400 transition-colors group-hover:bg-primary-500/15">
                  {card.icon}
                </div>
                <h4 className="text-base font-semibold text-white">{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Framework Badges */}
        <div className="mt-20">
          <h3 className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-gray-500">
            Supported Frameworks
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {frameworks.map((fw) => (
              <div
                key={fw.name}
                className="group flex flex-col items-center rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-5 text-center transition-all hover:border-primary-800 hover:bg-gray-900/80"
              >
                <span className="text-sm font-semibold text-white">{fw.name}</span>
                <span className="mt-1.5 text-2xl font-bold text-primary-400">{fw.count}</span>
                <span className="text-xs text-gray-500">{fw.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitive Comparison */}
        <div className="mt-20">
          <h3 className="mb-8 text-center text-lg font-semibold text-white">
            How we compare
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-primary-400">CVERiskPilot</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">Snyk</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">SonarQube</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">GitHub GHAS</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-3 text-gray-300">{row.feature}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{renderCell(row.crp)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{renderCell(row.snyk)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{renderCell(row.sonar)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">{renderCell(row.ghas)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            CVERiskPilot complements your existing scanners — it adds the compliance layer they&apos;re missing.
          </p>
        </div>

        {/* PR Comment Preview */}
        <div className="mt-20">
          <h3 className="mb-8 text-center text-lg font-semibold text-white">
            What your team sees on every pull request
          </h3>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-primary-500/10">
            {/* PR Comment Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white">
                <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"/></svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">github-actions[bot]</span>
                <span className="ml-1 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">bot</span>
                <span className="ml-2 text-xs text-gray-400">commented just now</span>
              </div>
            </div>
            {/* Comment body — matches real formatPrComment output */}
            <div className="px-5 py-4 text-sm text-gray-800">
              {/* Header */}
              <h3 className="text-base font-bold text-gray-900">
                <span className="mr-1">&#x274C;</span> CVERiskPilot Compliance Scan
              </h3>
              {/* Verdict banner */}
              <div className="mt-2 rounded border-l-4 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">
                <strong>FAIL</strong> &mdash; 3 finding(s) at or above <strong>CRITICAL</strong> severity.
              </div>
              {/* Severity badges */}
              <p className="mt-3 text-sm">
                <span className="text-red-600">&#x1F534;</span> <strong>1</strong> Critical &nbsp;
                <span className="text-orange-500">&#x1F7E0;</span> <strong>1</strong> High &nbsp;
                <span className="text-yellow-500">&#x1F7E1;</span> <strong>1</strong> Medium &nbsp;
                <span className="text-blue-500">&#x1F535;</span> <strong>0</strong> Low &nbsp;
                <span className="text-gray-400">&#x26AA;</span> <strong>0</strong> Info
              </p>
              {/* Triage */}
              <p className="mt-1 text-sm text-gray-600">
                <strong>Triage:</strong> 2 actionable &middot; 1 needs review &middot; 0 auto-dismissed
              </p>
              {/* Stats */}
              <p className="mt-1 text-xs text-gray-400">
                48 dependencies (npm) &middot; Scanners: sbom, secrets, iac &middot; Duration: 1240ms
              </p>
              {/* Findings table */}
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">Severity</th>
                      <th className="px-3 py-2 text-left font-medium">Verdict</th>
                      <th className="px-3 py-2 text-left font-medium">Finding</th>
                      <th className="px-3 py-2 text-left font-medium">CWE</th>
                      <th className="px-3 py-2 text-left font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prFindings.map((f) => (
                      <tr key={f.cwe} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            f.severity === "Critical" ? "text-red-700" : f.severity === "High" ? "text-orange-700" : "text-yellow-700"
                          }`}>
                            {f.severity === "Critical" ? "\u{1F534}" : f.severity === "High" ? "\u{1F7E0}" : "\u{1F7E1}"} {f.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[11px] font-semibold ${f.verdict === "TP" ? "text-red-600" : "text-yellow-600"}`}>
                            {f.verdict === "TP" ? "\u{1F534} TP" : "\u{1F7E1} Review"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-800">{f.title}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{f.cwe}</td>
                        <td className="px-3 py-2 font-mono text-gray-600 text-[10px]">{f.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400">
                  &#x1F6E1;&#xFE0F; Scanned by CVERiskPilot &middot; CLI &middot; Setup Guide
                </p>
                <Link href="/demo/pipeline" className="text-xs font-medium text-primary-600 hover:text-primary-500">
                  View full report &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Row */}
        <div className="mt-20 text-center">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs/pipeline"
              className="rounded-lg bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
            >
              Set Up in 5 Minutes
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-gray-700 px-8 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-gray-500 hover:text-white"
            >
              View Documentation
            </Link>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/50 px-4 py-2">
            <span className="font-mono text-xs text-gray-400">$</span>
            <code className="text-sm text-primary-400">npx @cveriskpilot/scan --preset startup</code>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            One command. 30 seconds. Compliance mapping across 6 frameworks. Free and unlimited.
          </p>
        </div>
      </div>
    </section>
  );
}
