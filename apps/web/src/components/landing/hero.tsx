import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-primary-950 to-indigo-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-48 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/5 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            Now processing 8,000+ CVEs per scan
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Know Which{" "}
            <span className="bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
              50 CVEs
            </span>{" "}
            Matter This Week
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 sm:text-xl">
            CVERiskPilot unifies vulnerability signals from every scanner into a
            single, AI-powered remediation system. Prioritize by real exploit
            risk, not just CVSS.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-primary-500/30 sm:w-auto"
            >
              Start Free
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-600 px-8 py-3.5 text-base font-semibold text-gray-200 transition-all hover:border-gray-400 hover:text-white sm:w-auto"
            >
              See Demo
            </a>
          </div>
        </div>

        {/* Mock Dashboard */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 p-1 shadow-2xl ring-1 ring-white/5 backdrop-blur-sm">
            <div className="rounded-lg bg-gray-900 p-4 sm:p-6">
              {/* Title bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-gray-500">CVERiskPilot Dashboard</span>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DashboardStat label="Critical" value="12" color="red" />
                <DashboardStat label="High" value="38" color="orange" />
                <DashboardStat label="EPSS > 0.5" value="7" color="yellow" />
                <DashboardStat label="KEV Listed" value="3" color="purple" />
              </div>
              {/* Mock table */}
              <div className="mt-4 overflow-hidden rounded-md border border-gray-800">
                <div className="grid grid-cols-4 gap-2 border-b border-gray-800 bg-gray-800/50 px-4 py-2 text-xs font-medium text-gray-400">
                  <span>CVE ID</span>
                  <span>Risk Score</span>
                  <span>EPSS</span>
                  <span>Status</span>
                </div>
                <MockRow cve="CVE-2026-1234" score="9.8" epss="0.97" status="KEV" />
                <MockRow cve="CVE-2026-5678" score="8.5" epss="0.82" status="Exploited" />
                <MockRow cve="CVE-2026-9012" score="7.2" epss="0.45" status="Active" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "red" | "orange" | "yellow" | "purple";
}) {
  const colorMap = {
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <div className={`rounded-md border p-3 ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

function MockRow({
  cve,
  score,
  epss,
  status,
}: {
  cve: string;
  score: string;
  epss: string;
  status: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 border-b border-gray-800/50 px-4 py-2.5 text-sm text-gray-300 last:border-b-0">
      <span className="font-mono text-xs">{cve}</span>
      <span className="font-semibold text-red-400">{score}</span>
      <span className="text-yellow-400">{epss}</span>
      <span className="inline-flex w-fit items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        {status}
      </span>
    </div>
  );
}
