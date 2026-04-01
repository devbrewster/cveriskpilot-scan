const FRAMEWORK_COLORS: Record<string, string> = {
  'NIST 800-53': 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  'SOC 2': 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  'CMMC L2': 'bg-green-500/10 text-green-400 ring-green-500/20',
  'FedRAMP': 'bg-red-500/10 text-red-400 ring-red-500/20',
  'HIPAA': 'bg-pink-500/10 text-pink-400 ring-pink-500/20',
  'PCI-DSS': 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  'ISO 27001': 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
};

const mockControls = [
  { framework: 'NIST 800-53', controlId: 'SI-2', title: 'Flaw Remediation' },
  { framework: 'SOC 2', controlId: 'CC6.8', title: 'Vulnerability Management' },
  { framework: 'CMMC L2', controlId: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
  { framework: 'FedRAMP', controlId: 'SI-2', title: 'Flaw Remediation' },
  { framework: 'HIPAA', controlId: '164.312(a)', title: 'Access Control' },
  { framework: 'PCI-DSS', controlId: 'Req-6.3', title: 'Vulnerabilities Addressed' },
  { framework: 'ISO 27001', controlId: 'A.8.8', title: 'Technical Vulnerability Mgmt' },
];

export function ComplianceImpact() {
  return (
    <section className="bg-white py-20 sm:py-28 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Copy */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              The feature no one else has
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              Compliance impact per finding
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Bottom-up tools say: <span className="font-medium text-gray-900 dark:text-white">&quot;CVE-2024-1234, CVSS 9.8, in lodash.&quot;</span>
            </p>
            <p className="mt-2 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Top-down platforms say: <span className="font-medium text-gray-900 dark:text-white">&quot;SOC 2 — 78% complete.&quot;</span>
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              CVERiskPilot says: <span className="font-semibold text-primary-600 dark:text-primary-400">&quot;CVE-2024-1234 affects 7 controls
              across SOC 2, CMMC, HIPAA, and 4 more frameworks. Remediating it moves your SOC 2 score from 78% to 82%.&quot;</span>
            </p>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
              Every finding shows exactly which compliance controls it threatens.
              Every remediation shows exactly how it improves your posture. The bridge between
              your scanner output and your auditor&apos;s checklist.
            </p>
          </div>

          {/* Right: Mock compliance impact card */}
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/70 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-white/5">
            <div className="rounded-xl bg-gray-900 p-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white">Compliance Impact</h3>
                  <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                    7 controls affected
                  </span>
                </div>
              </div>

              {/* Finding context */}
              <div className="mt-3 rounded-lg border border-gray-800 bg-gray-800/40 p-3">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-400">CRITICAL</span>
                  <span className="font-mono text-xs text-gray-300">CVE-2024-1234</span>
                  <span className="text-xs text-gray-500">Prototype Pollution in lodash</span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500">
                  <span>CVSS <span className="font-semibold text-red-400">9.8</span></span>
                  <span>EPSS <span className="font-semibold text-yellow-400">0.97</span></span>
                  <span>CWE-1321</span>
                </div>
              </div>

              {/* Framework badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mockControls.map((ctrl) => {
                  const color = FRAMEWORK_COLORS[ctrl.framework] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
                  return (
                    <span
                      key={ctrl.controlId}
                      className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${color}`}
                    >
                      {ctrl.framework}
                    </span>
                  );
                })}
              </div>

              {/* Control table */}
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-800/80">
                <div className="grid grid-cols-3 gap-2 border-b border-gray-800 bg-gray-800/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>Framework</span>
                  <span>Control</span>
                  <span>Title</span>
                </div>
                {mockControls.map((ctrl) => {
                  const color = FRAMEWORK_COLORS[ctrl.framework] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
                  return (
                    <div key={ctrl.controlId} className="grid grid-cols-3 gap-2 border-b border-gray-800/30 px-3 py-2 text-xs last:border-b-0">
                      <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${color}`}>
                        {ctrl.framework}
                      </span>
                      <span className="font-mono text-[11px] text-gray-300">{ctrl.controlId}</span>
                      <span className="text-gray-500">{ctrl.title}</span>
                    </div>
                  );
                })}
              </div>

              {/* Impact summary */}
              <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <p className="text-xs text-green-400">
                  <span className="font-semibold">Remediation impact:</span> Fixing this finding
                  improves compliance posture across 7 controls in 7 frameworks. SOC 2 score: 78% → 82%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
