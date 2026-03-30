'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// The scan findings — shared between terminal and dashboard
const FINDINGS = [
  { cve: "CVE-2026-1234", title: "Prototype Pollution in lodash", score: "9.8", epss: "0.97", severity: "CRITICAL", status: "KEV", statusColor: "red" as const },
  { cve: "CVE-2026-5678", title: "SQL Injection in pg-query", score: "8.5", epss: "0.82", severity: "HIGH", status: "Exploited", statusColor: "orange" as const },
  { cve: "CVE-2026-9012", title: "XSS in react-markdown", score: "7.2", epss: "0.45", severity: "HIGH", status: "Active", statusColor: "yellow" as const },
];

type AnimPhase = 'idle' | 'typing' | 'scanning' | 'results' | 'importing' | 'done';

export function Hero() {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [typedChars, setTypedChars] = useState(0);
  const [visibleFindings, setVisibleFindings] = useState(0);
  const [importedFindings, setImportedFindings] = useState(0);
  const hasStarted = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  const command = 'npx @cveriskpilot/scan --preset startup';

  // Start animation when section scrolls into view
  useEffect(() => {
    if (hasStarted.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          setTimeout(() => setPhase('typing'), 800);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Typing animation
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typedChars >= command.length) {
      setTimeout(() => setPhase('scanning'), 400);
      return;
    }
    const timer = setTimeout(() => setTypedChars((c) => c + 1), 35);
    return () => clearTimeout(timer);
  }, [phase, typedChars, command.length]);

  // Scanning → results
  useEffect(() => {
    if (phase !== 'scanning') return;
    const timer = setTimeout(() => setPhase('results'), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Results appear one by one
  useEffect(() => {
    if (phase !== 'results') return;
    if (visibleFindings >= FINDINGS.length) {
      setTimeout(() => setPhase('importing'), 600);
      return;
    }
    const timer = setTimeout(() => setVisibleFindings((v) => v + 1), 400);
    return () => clearTimeout(timer);
  }, [phase, visibleFindings]);

  // Dashboard imports findings one by one
  useEffect(() => {
    if (phase !== 'importing') return;
    if (importedFindings >= FINDINGS.length) {
      setTimeout(() => setPhase('done'), 300);
      return;
    }
    const timer = setTimeout(() => setImportedFindings((v) => v + 1), 500);
    return () => clearTimeout(timer);
  }, [phase, importedFindings]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-48 h-[500px] w-[500px] rounded-full bg-primary-600/8 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-800/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/5 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            Now processing 8,000+ CVEs per scan
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            Know Which{" "}
            <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              50 CVEs
            </span>{" "}
            Matter This Week
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
            CVERiskPilot unifies vulnerability signals from every scanner into a
            single, AI-powered remediation system. Prioritize by real exploit
            risk, not just CVSS.
          </p>

          {/* Copy-pasteable CLI command */}
          <CopyableCommand />

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 sm:w-auto"
            >
              Start Free
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/demo"
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 backdrop-blur-sm transition-all hover:border-primary-400/50 hover:bg-primary-500/20 hover:text-primary-200 sm:w-auto"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
              Live Demo
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-sm text-gray-500">
            No credit card required. Free plan available.
          </p>
        </div>

        {/* Side-by-side: Interactive CLI → Dashboard import */}
        <div className="mx-auto mt-16 grid max-w-6xl gap-4 lg:grid-cols-2">
          {/* CLI Terminal */}
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/70 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="rounded-xl bg-gray-900 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">Terminal</span>
              </div>
              <pre className="min-h-[220px] overflow-x-auto text-[11px] leading-relaxed sm:text-xs">
                <code className="text-gray-400">
                  {/* Command line with typing effect */}
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white">{command.slice(0, typedChars)}</span>
                  {phase === 'typing' && <span className="animate-pulse text-white">|</span>}
                  {phase === 'idle' && <span className="animate-pulse text-gray-600">|</span>}

                  {/* Scanning message */}
                  {(phase === 'scanning' || phase === 'results' || phase === 'importing' || phase === 'done') && (
                    <>
                      {"\n\n"}
                      <span className="text-gray-500">  Scanning dependencies, secrets, IaC...</span>
                    </>
                  )}

                  {/* Spinner during scan */}
                  {phase === 'scanning' && (
                    <>
                      {"\n"}
                      {"  "}
                      <span className="animate-pulse text-primary-400">...</span>
                    </>
                  )}

                  {/* Results */}
                  {(phase === 'results' || phase === 'importing' || phase === 'done') && (
                    <>
                      {"\n\n"}
                      <span className="text-white font-semibold">  SCAN RESULTS</span>
                      {"\n"}
                      <span className="text-gray-500">  {"─".repeat(40)}</span>
                      {"\n"}
                      {"  "}
                      <span className="text-red-400 font-bold">CRITICAL  1</span>
                      {"  "}
                      <span className="text-orange-400 font-bold">HIGH  2</span>
                      {"  "}
                      <span className="text-yellow-400 font-bold">MEDIUM  7</span>
                      {"\n"}
                      {FINDINGS.slice(0, visibleFindings).map((f, i) => (
                        <span key={i}>
                          {"\n"}
                          {"  "}
                          <span className={f.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}>
                            {f.severity.padEnd(9)}
                          </span>
                          <span className="text-white">{f.cve}</span>
                          <span className="text-gray-500">  {f.title}</span>
                        </span>
                      ))}
                    </>
                  )}

                  {/* Upload message */}
                  {(phase === 'importing' || phase === 'done') && (
                    <>
                      {"\n\n"}
                      {"  "}
                      <span className="text-green-400">Uploading to dashboard...</span>
                      {phase === 'done' && (
                        <span className="text-green-400"> done</span>
                      )}
                    </>
                  )}
                </code>
              </pre>
            </div>
          </div>

          {/* Dashboard */}
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/70 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="rounded-xl bg-gray-900 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">Dashboard</span>
              </div>

              {/* Stats row — animate counters */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DashboardStat label="Critical" value={importedFindings > 0 ? "1" : "—"} color="red" active={importedFindings > 0} />
                <DashboardStat label="High" value={importedFindings > 1 ? "2" : importedFindings > 0 ? "0" : "—"} color="orange" active={importedFindings > 1} />
                <DashboardStat label="EPSS > 0.5" value={importedFindings > 1 ? "2" : importedFindings > 0 ? "1" : "—"} color="yellow" active={importedFindings > 0} />
                <DashboardStat label="KEV Listed" value={importedFindings > 0 ? "1" : "—"} color="purple" active={importedFindings > 0} />
              </div>

              {/* Findings table — rows appear as they're imported */}
              <div className="mt-3 min-h-[140px] overflow-hidden rounded-lg border border-gray-800/80">
                <div className="grid grid-cols-4 gap-2 border-b border-gray-800 bg-gray-800/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>CVE ID</span>
                  <span>Risk</span>
                  <span>EPSS</span>
                  <span>Status</span>
                </div>
                {importedFindings === 0 && (
                  <div className="flex items-center justify-center py-8 text-xs text-gray-600">
                    {phase === 'idle' || phase === 'typing' || phase === 'scanning'
                      ? 'Waiting for scan results...'
                      : 'Importing...'}
                  </div>
                )}
                {FINDINGS.slice(0, importedFindings).map((f) => (
                  <MockRow key={f.cve} cve={f.cve} score={f.score} epss={f.epss} status={f.status} statusColor={f.statusColor} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="mx-auto mt-3 grid max-w-6xl gap-4 lg:grid-cols-2">
          <p className="text-center text-xs text-gray-600">
            Free — run in any project, no account needed
          </p>
          <p className="text-center text-xs text-gray-600">
            Paid — upload results, enrich with AI, track over time
          </p>
        </div>
      </div>
    </section>
  );
}

function CopyableCommand() {
  const [copied, setCopied] = useState(false);
  const command = 'npx @cveriskpilot/scan --preset startup';

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <button
        type="button"
        onClick={handleCopy}
        className="group flex w-full items-center justify-between rounded-xl border border-gray-700/60 bg-gray-900/80 px-5 py-3.5 font-mono text-sm text-gray-300 backdrop-blur-sm transition-all hover:border-primary-500/40 hover:bg-gray-900"
      >
        <span>
          <span className="text-green-400">$</span>{" "}
          <span className="text-white">{command}</span>
        </span>
        <span className="ml-3 shrink-0 rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-400 transition-colors group-hover:bg-primary-600/20 group-hover:text-primary-300">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Zero dependencies. Works offline. Scans deps, secrets, and IaC in seconds.
      </p>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  color,
  active,
}: {
  label: string;
  value: string;
  color: "red" | "orange" | "yellow" | "purple";
  active: boolean;
}) {
  const colorMap = {
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  const inactiveStyle = "bg-gray-800/30 text-gray-600 border-gray-800/40";
  return (
    <div className={`rounded-lg border p-2.5 transition-colors duration-500 ${active ? colorMap[color] : inactiveStyle}`}>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] opacity-80">{label}</p>
    </div>
  );
}

function MockRow({
  cve,
  score,
  epss,
  status,
  statusColor,
}: {
  cve: string;
  score: string;
  epss: string;
  status: string;
  statusColor: "red" | "orange" | "yellow";
}) {
  const statusColorMap = {
    red: "bg-red-500/10 text-red-400",
    orange: "bg-orange-500/10 text-orange-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
  };
  return (
    <div className="grid grid-cols-4 gap-2 border-b border-gray-800/40 px-3 py-2.5 text-xs text-gray-300 last:border-b-0 animate-[fadeIn_0.3s_ease-in] hover:bg-gray-800/20">
      <span className="font-mono text-[10px] text-gray-400">{cve}</span>
      <span className="font-semibold text-red-400 tabular-nums">{score}</span>
      <span className="text-yellow-400 tabular-nums">{epss}</span>
      <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColorMap[statusColor]}`}>
        {status}
      </span>
    </div>
  );
}
