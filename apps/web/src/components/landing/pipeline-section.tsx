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
    description: "CWE findings map to 150+ compliance controls across 6 frameworks",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    number: "03",
    label: "Verdict",
    description: "Pass/fail compliance gate on every PR with affected controls listed",
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
      "CWE findings chain through NIST 800-53 to CMMC, SOC 2, FedRAMP, ASVS, and SSDF. One scan, six frameworks.",
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
      "npx @cveriskpilot/scan for pre-push compliance checks. Know your compliance impact before code leaves your machine.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

const frameworks = [
  { name: "NIST 800-53", count: 42, label: "controls" },
  { name: "SOC 2", count: 18, label: "criteria" },
  { name: "CMMC L2", count: 56, label: "practices" },
  { name: "FedRAMP", count: 42, label: "controls" },
  { name: "OWASP ASVS", count: 38, label: "requirements" },
  { name: "NIST SSDF", count: 12, label: "practices" },
];

const comparisonRows = [
  { feature: "Finds vulnerabilities", crp: true, snyk: true, sonar: true, ghas: true },
  { feature: "Maps to NIST 800-53", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Maps to SOC 2 / CMMC / FedRAMP", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Auto-generates POAM", crp: true, snyk: false, sonar: false, ghas: false },
  { feature: "Compliance verdict in CI/CD", crp: true, snyk: false, sonar: "partial", ghas: false },
];

const prFindings = [
  { severity: "Critical", cwe: "CWE-89", nist: "SI-10", soc2: "CC6.1", status: "FAIL" },
  { severity: "High", cwe: "CWE-79", nist: "SI-10", soc2: "CC6.1", status: "FAIL" },
  { severity: "Medium", cwe: "CWE-327", nist: "SC-13", soc2: "CC6.7", status: "WARN" },
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                CR
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">CVERiskPilot Bot</span>
                <span className="ml-2 text-xs text-gray-400">commented just now</span>
              </div>
            </div>
            {/* Verdict */}
            <div className="px-5 py-4">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                FAIL — 3 compliance controls affected
              </div>
              {/* Mini findings table */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">Severity</th>
                      <th className="px-3 py-2 text-left font-medium">CWE</th>
                      <th className="px-3 py-2 text-left font-medium">NIST Control</th>
                      <th className="px-3 py-2 text-left font-medium">SOC 2</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prFindings.map((f) => (
                      <tr key={f.cwe} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              f.severity === "Critical"
                                ? "bg-red-100 text-red-700"
                                : f.severity === "High"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-700">{f.cwe}</td>
                        <td className="px-3 py-2 font-mono text-gray-700">{f.nist}</td>
                        <td className="px-3 py-2 font-mono text-gray-700">{f.soc2}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              f.status === "FAIL"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-right">
                <span className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  View full report &rarr;
                </span>
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
          <p className="mt-4 text-sm text-gray-500">
            Free tier includes 100 pipeline scans per day. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
