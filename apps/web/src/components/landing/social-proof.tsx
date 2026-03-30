const stats = [
  { value: "8,000+", label: "CVEs processed per scan", sublabel: "in under 90 seconds" },
  { value: "11", label: "Scanner formats supported", sublabel: "Nessus, SARIF, CycloneDX, and more" },
  { value: "6", label: "Compliance frameworks", sublabel: "NIST, SOC 2, CMMC, FedRAMP, ASVS, SSDF" },
];

const testimonials = [
  {
    quote: "We went from a 200-row spreadsheet to a prioritized remediation plan in under 2 minutes. The EPSS + KEV enrichment alone saved us a full sprint of manual triage.",
    name: "Jordan M.",
    role: "DevSecOps Lead",
    company: "Series B SaaS",
  },
  {
    quote: "We ran crp-scan in CI and caught a hardcoded secret that had been there for 6 months. The compliance mapping showed exactly which SOC 2 controls it violated. That's the report we handed to our auditor.",
    name: "Priya K.",
    role: "Security Engineer",
    company: "FinTech Startup",
  },
  {
    quote: "The POAM auto-generation cut our FedRAMP documentation prep from weeks to hours. It maps every finding to the right NIST control automatically.",
    name: "Marcus T.",
    role: "GRC Manager",
    company: "Gov Contractor",
  },
];

export function SocialProof() {
  return (
    <section className="relative border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative text-center">
              {/* Divider between stats on desktop */}
              {i > 0 && (
                <div className="absolute left-0 top-1/2 hidden h-12 w-px -translate-y-1/2 bg-gray-200 sm:block dark:bg-gray-800" />
              )}
              <p className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {stat.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                {stat.sublabel}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
